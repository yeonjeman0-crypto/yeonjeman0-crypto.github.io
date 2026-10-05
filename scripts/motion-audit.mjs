import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

let TARGET = process.env.AUDIT_URL || 'http://127.0.0.1:4000/';
const SERVE_LOCAL = process.argv.includes('--serve');
const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function startStaticServer() {
  const rootPrefix = `${SITE_ROOT}${path.sep}`;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const cleanPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const candidate = path.resolve(SITE_ROOT, `.${cleanPath}`);

      if (candidate !== SITE_ROOT && !candidate.startsWith(rootPrefix)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      const info = await stat(candidate);
      const finalPath = info.isDirectory() ? path.join(candidate, 'index.html') : candidate;
      const body = await readFile(finalPath);
      res.writeHead(200, {
        'content-type': MIME_TYPES.get(path.extname(finalPath).toLowerCase()) || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

// Everything the reveal motion animates, as the visitor sees it.
const REVEALED = [
  '.kpi__card', '.mv', '.tl__row', '.org__box', '.fleet__cat', '.service', '.stats-dark__card', '.cert',
  '.why__item', '.careers-portal', '.esg-col', '.safety-col', '.safety-cycle__step', '.direction',
  '.section__head .eyebrow', '.section__head h2', '.section__head .lead',
  '.service__standards > *', '.owners__grid > *', '.about__quote-line', '.about__visual cite',
].join(', ');

const CONTROL_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 360, height: 800, touch: true },
];

// Content that is already on screen must not be hidden again when its reveal starts.
const REVEAL_CASES = [
  { observed: '#fleet .section__head', shown: '#fleet .section__head .eyebrow' },
  { observed: '#newbuilding .nb__media', shown: '#newbuilding .nb__media', cover: true },
  { observed: '#ownersGrid', shown: '#ownersGrid > *' },
  { observed: '#fleet .fleet__cat', shown: '#fleet .fleet__cat' },
  { observed: '#services .service', shown: '#services .service' },
  { observed: '#why .why__item', shown: '#why .why__item' },
];

let browser;

async function openPage({ width = 1440, height = 900, touch = false, reducedMotion = 'no-preference', lang, init } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion });
  if (lang) {
    await page.addInitScript(value => {
      try { localStorage.setItem('samjoo-lang', value); } catch {}
    }, lang);
  }
  if (init) await page.addInitScript(init);
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('is-ready'), null, { timeout: 8000 });
  return page;
}

const scrollToY = (page, top) => page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top);

async function scrollThrough(page) {
  const { height, step } = await page.evaluate(() => ({
    height: document.scrollingElement.scrollHeight,
    step: Math.round(window.innerHeight * 0.6),
  }));
  for (let y = 0; y <= height; y += step) {
    await scrollToY(page, y);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(2200);
}

function findHidden(page) {
  return page.evaluate(selector => {
    const effectiveOpacity = element => {
      let value = 1;
      for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        value *= Number(getComputedStyle(node).opacity);
      }
      return value;
    };
    const label = element => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    const hidden = [...document.querySelectorAll(selector)]
      .filter(element => element.getClientRects().length && effectiveOpacity(element) < 0.99)
      .map(element => `${label(element)} opacity ${effectiveOpacity(element).toFixed(2)}`);
    // The navy cover is the frame's ::after, drawn at scaleX(--image-cover).
    const covered = [...document.querySelectorAll('.motion-image')]
      .filter(frame => {
        const cover = getComputedStyle(frame, '::after');
        return frame.getClientRects().length && cover.display !== 'none' && new DOMMatrix(cover.transform).a > 0.01;
      })
      .map(frame => `${label(frame)} still covered`);
    return [...hidden, ...covered];
  }, REVEALED);
}

async function checkMotionLoaded() {
  const page = await openPage();
  const loaded = await page.evaluate(() => typeof window.CompanyMotion === 'object'
    && document.body.classList.contains('has-company-motion'));
  await page.close();
  return loaded ? [] : ['motion script did not start (window.CompanyMotion missing)'];
}

async function checkHeroControls() {
  const issues = [];
  for (const viewport of CONTROL_VIEWPORTS) {
    const page = await openPage(viewport);
    await page.waitForTimeout(1800);
    const overlaps = await page.evaluate(() => {
      const box = selector => {
        const element = document.querySelector(selector);
        if (!element || getComputedStyle(element).display === 'none') return null;
        return element.getBoundingClientRect();
      };
      const overlap = (a, b) => ({
        x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
        y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
      });
      const others = ['.hero__dock', '.hero__cta', '.hero__scroll'];
      const found = [];
      for (const control of ['.hero__scenes', '#motionToggle']) {
        const a = box(control);
        if (!a) continue;
        for (const other of others) {
          const b = box(other);
          if (!b) continue;
          const { x, y } = overlap(a, b);
          if (x > 0.5 && y > 0.5) found.push(`${control} overlaps ${other} by ${Math.round(y)}px`);
        }
      }
      return found;
    });
    overlaps.forEach(message => issues.push(`${viewport.width}x${viewport.height} | ${message}`));
    await page.close();
  }
  return issues;
}

async function checkSafetyCycle() {
  const issues = [];
  const page = await openPage();
  // Hit-test the decorative line so a later pointer-events change cannot hide a z-order regression.
  await page.addStyleTag({ content: '.safety-cycle__flow::after { pointer-events: auto !important; }' });
  await page.locator('.safety-cycle__flow').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3200);

  const struck = await page.evaluate(() => {
    const flow = document.querySelector('.safety-cycle__flow');
    const lineY = flow.getBoundingClientRect().top + 17.5;
    return [...flow.querySelectorAll('.safety-cycle__num')].filter(num => {
      const rect = num.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2 + 4, lineY);
      return hit && !num.contains(hit);
    }).map(num => num.textContent.trim());
  });
  if (struck.length) issues.push(`connector line is drawn over step number(s) ${struck.join(', ')}`);

  const step = page.locator('.safety-cycle__step').first();
  await step.hover();
  await page.waitForTimeout(500);
  const ratio = await step.locator('.safety-cycle__num').evaluate(num => {
    const channels = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = rgb => {
      const [r, g, b] = rgb.map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const style = getComputedStyle(num);
    const [light, dark] = [luminance(channels(style.color)), luminance(channels(style.backgroundColor))].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
  });
  if (ratio < 4.5) issues.push(`hovered step number contrast is ${ratio.toFixed(2)}:1 (needs 4.5:1)`);
  await page.close();
  return issues;
}

function sampleHeroIntro() {
  const targets = ['.hero__eyebrow', '.hero__title > span:first-child', '.hero__title > .accent', '.hero__lead', '.hero__cta', '.hero__dock > a'];
  window.__heroSamples = { targets, frames: [] };
  const frame = () => {
    const loading = document.getElementById('loading');
    if (document.body && loading) {
      const style = getComputedStyle(loading);
      window.__heroSamples.frames.push({
        curtain: style.display === 'none' ? 0 : Number(style.opacity),
        opacity: targets.map(selector => {
          const element = document.querySelector(selector);
          return element ? Number(getComputedStyle(element).opacity) : 1;
        }),
      });
    }
    if (performance.now() < 6000) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

async function checkHeroIntro() {
  const page = await openPage({ init: sampleHeroIntro });
  await page.waitForTimeout(3000);
  const { targets, frames } = await page.evaluate(() => window.__heroSamples);
  await page.close();
  const issues = [];
  // What the visitor sees is the element's opacity through the fading curtain. A flash is a fall
  // to under half of what was already seen; a normal fade-in only ever rises.
  targets.forEach((selector, i) => {
    let shown = 0;
    for (const frame of frames) {
      const seen = frame.opacity[i] * (1 - frame.curtain);
      if (shown > 0.15 && seen < shown * 0.5) {
        issues.push(`${selector} was shown (${shown.toFixed(2)}) as the loading screen lifted, then hidden again (${seen.toFixed(2)})`);
        break;
      }
      shown = Math.max(shown, seen);
    }
  });
  return issues;
}

async function checkRevealKeepsShownContent() {
  const issues = [];
  for (const { observed, shown, cover } of REVEAL_CASES) {
    const page = await openPage();
    await page.waitForTimeout(1200);
    const geometry = await page.evaluate(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height, viewport: window.innerHeight };
    }, observed);
    // Deepest scroll that stays just short of the reveal threshold (8% visible, 24px root margin).
    const before = geometry.top - geometry.viewport + 24 + Math.floor(geometry.height * 0.08) - 6;
    await scrollToY(page, before);
    await page.waitForTimeout(300);

    const state = await page.evaluate(({ selector, withCover }) => {
      const element = document.querySelector(selector);
      let opacity = 1;
      for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      const coverValue = withCover ? Number(getComputedStyle(element).getPropertyValue('--image-cover') || 0) : 0;
      const onScreen = element.getBoundingClientRect().top < window.innerHeight - 2;
      return { visible: onScreen && opacity > 0.5 && coverValue < 0.5 };
    }, { selector: shown, withCover: Boolean(cover) });

    await scrollToY(page, before + 60);
    const after = await page.evaluate(({ selector, withCover }) => new Promise(resolve => {
      const element = document.querySelector(selector);
      let minOpacity = 1;
      let maxCover = 0;
      const start = performance.now();
      const frame = () => {
        let opacity = 1;
        for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        minOpacity = Math.min(minOpacity, opacity);
        if (withCover) maxCover = Math.max(maxCover, Number(getComputedStyle(element).getPropertyValue('--image-cover') || 0));
        if (performance.now() - start < 600) requestAnimationFrame(frame);
        else resolve({ minOpacity, maxCover });
      };
      requestAnimationFrame(frame);
    }), { selector: shown, withCover: Boolean(cover) });

    if (state.visible && (after.minOpacity < 0.5 || after.maxCover >= 0.5)) {
      issues.push(`${shown} was already showing, then its reveal hid it again (opacity ${after.minOpacity.toFixed(2)}${cover ? `, cover ${after.maxCover.toFixed(2)}` : ''})`);
    }
    await page.close();
  }
  return issues;
}

async function checkNothingStaysHidden() {
  const issues = [];
  const runs = [
    { name: 'scroll', open: {} },
    { name: 'reduced motion', open: { reducedMotion: 'reduce' } },
    { name: 'motion paused', open: {}, before: page => page.click('#motionToggle') },
    {
      name: 'language switched mid-page',
      open: {},
      before: async page => {
        const y = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + window.scrollY);
        await scrollToY(page, y);
        await page.waitForTimeout(600);
        await page.click('#langToggle');
        await page.waitForTimeout(600);
      },
    },
  ];
  for (const run of runs) {
    const page = await openPage(run.open);
    await page.waitForTimeout(1200);
    if (run.before) await run.before(page);
    await scrollThrough(page);
    const hidden = await findHidden(page);
    hidden.slice(0, 6).forEach(message => issues.push(`${run.name} | ${message}`));
    if (hidden.length > 6) issues.push(`${run.name} | ...and ${hidden.length - 6} more`);
    await page.close();
  }

  const page = await openPage();
  await page.waitForTimeout(1500);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  const hidden = await findHidden(page);
  hidden.slice(0, 6).forEach(message => issues.push(`print | ${message}`));
  await page.close();
  return issues;
}

async function tickerMoves(page) {
  const y = await page.evaluate(() => document.querySelector('.ticker').getBoundingClientRect().top + window.scrollY - 300);
  await scrollToY(page, y);
  await page.waitForTimeout(400);
  const first = await page.evaluate(() => document.getElementById('vesselTicker').style.transform);
  await page.waitForTimeout(1500);
  const second = await page.evaluate(() => document.getElementById('vesselTicker').style.transform);
  return first !== second;
}

async function checkTicker() {
  const issues = [];
  // Decided 2026-07-11: the vessel ticker moves even when the OS asks for reduced motion.
  let page = await openPage({ reducedMotion: 'reduce' });
  await page.waitForTimeout(800);
  if (!await tickerMoves(page)) issues.push('ticker does not move under prefers-reduced-motion');
  await page.close();

  page = await openPage();
  await page.waitForTimeout(800);
  await page.click('#motionToggle');
  if (await tickerMoves(page)) issues.push('ticker keeps moving after the motion pause button is pressed');
  await page.close();
  return issues;
}

const CHECKS = [
  ['motion loaded', checkMotionLoaded],
  ['hero controls clear the dock', checkHeroControls],
  ['safety cycle numbers', checkSafetyCycle],
  ['hero intro', checkHeroIntro],
  ['reveal keeps shown content', checkRevealKeepsShownContent],
  ['nothing stays hidden', checkNothingStaysHidden],
  ['vessel ticker', checkTicker],
];
// --only=<text> runs the checks whose name contains <text>, e.g. --only=ticker
const ONLY = process.argv.find(arg => arg.startsWith('--only='))?.slice('--only='.length);
const SELECTED = ONLY ? CHECKS.filter(([name]) => name.includes(ONLY)) : CHECKS;

const localServer = SERVE_LOCAL ? await startStaticServer() : null;
if (localServer) TARGET = localServer.url;

const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHANNEL) {
  launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
} else if (process.platform === 'win32') {
  launchOptions.channel = 'msedge';
}

const allIssues = [];

try {
  browser = await chromium.launch(launchOptions);
  for (const [name, check] of SELECTED) {
    const issues = await check();
    issues.forEach(message => allIssues.push(`${name} | ${message}`));
  }
} finally {
  await browser?.close();
  if (localServer) {
    await new Promise(resolve => localServer.server.close(resolve));
  }
}

if (allIssues.length) {
  console.error('Motion audit failed:');
  for (const issue of allIssues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Motion audit passed (${SELECTED.map(([name]) => name).join(', ')}).`);
