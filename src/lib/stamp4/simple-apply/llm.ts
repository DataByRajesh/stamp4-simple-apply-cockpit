function extractOpenAIOutputText(data: unknown) {
  if (!data || typeof data !== 'object') return null
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> }

  if (typeof response.output_text === 'string') return response.output_text

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string') return content.text
    }
  }

  return null
}

interface StructuredLLMOptions {
  systemPrompt: string
  userPrompt: string
  schemaName: string
  schema: Record<string, unknown>
  // Ireland-market findings (2026-07): NVIDIA's free tier had 0/5 real successes on one day of
  // testing (repeated 503 ResourceExhausted rate-limits, plus one 87.8s timeout), and it has no
  // structured-output enforcement the way OpenAI's `strict: true` json_schema does - schema drift
  // is only caught by JSON.parse() here, not the API itself. Callers producing the actual
  // applicant-facing content (CVs, cover messages, interview prep) should set this so a flaky
  // free-tier call never gates something the user is about to submit to a real employer.
  // Lower-stakes callers (e.g. source-discovery) should leave this false to keep using NVIDIA
  // first for the cost savings.
  preferOpenAI?: boolean
}

async function callOpenAI(options: StructuredLLMOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const body = {
    model: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    input: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
  }

  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}: ${await response.text()}`)
      }

      const text = extractOpenAIOutputText(await response.json())
      if (!text) throw new Error('OpenAI response did not include output text')

      return text
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI request failed')
}

// NVIDIA's NIM endpoints are OpenAI Chat Completions-compatible, not Responses-API-compatible,
// and this model does not reliably support `response_format: json_object` (verified live -
// requests with it set consistently hung/timed out; the identical request without it returns
// clean JSON in well under a second). So the schema is spelled out in the prompt text instead of
// enforced by the API, and the result is validated by actually parsing it before returning -
// callStructuredLLM() falls back to OpenAI on any failure here, including a parse failure.
async function callNvidia(options: StructuredLLMOptions): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured')

  const body = {
    model: process.env.NVIDIA_MODEL ?? 'meta/llama-3.3-70b-instruct',
    messages: [
      { role: 'system', content: options.systemPrompt },
      {
        role: 'user',
        content: `${options.userPrompt}\n\nRespond with ONLY a single JSON object - no markdown code fences, no commentary before or after - matching exactly this JSON schema:\n${JSON.stringify(options.schema)}`,
      },
    ],
    max_tokens: 4096,
  }

  // Free-tier NVIDIA genuinely takes ~50s for a full-size generation (measured live: 690
  // completion tokens in 50.7s, ~14 tokens/sec) - it isn't hanging, it's just slow under load, so
  // the timeout has to be generous enough to let a real completion succeed rather than needlessly
  // falling back to OpenAI on every call. The route's own serverless function budget is 300s
  // (Hobby plan default with Fluid Compute), so this leaves ample room for the OpenAI fallback
  // path too if it's ever needed.
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65_000),
  })

  if (!response.ok) {
    throw new Error(`NVIDIA request failed with ${response.status}: ${await response.text()}`)
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('NVIDIA response had no message content')

  // Strip markdown fences in case the model added them despite the instruction not to.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')

  JSON.parse(cleaned) // throws if this isn't actually valid JSON - caller falls back to OpenAI
  return cleaned
}

// Tries the free NVIDIA model first (if configured), falling back to OpenAI on any failure -
// network error, non-2xx, missing content, or invalid JSON. Same external contract either way:
// callers JSON.parse() the returned string themselves and validate its shape, unchanged from
// when this only ever called OpenAI.
export async function callStructuredLLM(options: StructuredLLMOptions): Promise<string> {
  if (options.preferOpenAI) {
    try {
      return await callOpenAI(options)
    } catch (error) {
      if (!process.env.NVIDIA_API_KEY) throw error
      console.warn('OpenAI generation failed, falling back to NVIDIA:', error)
      return callNvidia(options)
    }
  }

  if (process.env.NVIDIA_API_KEY) {
    try {
      return await callNvidia(options)
    } catch (error) {
      console.warn('NVIDIA generation failed, falling back to OpenAI:', error)
    }
  }

  return callOpenAI(options)
}
