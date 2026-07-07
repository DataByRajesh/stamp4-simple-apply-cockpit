function extractOutputText(data: unknown) {
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

export async function callOpenAIJson(options: {
  systemPrompt: string
  userPrompt: string
  schemaName: string
  schema: Record<string, unknown>
}): Promise<string> {
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

      const text = extractOutputText(await response.json())
      if (!text) throw new Error('OpenAI response did not include output text')

      return text
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI request failed')
}
