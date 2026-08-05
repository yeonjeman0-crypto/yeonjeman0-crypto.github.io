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
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
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

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

const IMPORTANT_SELECTORS = [
  '.nav',
  '.nav__inner',
  '.nav__logo',
  '.nav__lang',
  '#burger',
  '.hero__inner',
  '.hero__content',
  '.hero__title',
  '.hero__lead',
  '.hero__cta',
  '.hero__dock',
  '.kpi__grid',
  '.about__grid',
  '.ceo',
  '.why',
  '.stats-dark__grid',
  '.fleet__summary',
  '.fleet__cats',
  '.fleet__table-wrap',
  '.services',
  '.esg__grid',
  '.safety__grid',
  '.org',
  '.org__row--teams',
  '.timeline',
  '.cert-grid',
  '.careers-portals',
  '.mailpick',
  '.mailpick__to',
  '.directions',
  '.direction',
  '.footer__grid',
];

function formatIssue(issue) {
  const parts = [issue.viewport, issue.type, issue.selector].filter(Boolean);
  return `${parts.join(' | ')} :: ${issue.message}`;
}

const localServer = SERVE_LOCAL ? await startStaticServer() : null;
if (localServer) TARGET = localServer.url;

const launchOptions = { headless: true };
if (process.env.PLAYWRIGHT_CHANNEL) {
  launchOptions.channel = process.env.PLAYWRIGHT_CHANNEL;
} else if (process.platform === 'win32') {
  launchOptions.channel = 'msedge';
}

let browser;
const allIssues = [];

try {
  browser = await chromium.launch(launchOptions);

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const pageIssues = [];
    const consoleIssues = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        consoleIssues.push(`error: ${message.text()}`);
      }
    });

    page.on('pageerror', error => {
      pageIssues.push({
        viewport: viewport.name,
        type: 'page-error',
        selector: '',
        message: error.message,
      });
    });

    await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const loading = document.querySelector('#loading');
      return !loading || loading.classList.contains('hidden') || loading.classList.contains('gone');
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const layoutIssues = await page.evaluate((selectors) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const doc = document.documentElement;
      const issues = [];

      const overflow = doc.scrollWidth - viewportWidth;
      if (overflow > 2) {
        issues.push({
          type: 'document-overflow',
          selector: 'documentElement',
          message: `document scrollWidth ${doc.scrollWidth}px exceeds viewport ${viewportWidth}px by ${overflow}px`,
        });
      }

      const fleetTableWrap = document.querySelector('.fleet__table-wrap');
      if (viewportWidth <= 480 && fleetTableWrap) {
        const tableOverflow = fleetTableWrap.scrollWidth - fleetTableWrap.clientWidth;
        if (tableOverflow > 2) {
          issues.push({
            type: 'mobile-table-overflow',
            selector: '.fleet__table-wrap',
            message: `fleet table requires ${Math.round(tableOverflow)}px of horizontal scrolling on a ${viewportWidth}px viewport`,
          });
        }
      }

      if (viewportWidth <= 480) {
        const minReadableWidth = viewportWidth - 48;
        const narrowTeamCards = Array.from(document.querySelectorAll('.org__box--team'))
          .filter(element => element.getBoundingClientRect().width < minReadableWidth);
        if (narrowTeamCards.length) {
          issues.push({
            type: 'mobile-org-card-too-narrow',
            selector: '.org__box--team',
            message: `${narrowTeamCards.length} organization team card(s) are narrower than ${Math.round(minReadableWidth)}px`,
          });
        }

        const narrowTimelineCards = Array.from(document.querySelectorAll('.timeline__content'))
          .filter(element => element.getBoundingClientRect().width < minReadableWidth);
        if (narrowTimelineCards.length) {
          issues.push({
            type: 'mobile-timeline-card-too-narrow',
            selector: '.timeline__content',
            message: `${narrowTimelineCards.length} timeline card(s) are narrower than ${Math.round(minReadableWidth)}px`,
          });
        }
      }

      const isAllowedInternalScroller = element => Boolean(element?.closest('.fleet__table-wrap'));

      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return;

          const label = elements.length > 1 ? `${selector}[${index}]` : selector;
          const rightOverflow = rect.right - viewportWidth;
          const leftOverflow = -rect.left;
          const tooWide = rect.width - viewportWidth;

          if (rightOverflow > 2 && !isAllowedInternalScroller(element)) {
            issues.push({
              type: 'element-right-overflow',
              selector: label,
              message: `right edge ${Math.round(rect.right)}px exceeds viewport ${viewportWidth}px by ${Math.round(rightOverflow)}px`,
            });
          }

          if (leftOverflow > 2 && !isAllowedInternalScroller(element)) {
            issues.push({
              type: 'element-left-overflow',
              selector: label,
              message: `left edge ${Math.round(rect.left)}px is outside viewport by ${Math.round(leftOverflow)}px`,
            });
          }

          if (tooWide > 2 && !isAllowedInternalScroller(element)) {
            issues.push({
              type: 'element-too-wide',
              selector: label,
              message: `width ${Math.round(rect.width)}px exceeds viewport ${viewportWidth}px by ${Math.round(tooWide)}px`,
            });
          }
        });
      }

      const burger = document.querySelector('#burger');
      burger?.click();
      const nav = document.querySelector('#nav');
      const navMenu = document.querySelector('.nav__menu');
      const navRect = navMenu?.getBoundingClientRect();

      if (!nav?.classList.contains('is-open')) {
        issues.push({
          type: 'mobile-menu',
          selector: '#nav',
          message: 'burger click did not open the mobile menu',
        });
      }

      if (navRect) {
        if (navRect.right - viewportWidth > 2 || navRect.left < -2) {
          issues.push({
            type: 'mobile-menu-overflow',
            selector: '.nav__menu',
            message: `menu rect ${Math.round(navRect.left)}..${Math.round(navRect.right)}px outside viewport ${viewportWidth}px`,
          });
        }
        if (navRect.height > viewportHeight - 16) {
          issues.push({
            type: 'mobile-menu-too-tall',
            selector: '.nav__menu',
            message: `menu height ${Math.round(navRect.height)}px exceeds usable viewport ${viewportHeight - 16}px`,
          });
        }
      }

      return issues.map(issue => ({
        viewport: `${viewportWidth}x${viewportHeight}`,
        ...issue,
      }));
    }, IMPORTANT_SELECTORS);

    allIssues.push(...pageIssues, ...layoutIssues);
    allIssues.push(...consoleIssues.map(message => ({
      viewport: viewport.name,
      type: 'console',
      selector: '',
      message,
    })));

    await page.close();
  }
} finally {
  await browser?.close();
  if (localServer) {
    await new Promise(resolve => localServer.server.close(resolve));
  }
}

if (allIssues.length) {
  console.error('Mobile layout audit failed:');
  for (const issue of allIssues) console.error(`- ${formatIssue(issue)}`);
  process.exit(1);
}

console.log(`Mobile layout audit passed (${VIEWPORTS.map(viewport => viewport.width).join('/')}px).`);
