const { test, expect } = require('@playwright/test');
const path = require('node:path');

const libraries = {
  three: path.resolve('node_modules/three/build/three.min.js'),
  gsap: path.resolve('node_modules/gsap/dist/gsap.min.js'),
  scroll: path.resolve('node_modules/gsap/dist/ScrollTrigger.min.js'),
  lenis: path.resolve('node_modules/lenis/dist/lenis.min.js')
};

// No external network is needed. One integration test uses the actual pinned
// animation libraries; the rest also verify the existing dependency-free fallback.
async function openSite(page, { full = false, saved = {}, setup, reduced = true } = {}) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.route('https://cdn.jsdelivr.net/**', async route => {
    if (!full) return route.fulfill({ body: '', contentType: 'application/javascript' });
    const url = route.request().url();
    const library = url.includes('three@') ? 'three' : url.includes('ScrollTrigger') ? 'scroll' : url.includes('gsap@') ? 'gsap' : 'lenis';
    return route.fulfill({ path: libraries[library], contentType: 'application/javascript' });
  });
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ body: '', contentType: 'text/css' }));
  if (Object.keys(saved).length) {
    await page.addInitScript(values => {
      Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
    }, saved);
  }
  if (setup) await page.addInitScript(setup);
  await page.goto('/');
  await page.waitForFunction(() => window.KWLAB && document.body.classList.contains('intro-ready'));
}

async function switchLanguage(page, language) {
  await page.locator(`[data-language="${language}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator(`[data-language="${language}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function assertDictionaryApplied(page) {
  const failures = await page.evaluate(() => {
    const { translate } = KWLAB.language;
    const failures = [];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.textContent !== translate(key)) failures.push(`${key}: ${el.textContent}`);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const expected = document.createElement('div');
      expected.innerHTML = translate(key);
      if (el.innerHTML !== expected.innerHTML) failures.push(key);
    });
    ['aria-label', 'placeholder', 'content', 'title'].forEach(attribute => {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(el => {
        const key = el.getAttribute(`data-i18n-${attribute}`);
        const values = JSON.parse(el.getAttribute('data-i18n-values') || '{}');
        if (el.getAttribute(attribute) !== translate(key, values)) failures.push(`${key} (${attribute})`);
      });
    });
    return failures;
  });
  expect(failures).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
  page.on('console', message => {
    if (message.text().includes('[KRAFTWERK] missing translation')) page.__errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(page.__errors).toEqual([]);
});

test('English and German cover every section, dynamic content, metadata and accessible labels', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero__title')).toHaveText('Buildthe nextyou.');
  await expect(page.locator('#scheduleRows .row')).toHaveCount(12);
  await expect(page.locator('.row__title').first()).toHaveText('Strength circuit');
  await expect(page.locator('#pArea option').nth(1)).toHaveText('Strength floor');
  await expect(page.locator('.cap__bar').first()).toHaveAttribute('aria-label', 'Occupancy 78 percent');
  await assertDictionaryApplied(page);
  const englishKeys = await page.evaluate(() => KWLAB.language.keys().sort());
  expect(englishKeys.length).toBeGreaterThan(290);
  const englishCopy = await page.locator('main').textContent() + await page.locator('footer').textContent();
  expect(englishCopy).not.toMatch(/Probetraining|Mitgliedschaft|Kursplan|Datenschutz|Kraftzirkel|Kopieren|Noch unsicher/);

  await switchLanguage(page, 'de');
  await expect(page).toHaveTitle('KRAFTWERK LAB — Kraft mit System / Deutschland');
  await expect(page.locator('.hero__title')).toHaveText('Werdedein neuesIch.');
  await expect(page.locator('.row__title').first()).toHaveText('Kraftzirkel');
  await expect(page.locator('#pArea option').nth(1)).toHaveText('Kraftbereich');
  await expect(page.locator('.cap__bar').first()).toHaveAttribute('aria-label', 'Auslastung 78 Prozent');
  await expect(page.locator('#pName')).toHaveAttribute('placeholder', 'Vor- und Nachname');
  await assertDictionaryApplied(page);
  expect(await page.evaluate(() => KWLAB.language.keys().sort())).toEqual(englishKeys);
  const germanCopy = await page.locator('main').textContent() + await page.locator('footer').textContent();
  expect(germanCopy).not.toMatch(/\b(Build|Strength|Floor|Recovery|Conditioning|Boxing|Membership|billed|month|Capacity|Class|Copy|Identity|Coaches|Trial|Privacy|Settings|Engineered)\b/);

  await switchLanguage(page, 'en');
  await assertDictionaryApplied(page);
  await expect(page.locator('#marqueeTrack .marquee__group')).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kw.language.v1')))).toBe('en');
});

test('switching preserves filters, annual pricing, form values and translated errors', async ({ page }) => {
  await openSite(page, { saved: { 'kw.consent.v1': { necessary: true } } });
  await page.locator('[data-filter="Strength"]').click();
  await page.locator('#billingAnnual').click();
  await page.locator('#probeSubmit').click();
  await expect(page.locator('#pNameErr')).toHaveText('Please enter your name (at least 2 characters).');
  await page.locator('#pName').fill('Alex Example');
  await page.locator('#pArea').selectOption('strength');
  await page.locator('#pMsg').fill('Keep this message unchanged.');
  await page.locator('#pConsent').check();

  await switchLanguage(page, 'de');
  await expect(page.locator('[data-filter="Strength"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#scheduleRows .row:not(.is-hidden)')).toHaveCount(4);
  await expect(page.locator('#filterCount')).toHaveText('4 / 12 Einheiten');
  await expect(page.locator('#billingAnnual')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('[data-price]').allTextContents()).toEqual(['33', '50', '76']);
  await expect(page.locator('[data-terms]').first()).toHaveText('33 € / Monat · 396 € jährlich');
  await expect(page.locator('#pName')).toHaveValue('Alex Example');
  await expect(page.locator('#pArea')).toHaveValue('strength');
  await expect(page.locator('#pMsg')).toHaveValue('Keep this message unchanged.');
  await expect(page.locator('#pConsent')).toBeChecked();
  await expect(page.locator('#pMailErr')).toHaveText('Bitte gib eine gültige E-Mail-Adresse ein.');
  await expect(page.locator('#formError')).toHaveText('Bitte prüfe die markierten Felder.');

  await page.locator('#pMail').fill('alex@example.com');
  await page.locator('#probeSubmit').click();
  await expect(page.locator('#probeSuccess')).toHaveClass(/is-on/);
  await expect(page.locator('.success__body')).toContainText('nicht versendet');
  await switchLanguage(page, 'en');
  await expect(page.locator('.success__body')).toContainText('not sent');
  await page.locator('#probeReset').click();
  await expect(page.locator('#pName')).toHaveValue('');
  await expect(page.locator('#formError')).toHaveText('');
  expect(await page.evaluate(() => [...document.querySelectorAll('#probeForm [aria-invalid="true"]')].length)).toBe(0);
});

test('all legal dialogs and saved cookie settings switch without stale content', async ({ page }) => {
  await openSite(page, { saved: { 'kw.consent.v1': { necessary: true, analytics: false, marketing: false } } });
  await page.locator('[data-cookie-open]').click();
  await expect(page.locator('#cookieBanner')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('#cookieSettings')).toHaveClass(/is-on/);
  await expect(page.locator('#ckNecessary')).toHaveAccessibleName('Essential');
  await switchLanguage(page, 'de');
  await expect(page.locator('#cookieTitle')).toHaveText('Nur das Nötigste — oder mehr.');
  await expect(page.locator('#ckNecessary')).toHaveAccessibleName('Notwendig');
  await page.locator('[data-cookie="save"]').click();
  await expect(page.locator('#cookieBanner')).toHaveClass(/is-hidden/);

  for (const key of ['imprint', 'privacy', 'terms']) {
    await page.locator(`[data-legal="${key}"]`).first().click();
    await expect(page.locator('#legalModal')).toHaveAttribute('aria-hidden', 'false');
    expect(await page.locator('#legalBody h3').count()).toBeGreaterThan(2);
    const german = await page.locator('#legalBody').textContent();
    // Programmatic locale changes also repaint an open dialog without reopening it.
    await page.evaluate(() => KWLAB.language.set('en'));
    await expect(page.locator('#legalTitle')).toHaveText(key === 'imprint' ? 'Legal notice' : key === 'privacy' ? 'Privacy' : 'Terms');
    expect(await page.locator('#legalBody').textContent()).not.toBe(german);
    expect(await page.locator('#legalBody').textContent()).not.toMatch(/Datenschutz|Mitgliedschaft|monatlich|Anschrift/);
    await page.locator('#legalClose').click();
    await switchLanguage(page, 'de');
  }
});

test('browser language, persisted choice and unavailable storage are handled', async ({ page, browser }) => {
  const context = await browser.newContext({ locale: 'de-DE' });
  const germanPage = await context.newPage();
  await openSite(germanPage);
  await expect(germanPage.locator('html')).toHaveAttribute('lang', 'de');
  await switchLanguage(germanPage, 'en');
  await germanPage.reload();
  await expect(germanPage.locator('html')).toHaveAttribute('lang', 'en');
  await context.close();

  await openSite(page, { setup: () => {
    Storage.prototype.getItem = function () { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'SecurityError'); };
  } });
  await switchLanguage(page, 'de');
  await expect(page.locator('#soundBtn')).toBeEnabled();
  expect(await page.evaluate(() => KWLAB.language.set('fr'))).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test('sound defaults on, plays real audio, spatializes clicks and survives muting/reloading', async ({ page }) => {
  await openSite(page);
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
  expect(['ready', 'running']).toContain(await page.locator('#soundBtn').getAttribute('data-sound-state'));
  await page.mouse.click(80, 250);
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().level)).toBeGreaterThan(0.00001);
  let left = await page.evaluate(() => KWLAB.sound.inspect());
  expect(left.ambientVoices).toBe(2);
  expect(left.schedulerRunning).toBe(true);
  expect(left.lastInteraction.kind).toBe('click');
  expect(left.lastInteraction.x).toBeLessThan(-0.7);
  await page.mouse.click(1300, 250);
  let right = await page.evaluate(() => KWLAB.sound.inspect());
  expect(right.lastInteraction.x).toBeGreaterThan(0.7);
  expect(right.interactionCount).toBeGreaterThan(left.interactionCount);
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().pulseCount)).toBeGreaterThan(0);

  await page.locator('[data-language="en"]').focus();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => KWLAB.sound.inspect().lastInteraction.kind)).toBe('keyboard');
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'muted');
  let muted = await page.evaluate(() => KWLAB.sound.inspect());
  expect(muted.activeVoices).toBe(0);
  expect(muted.ambientVoices).toBe(0);
  expect(muted.schedulerRunning).toBe(false);
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().level)).toBeLessThan(0.00001);
  await page.reload();
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => KWLAB.sound.inspect().contextState)).toBe('not-created');
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  await switchLanguage(page, 'de');
  await expect(page.locator('#soundLabel')).toHaveText('Ton an');
});

test('blocked autoplay stays honestly ready, then unlocks on the first real gesture', async ({ page }) => {
  await openSite(page, { setup: () => {
    const NativeContext = window.AudioContext;
    window.AudioContext = function (options) {
      const context = new NativeContext(options);
      context.suspend();
      const resume = context.resume.bind(context);
      context.resume = function () {
        return navigator.userActivation.hasBeenActive ? resume() : Promise.reject(new DOMException('Gesture required', 'NotAllowedError'));
      };
      return context;
    };
  } });
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'ready');
  await expect(page.locator('#soundHelp')).toHaveClass(/is-visible/);
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.click(500, 250);
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  await expect(page.locator('#soundHelp')).not.toHaveClass(/is-visible/);
  expect(await page.evaluate(() => KWLAB.sound.inspect().interactionCount)).toBe(1);
});

test('hover beats are throttled; rapid clicks have bounded polyphony; hidden pages suspend', async ({ page }) => {
  await openSite(page, { setup: () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => !!window.__testHidden });
  } });
  await page.mouse.click(500, 200);
  const rapid = await page.evaluate(async () => {
    const target = document.querySelector('[data-language="en"]');
    for (let i = 0; i < 100; i++) {
      target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', clientX: 500, clientY: 200 }));
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true, pointerType: 'mouse', clientX: i * 10, clientY: 200 }));
    }
    await Promise.resolve();
    return KWLAB.sound.inspect();
  });
  expect(rapid.activeVoices).toBeLessThanOrEqual(rapid.voiceLimit);
  expect(rapid.interactionCount).toBeGreaterThanOrEqual(101);
  expect(rapid.interactionCount).toBeLessThan(110); // not 100 unthrottled hover ticks as well
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().activeVoices)).toBeLessThanOrEqual(2);
  await page.evaluate(() => { window.__testHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().contextState)).toBe('suspended');
  expect(await page.evaluate(() => KWLAB.sound.inspect().schedulerRunning)).toBe(false);
  await page.evaluate(() => { window.__testHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  expect(await page.evaluate(() => KWLAB.sound.inspect().ambientVoices)).toBe(2);
});

test('unsupported audio never breaks the site or misreports playback', async ({ page }) => {
  await openSite(page, { setup: () => { window.AudioContext = undefined; window.webkitAudioContext = undefined; } });
  await expect(page.locator('#soundBtn')).toBeDisabled();
  await expect(page.locator('#soundLabel')).toHaveText('Audio unavailable');
  await switchLanguage(page, 'de');
  await expect(page.locator('#soundLabel')).toHaveText('Audio nicht verfügbar');
  await expect(page.locator('#scheduleRows .row')).toHaveCount(12);
});

test('rejected resume promises stay retryable and never cause unhandled errors', async ({ page }) => {
  await openSite(page, { setup: () => {
    const NativeContext = window.AudioContext;
    window.AudioContext = function (options) {
      const context = new NativeContext(options);
      context.suspend();
      context.resume = () => Promise.reject(new DOMException('Playback blocked', 'NotAllowedError'));
      return context;
    };
  } });
  await page.mouse.click(500, 200);
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'ready');
  expect(await page.evaluate(() => KWLAB.sound.inspect().ambientVoices)).toBe(0);
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'muted');
  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'ready');
  await switchLanguage(page, 'de');
  await expect(page.locator('#soundLabel')).toHaveText('Ton bereit');
});

test('mobile language controls, menu and touch beats work without horizontal overflow', async ({ page, browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-GB' });
  const mobile = await context.newPage();
  const errors = [];
  mobile.on('pageerror', error => errors.push(error.message));
  await openSite(mobile, { setup: () => {
    // Emulate a mobile browser that only permits audio on touch/pen release.
    let released = false;
    document.addEventListener('pointerup', () => { released = true; }, { capture: true });
    const NativeContext = window.AudioContext;
    window.AudioContext = function (options) {
      const context = new NativeContext(options);
      context.suspend();
      const resume = context.resume.bind(context);
      context.resume = () => released ? resume() : Promise.reject(new DOMException('Touch release required', 'NotAllowedError'));
      return context;
    };
  } });
  await expect(mobile.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'ready');
  await mobile.locator('[data-language="de"]').tap();
  await expect(mobile.locator('html')).toHaveAttribute('lang', 'de');
  await expect(mobile.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  expect(await mobile.evaluate(() => KWLAB.sound.inspect().lastInteraction.kind)).toBe('touch');
  await mobile.locator('#menuBtn').tap();
  await expect(mobile.locator('#menuBtn')).toHaveText('Schließen');
  await mobile.locator('[data-language="en"]').tap();
  await expect(mobile.locator('#menuBtn')).toHaveText('Close');
  await expect(mobile.locator('.menu__link').first()).toContainText('Identity');
  await mobile.locator('#menuBtn').tap();
  for (const width of [320, 390, 720]) {
    await mobile.setViewportSize({ width, height: 844 });
    for (const language of ['de', 'en']) {
      await mobile.locator(`[data-language="${language}"]`).tap();
      const layout = await mobile.evaluate(() => {
        const nav = document.querySelector('#menuBtn').getBoundingClientRect();
        const language = document.querySelector('#languageSwitch').getBoundingClientRect();
        const lines = [...document.querySelectorAll('.hero__title .line, h2:not(.sr-only), h3')]
          .filter(el => el.clientWidth > 0)
          .map(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, overlap: nav.right > language.left, lines };
      });
      expect(layout.overflow).toBe(false);
      expect(layout.overlap).toBe(false);
      expect(layout.lines.every(line => line.scroll <= line.width + 1)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('the real 3D intro localizes in place; skip and replay do not kill ongoing audio', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 960, height: 720 });
  await openSite(page, { full: true, reduced: false, saved: { 'kw.consent.v1': { necessary: true } } });
  expect(await page.evaluate(() => !!KWLAB.engine())).toBe(true);
  await page.evaluate(() => KWLAB.engine().seekIntro(5.6));
  await switchLanguage(page, 'de');
  await expect(page.locator('#setVal')).toContainText('SATZ');
  await expect(page.locator('#introPr')).toHaveText('NEUE BESTLEISTUNG');
  expect(await page.evaluate(() => KWLAB.engine().introTime())).toBeCloseTo(5.6, 1);
  await page.locator('#skipBtn').click();
  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
  await expect.poll(() => page.evaluate(() => KWLAB.sound.inspect().level)).toBeGreaterThan(0.00001);
  await page.locator('#replayBtn').click();
  await expect(page.locator('body')).toHaveClass(/intro-active/);
  await page.evaluate(() => KWLAB.engine().seekIntro(1));
  await expect(page.locator('#bpmState')).toHaveText('RUHEPULS');
  await page.locator('#skipBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('data-sound-state', 'running');
});
