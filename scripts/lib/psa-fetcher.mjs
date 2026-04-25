/**
 * PSA fetcher using Puppeteer + stealth to bypass Cloudflare Turnstile.
 *
 * Strategy:
 *   1. Launch headless Chromium with stealth plugin (hides automation flags)
 *   2. Navigate to PSA pop page → Cloudflare issues challenge
 *   3. Wait for cf_clearance cookie to be set (challenge solved)
 *   4. Execute fetch() FROM INSIDE the browser context with valid cookies
 *   5. Cloudflare sees a legit AJAX call from a "real" browser session
 *
 * Three retry levels with escalating evasion tactics.
 */

import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const PSA_BASE = 'https://www.psacard.com'
const PSA_LANDING = 'https://www.psacard.com/pop/tcg-cards/'

/**
 * Detect if Cloudflare challenge is still showing.
 */
async function isChallengePresent(page) {
  return await page.evaluate(() => {
    const title = document.title || ''
    const body = document.body?.innerText || ''
    return (
      title.includes('Just a moment') ||
      title.includes('Attention Required') ||
      body.includes('Enable JavaScript and cookies') ||
      body.includes('Verifying you are human')
    )
  })
}

/**
 * Wait for Cloudflare to issue cf_clearance cookie (challenge solved).
 */
async function waitForCloudflareClearance(page, timeoutMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const cookies = await page.cookies()
    const hasClearance = cookies.some(c => c.name === 'cf_clearance' && c.value)
    const challengeStillShown = await isChallengePresent(page)
    if (hasClearance && !challengeStillShown) return true
    await new Promise(r => setTimeout(r, 750))
  }
  return false
}

/**
 * Simulate basic human behavior to convince Turnstile we're real.
 */
async function simulateHumanBehavior(page) {
  // Random mouse movements
  for (let i = 0; i < 4; i++) {
    const x = 100 + Math.floor(Math.random() * 800)
    const y = 100 + Math.floor(Math.random() * 500)
    await page.mouse.move(x, y, { steps: 10 })
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
  }
  // Small scroll
  await page.evaluate(() => window.scrollBy(0, 200))
  await new Promise(r => setTimeout(r, 800))
}

/**
 * Main entry: fetch a PSA pop set via headless browser.
 *
 * @param {object} args
 * @param {number} args.categoryId
 * @param {number} args.headingId
 * @param {boolean} [args.verbose]
 * @returns {Promise<{ data: Array, recordsTotal: number, source: string }>}
 */
export async function fetchPsaSetWithBrowser({ categoryId, headingId, verbose = true }) {
  const log = (...a) => verbose && console.log('  [psa-fetcher]', ...a)

  log('Launching browser...')
  const browser = await puppeteerExtra.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--lang=en-US,en',
    ],
    defaultViewport: { width: 1366, height: 768 },
  })

  let result
  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    )
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    })

    // ─── Tier 1: Basic stealth nav ─────────────────────────────
    log('Navigating to PSA landing...')
    await page.goto(PSA_LANDING, { waitUntil: 'domcontentloaded', timeout: 30000 })

    let cleared = await waitForCloudflareClearance(page, 12000)
    if (!cleared) {
      // ─── Tier 2: Simulate human behavior ────────────────────
      log('⚠️  Initial challenge not cleared, simulating interaction...')
      await simulateHumanBehavior(page)
      cleared = await waitForCloudflareClearance(page, 10000)
    }

    if (!cleared) {
      // ─── Tier 3: Reload + extended wait ─────────────────────
      log('⚠️  Still blocked, reloading with extended wait...')
      await page.reload({ waitUntil: 'domcontentloaded' })
      await simulateHumanBehavior(page)
      cleared = await waitForCloudflareClearance(page, 15000)
    }

    if (!cleared) {
      const finalUrl = page.url()
      const challengeStillThere = await isChallengePresent(page)
      throw new Error(
        `Cloudflare challenge could not be cleared after 3 attempts. ` +
        `Final URL: ${finalUrl}. Challenge present: ${challengeStillThere}`
      )
    }

    log('✅ Cloudflare challenge cleared')

    // ─── Now POST from inside the browser (with valid cookies) ───
    log(`POST /Pop/GetSetItems (cat=${categoryId}, heading=${headingId})...`)
    result = await page.evaluate(async (cat, head) => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '500',
        'search[value]': '',
        headingID: String(head),
        categoryID: String(cat),
        isPSADNA: 'false',
      })
      const res = await fetch('/Pop/GetSetItems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
        },
        body: body.toString(),
        credentials: 'include',
      })
      const ok = res.ok
      const status = res.status
      const text = await res.text()
      let json = null
      try { json = JSON.parse(text) } catch (_) {}
      return { ok, status, json, textPreview: text.slice(0, 300) }
    }, categoryId, headingId)
  } finally {
    await browser.close()
  }

  if (!result.ok || !result.json) {
    throw new Error(
      `PSA POST failed: HTTP ${result.status}. Preview: ${result.textPreview}`
    )
  }

  return {
    data: result.json.data || [],
    recordsTotal: result.json.recordsTotal || 0,
    source: 'puppeteer-stealth',
  }
}
