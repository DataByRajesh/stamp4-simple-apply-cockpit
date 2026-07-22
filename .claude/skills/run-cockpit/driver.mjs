// REPL driver for stamp4-simple-apply-cockpit (Next.js/Playwright). Reads newline-delimited
// commands from stdin, one Chromium page shared across the whole session. Designed to be piped a
// heredoc for one-shot scripted runs, or run interactively (e.g. under tmux) for iterative
// debugging - same command set either way.
import { chromium } from 'playwright'
import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(SKILL_DIR, 'screenshots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

let browser = null
let page = null
const consoleMessages = []

async function ensurePage() {
  if (!browser) {
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleMessages.push(msg.text())
    })
    page.on('pageerror', (err) => consoleMessages.push('pageerror: ' + err.message))
  }
  return page
}

function requirePage() {
  if (!page) throw new Error('no page - run: nav <url> (or login)')
  return page
}

// chromium-cli-style locator: "text=Foo" does a text match, otherwise treated as a CSS selector.
function locatorFor(p, target) {
  if (target.startsWith('text=')) return p.locator(`text=${target.slice(5)}`)
  return p.locator(target)
}

const COMMANDS = {
  async nav(url) {
    const p = await ensurePage()
    const target = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
    await p.goto(target)
    console.log('nav ->', target)
  },

  // Project-specific: the app gates everything behind a password form at /stamp4/login. Pass a
  // password explicitly, or omit it to use STAMP4_ACCESS_SECRET from the environment (.env.local).
  async login(password) {
    const p = await ensurePage()
    const pw = password || process.env.STAMP4_ACCESS_SECRET
    if (!pw) throw new Error('no password given and STAMP4_ACCESS_SECRET is not set')
    await p.goto(`${BASE_URL}/stamp4/login`)
    await p.fill('input[name="password"]', pw)
    await p.click('button:has-text("Open cockpit")')
    await p.waitForURL('**/stamp4/simple-apply', { timeout: 15000 })
    console.log('login -> ok, redirected to', p.url())
  },

  async fill(rest) {
    const p = requirePage()
    const [selector, ...valueParts] = rest.split(' ')
    await p.fill(selector, valueParts.join(' '))
    console.log('fill', selector, '-> ok')
  },

  async click(target) {
    const p = requirePage()
    await locatorFor(p, target).first().click()
    console.log('click', target, '-> ok')
  },

  async press(key) {
    const p = requirePage()
    await p.keyboard.press(key)
    console.log('press', key, '-> ok')
  },

  // wait-for text=Foo | wait-for .some-selector [timeoutMs]
  async 'wait-for'(rest) {
    const p = requirePage()
    const [target, timeoutStr] = rest.split(' ')
    const timeout = Number(timeoutStr) || 15000
    await locatorFor(p, target).first().waitFor({ timeout })
    console.log('wait-for', target, '-> found')
  },

  async screenshot(name) {
    const p = requirePage()
    const file = path.join(SHOT_DIR, `${name || 'screenshot-' + Date.now()}.png`)
    await p.screenshot({ path: file, fullPage: true })
    console.log('screenshot ->', file)
  },

  async 'screenshot-element'(rest) {
    const p = requirePage()
    const [selector, name] = rest.split(' ')
    const file = path.join(SHOT_DIR, `${name || 'element-' + Date.now()}.png`)
    await locatorFor(p, selector).first().screenshot({ path: file })
    console.log('screenshot-element ->', file)
  },

  async text(selector) {
    const p = requirePage()
    const content = await locatorFor(p, selector).first().textContent()
    console.log('text:', JSON.stringify(content))
  },

  async count(selector) {
    const p = requirePage()
    console.log('count:', await locatorFor(p, selector).count())
  },

  async eval(expr) {
    const p = requirePage()
    try {
      console.log('eval ->', JSON.stringify(await p.evaluate(expr)))
    } catch (err) {
      console.log('eval ERROR:', err.message)
    }
  },

  // console --errors  (only subcommand supported - matches chromium-cli's own vocabulary)
  async console(sub) {
    if (sub === '--errors') {
      console.log(consoleMessages.length ? JSON.stringify(consoleMessages, null, 2) : '(no console errors captured)')
    } else {
      console.log('usage: console --errors')
    }
  },

  // Project-specific shortcut: the Cockpit's JD box + "Analyse" button (step 1 of the two-step
  // analyse/confirm flow - see Gotchas in SKILL.md). The REPL is line-based, so a multi-line JD
  // has to travel as one line with literal "\n" sequences, unescaped here before filling.
  async analyse(jdText) {
    const p = requirePage()
    await p.locator('textarea').first().fill(jdText.replace(/\\n/g, '\n'))
    await p.locator('button', { hasText: /Analyse/i }).first().click()
    await p.waitForSelector('button:has-text("Confirm & generate")', { timeout: 15000 })
    console.log('analyse -> parsed, on Confirm-before-scoring step')
  },

  // Project-specific shortcut: step 2 of the flow - triggers a real AI generation call. Can take
  // up to ~70s (NVIDIA is tried first and genuinely takes ~50-65s on its free tier under load,
  // not hanging - measured live; OpenAI is the fallback if that fails). Waits for the results
  // grid (Seniority fit card) rather than a fixed timeout.
  async 'confirm-generate'() {
    const p = requirePage()
    await p.locator('button', { hasText: /Confirm & generate/i }).first().click()
    await p.waitForSelector('text=Seniority fit', { timeout: 90000 })
    console.log('confirm-generate -> results grid rendered')
  },

  // resize <width> <height> - for checking responsive layout at specific breakpoints.
  async resize(rest) {
    const p = requirePage()
    const [widthStr, heightStr] = rest.split(' ')
    const width = Number(widthStr)
    const height = Number(heightStr)
    await p.setViewportSize({ width, height })
    console.log('resize ->', width, 'x', height)
  },

  async quit() {
    if (browser) await browser.close().catch(() => {})
    browser = null
    page = null
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  },
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'driver> ' })

// readline emits 'close' as soon as stdin hits EOF - for a piped heredoc that happens almost
// immediately, well before a slow command (e.g. "login", ~1-2s) has actually finished. rl.prompt()
// throws ERR_USE_AFTER_CLOSE once that's happened, which - uncaught - rejects the whole queue
// promise chain and silently kills every command still waiting behind it. Guard every prompt call
// on this flag instead of calling it unconditionally.
let closed = false
function safePrompt() {
  if (!closed) rl.prompt()
}

// readline's 'line' event does NOT wait for an async handler before firing the next one - when a
// whole heredoc arrives at once via a pipe, every line's handler starts almost simultaneously and
// races (e.g. "login" hasn't finished launching the browser before "text ..." already checks for
// a page). Every line is queued and run strictly one-at-a-time through this promise chain instead.
let queue = Promise.resolve()

rl.on('line', (line) => {
  queue = queue.then(async () => {
    const trimmed = line.trim()
    if (!trimmed) return safePrompt()
    const spaceIdx = trimmed.indexOf(' ')
    const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
    const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1)
    const fn = COMMANDS[cmd]
    if (!fn) {
      console.log('unknown command:', cmd, '- try: help')
      return safePrompt()
    }
    try {
      await fn(rest)
    } catch (err) {
      console.log('ERROR:', err.message)
    }
    safePrompt()
  })
})

// 'quit' is a plain command (just closes the browser) - it does NOT call rl.close() itself.
// Calling rl.close() from inside one of the queue's own currently-executing links, then having
// the 'close' handler await that same queue, is a self-referential deadlock (observed directly -
// only the first command ever ran). Cleanup instead relies entirely on stdin's natural EOF: a
// piped heredoc closes stdin once its last line is read, which fires 'close' below on its own. In
// a real terminal, Ctrl-D (EOF) does the same thing.
rl.on('close', async () => {
  closed = true
  // Wait for every already-queued command to finish before tearing down - stdin can close as soon
  // as the last line is read, which is often before the queued async commands (real
  // browser/network work) have actually completed.
  await queue.catch(() => {})
  await COMMANDS.quit()
  // No process.exit() here on purpose: on Windows, stdout to a redirected/piped file is
  // asynchronous, and exit() can truncate console.log output that hasn't flushed yet (this was
  // observed directly - screenshot/text output silently vanished until this was removed). Once
  // the browser is closed and readline is closed, nothing keeps the event loop alive, so the
  // process exits on its own with the correct buffered output intact.
})

console.log('stamp4-simple-apply-cockpit driver - "help" for commands, "nav /stamp4/login" to start')
rl.prompt()
