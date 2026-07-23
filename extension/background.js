// Runs in the page context via chrome.scripting.executeScript - must be fully self-contained
// (no references to anything outside this function body, since it's serialised and injected).
// Site-specific selectors are a fast path; the generic fallback (largest visible text block) is
// the resilient backbone, since site-specific selectors break the moment a job board redesigns -
// ApplyWave's own changelog is full of "fixed extraction on Indeed/Totaljobs after site update"
// entries. Stamp4's own parser (parser.ts) already extracts title/company/salary from free text,
// so this only needs to get *a* good text block, not perfectly clean structured fields.
function extractJobPostingFromPage() {
  function visibleText(element) {
    if (!element) return ''
    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return ''
    return element.innerText || ''
  }

  const SITE_SELECTORS = [
    '.jobs-description__content',
    '.jobs-box__html-content',
    '#jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '.job-description',
    '.jobDescriptionContent',
    'article',
  ]

  let bestText = ''
  for (const selector of SITE_SELECTORS) {
    const el = document.querySelector(selector)
    const text = visibleText(el).trim()
    if (text.length > bestText.length) bestText = text
  }

  // Generic fallback: the element (excluding nav/header/footer/script/style) with the most
  // visible text, since that's almost always the job description on a posting page.
  if (bestText.length < 200) {
    const candidates = document.querySelectorAll('body *:not(nav):not(header):not(footer):not(script):not(style)')
    for (const el of candidates) {
      if (el.children.length > 6) continue // skip large containers, prefer leaf-ish content blocks
      const text = visibleText(el).trim()
      if (text.length > bestText.length) bestText = text
    }
  }

  return {
    rawText: bestText || document.body.innerText.slice(0, 20000),
    sourceUrl: window.location.href,
    pageTitle: document.title,
  }
}

async function getConfig() {
  const { stamp4Domain, stamp4Secret } = await chrome.storage.local.get(['stamp4Domain', 'stamp4Secret'])
  return { stamp4Domain, stamp4Secret }
}

async function captureActiveTab() {
  const { stamp4Domain, stamp4Secret } = await getConfig()
  if (!stamp4Domain || !stamp4Secret) {
    return { ok: false, error: 'Set your Stamp4 domain and access secret in the extension options first.' }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return { ok: false, error: 'No active tab found.' }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractJobPostingFromPage,
  })

  if (!result?.rawText || result.rawText.trim().length < 50) {
    return { ok: false, error: 'Could not find enough job posting text on this page.' }
  }

  const captureUrl = `https://${stamp4Domain}/api/stamp4/simple-apply/capture`
  const response = await fetch(captureUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${stamp4Secret}`,
    },
    body: JSON.stringify({ rawText: result.rawText, sourceUrl: result.sourceUrl }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { ok: false, error: `Stamp4 rejected the capture (${response.status}): ${body.slice(0, 200)}` }
  }

  const { token } = await response.json()
  await chrome.tabs.create({ url: `https://${stamp4Domain}/stamp4/simple-apply?captureToken=${encodeURIComponent(token)}` })

  return { ok: true }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-to-stamp4',
    title: 'Send this job to Stamp4',
    contexts: ['page'],
  })
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'send-to-stamp4') captureActiveTab()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CAPTURE_ACTIVE_TAB') {
    captureActiveTab().then(sendResponse)
    return true // keep the message channel open for the async response
  }
  return undefined
})
