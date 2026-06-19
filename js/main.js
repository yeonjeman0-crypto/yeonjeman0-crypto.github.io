/**
 * SAMJOO SM CO., LTD. — Main script
 */

const state = {
    lang: 'ko',
    company: null,
    fleet: null,
    services: null,
    history: null,
    org: null,
    certs: null
};

// ============================================================
// Language toggle
// ============================================================
function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('samjoo-lang', lang);
    applyI18n(lang);
    document.querySelector('.lang-current').textContent = lang.toUpperCase();
    document.querySelector('.lang-other').textContent = lang === 'ko' ? 'EN' : 'KO';
    renderAllI18nDependent();
}
function toggleLang() {
    setLanguage(state.lang === 'ko' ? 'en' : 'ko');
}

// ============================================================
// Helpers
// ============================================================
function L(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[state.lang] || obj.ko || obj.en || '';
}

// Bind data-d attributes (deep path into state, e.g. company.tagline)
function bindStaticData() {
    document.querySelectorAll('[data-d]').forEach(el => {
        const path = el.getAttribute('data-d').split('.');
        let v = state;
        for (const p of path) v = v?.[p];
        if (Array.isArray(v)) v = v.join(' ');
        if (typeof v === 'object') v = L(v);
        if (!v) return;
        const str = String(v);
        if (/SAMJOO|DORIKO/.test(str) && typeof window._escAndProtectBrand === 'function') {
            el.innerHTML = window._escAndProtectBrand(str);
        } else {
            el.textContent = str;
        }
    });
}

// ============================================================
// Renderers
// ============================================================
function renderKPI() {
    if (!state.company?.kpi) return;
    const icons = ['fa-ship', 'fa-layer-group', 'fa-shield-alt', 'fa-certificate', 'fa-anchor'];
    const html = state.company.kpi.map((k, i) => `
        <div class="kpi__card">
            <div class="kpi__icon"><i class="fas ${icons[i] || 'fa-anchor'}"></i></div>
            <div class="kpi__num">${k.value}</div>
            <div class="kpi__label">${state.lang === 'ko' ? k.labelKo : k.labelEn}</div>
            <div class="kpi__desc">${state.lang === 'ko' ? k.desc : k.descEn}</div>
        </div>
    `).join('');
    document.getElementById('kpiGrid').innerHTML = html;
}

function renderCeoMessage() {
    if (!state.company?.ceo?.message) return;
    const paragraphs = state.company.ceo.message[state.lang] || state.company.ceo.message.ko;
    const target = document.getElementById('ceoMessage');
    target.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
    target.classList.add('expanded');
    syncCeoToggle(true);
}

function renderFleet() {
    if (!state.fleet) return;
    const s = state.fleet.summary;
    document.getElementById('fleetSummary').innerHTML = `
        <div class="fleet__sum-card">
            <div class="fleet__sum-icon"><i class="fas fa-anchor"></i></div>
            <div><strong>${s.total}</strong><span>${state.lang === 'ko' ? '총 관리 선박' : 'Total Vessels'}</span></div>
        </div>
        <div class="fleet__sum-card">
            <div class="fleet__sum-icon"><i class="fas fa-ship"></i></div>
            <div><strong>${s.bulk}</strong><span>${state.lang === 'ko' ? '벌크선' : 'Bulk Carriers'} · ${s.ratioBulk}%</span></div>
        </div>
        <div class="fleet__sum-card">
            <div class="fleet__sum-icon"><i class="fas fa-car"></i></div>
            <div><strong>${s.pctc}</strong><span>${state.lang === 'ko' ? '자동차운반선' : 'PCTCs'} · ${s.ratioPctc}%</span></div>
        </div>
    `;

    const operatorByCat = { bulk: 'SAMJOO SM', pctc: 'DORIKO' };
    document.getElementById('fleetCats').innerHTML = state.fleet.categories.map(c => {
        const op = operatorByCat[c.id];
        return `
        <div class="fleet__cat fleet__cat--${c.id}">
            <div class="fleet__cat-media">
                <img src="images/${c.image}" alt="${L(c.name)}" loading="lazy">
                ${op ? `<span class="fleet__cat-badge fleet__cat-badge--${c.id}">${op}</span>` : ''}
            </div>
            <div class="fleet__cat-body">
                <h3>${L(c.name)}</h3>
                <p>${L(c.description)}</p>
                <ul>${L(c.features).map(f => `<li>${f}</li>`).join('')}</ul>
            </div>
        </div>`;
    }).join('');

    const flagCode = { PANAMA: 'pa', KOREA: 'kr', LIBERIA: 'lr', SINGAPORE: 'sg', MARSHALL: 'mh', 'MARSHALL ISLANDS': 'mh', HONGKONG: 'hk', 'HONG KONG': 'hk' };
    const flagImg = (f) => {
        const code = flagCode[f.toUpperCase()];
        return code ? `<img src="https://flagcdn.com/24x18/${code}.png" srcset="https://flagcdn.com/48x36/${code}.png 2x" alt="${f}" class="flag-icon">` : '';
    };
    document.getElementById('vesselBody').innerHTML = state.fleet.vessels.map(v => `
        <article class="vcard vcard--${v.type.toLowerCase()}" tabindex="0">
            <div class="vcard__top">
                <span class="type-badge ${v.type}">${v.type}</span>
                <span class="flag-cell">${flagImg(v.flag)}<span>${v.flag}</span></span>
            </div>
            <h4 class="vcard__name">${v.name}</h4>
            <div class="vcard__owner">${v.owner}</div>
            <div class="vcard__specs">
                <div><span>DWT</span><strong>${v.dwt.toLocaleString()}</strong></div>
                <div><span>${state.lang === 'ko' ? '건조' : 'Built'}</span><strong>${v.built}</strong></div>
                <div><span>${state.lang === 'ko' ? '선급' : 'Class'}</span><strong>${v.class}</strong></div>
            </div>
        </article>
    `).join('');

    // Owners — continuous marquee (track duplicated for seamless loop)
    const ownersEl = document.getElementById('ownersGrid');
    if (ownersEl && state.fleet.owners) {
        const chip = o => `<div class="omarquee__item"><i class="fas fa-ship"></i><span>${o}</span></div>`;
        const row = state.fleet.owners.concat(state.fleet.owners).map(chip).join('');
        ownersEl.innerHTML = `<div class="omarquee"><div class="omarquee__track">${row}</div></div>`;
    }
}

function renderServices() {
    if (!state.services) return;
    document.getElementById('servicesGrid').innerHTML = state.services.map((s, i) => `
        <div class="service">
            <div class="service__media">
                <span class="service__num">${String(i + 1).padStart(2, '0')}</span>
                <div class="service__img" style="background-image: url('images/${s.image}')"></div>
            </div>
            <div class="service__body">
                <span class="service__tag">Service ${String(i + 1).padStart(2, '0')}</span>
                <h3>${L(s.name)}</h3>
                <p>${L(s.description)}</p>
                <ul>${L(s.features).map(f => `<li>${f}</li>`).join('')}</ul>
            </div>
        </div>
    `).join('');
}

function renderOrg() {
    if (!state.org) return;
    const root = document.getElementById('orgChart');
    const divLabelEn = { smd: 'Ship Management Division', bsd: 'Business Support Department' };
    const teamWord = state.lang === 'ko' ? '팀' : 'teams';

    const divLis = state.org.divisions.map(d => {
        const teams = state.org.teams.filter(t => t.division === d.id);
        const teamLis = teams.map(t => `
                        <li>
                            <div class="tnode tnode--team">
                                <span class="tnode__code">${t.id}</span>
                                <span class="tnode__name">${L(t.name)}</span>
                                <span class="tnode__loc"><i class="fas fa-location-dot"></i>${L(t.location)}</span>
                            </div>
                        </li>`).join('');
        return `
                <li>
                    <div class="tnode tnode--div tnode--div-${d.id}">
                        <span class="tnode__tag">${divLabelEn[d.id]}</span>
                        <span class="tnode__name">${L(d.name)}</span>
                        <span class="tnode__meta">${teams.length} ${teamWord}</span>
                    </div>
                    <ul>${teamLis}</ul>
                </li>`;
    }).join('');

    root.innerHTML = `
        <div class="orgtree">
            <ul>
                <li>
                    <div class="tnode tnode--ceo">
                        <span class="tnode__tag">Chief Executive Officer</span>
                        <span class="tnode__name">${L(state.org.ceo.title)}</span>
                    </div>
                    <ul>${divLis}</ul>
                </li>
            </ul>
        </div>
    `;
}

function renderHistory() {
    if (!state.history) return;
    // 브랜드명 사이 line-break 방지 (SAMJOO MARITIME 등)
    const protectBrand = (s) => String(s)
        .replace(/SAMJOO MARITIME/g,    '<span class="nowrap">SAMJOO MARITIME</span>')
        .replace(/SAMJOO SM CO\., LTD\./g, '<span class="nowrap">SAMJOO SM CO., LTD.</span>')
        .replace(/SAMJOO SM(?!\w)/g,    '<span class="nowrap">SAMJOO SM</span>')
        .replace(/DORIKO LIMITED/g,     '<span class="nowrap">DORIKO LIMITED</span>')
        .replace(/DORIKO LTD\.?/g,      '<span class="nowrap">DORIKO LTD.</span>');
    const items = state.history.map(h => `
        <li class="tl__item ${h.highlight ? 'is-highlight' : ''}">
            <span class="tl__dot"></span>
            <div class="tl__card">
                <div class="tl__head">
                    <span class="tl__year">${h.year}</span>
                    ${h.highlight ? '<span class="tl__badge">' + (state.lang === 'ko' ? '현재' : 'PRESENT') + '</span>' : ''}
                </div>
                <h3 class="tl__title">${protectBrand(L(h.title))}</h3>
                <p class="tl__desc">${protectBrand(L(h.desc))}</p>
            </div>
        </li>
    `).join('');
    document.getElementById('timeline').innerHTML = `<ol class="tl">${items}</ol>`;
}

function renderCerts() {
    if (!state.certs) return;
    const dict = window.I18N[state.lang] || window.I18N.ko;
    const catLabel = (cat) => dict['cert.cat.' + cat] || cat;
    document.getElementById('certGrid').innerHTML = state.certs.map(c => `
        <div class="cert cert--${c.category}">
            <span class="cert__cat">${catLabel(c.category)}</span>
            <div class="cert__icon"><i class="fas fa-${c.icon}"></i></div>
            <h3>${c.name}</h3>
            <p>${state.lang === 'ko' ? c.labelKo : c.labelEn}</p>
        </div>
    `).join('');
}

function renderDirections() {
    if (!state.company?.offices) return;
    const grid = document.getElementById('directionsGrid');
    if (!grid) return;
    const dict = window.I18N?.[state.lang] || {};
    const openLabel  = dict['directions.openMap']  || '큰 지도로 보기';
    const routeLabel = dict['directions.route']    || '네이버 길찾기';
    grid.innerHTML = state.company.offices.map(o => {
        const addr = L(o.address);
        const q = encodeURIComponent(addr);
        const embed = `https://www.google.com/maps?q=${q}&hl=${state.lang}&z=17&output=embed`;
        const link  = `https://www.google.com/maps/search/?api=1&query=${q}`;
        const emails = o.emails || (o.email ? [o.email] : []);
        const emailRows = emails.map((e, i) => `
            <p class="direction__row">
                <strong>${i === 0 ? 'Email' : ''}</strong>
                <a href="mailto:${e}">${e}</a>
            </p>`).join('');
        return `
        <article class="direction">
            <div class="direction__map">
                <iframe src="${embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                    allowfullscreen title="${L(o.name)} map"></iframe>
            </div>
            <div class="direction__info">
                <h3>${L(o.name)}</h3>
                <p class="direction__addr"><i class="fas fa-map-marker-alt"></i>${addr}</p>
                <p class="direction__row"><strong>Tel</strong> <a href="tel:${o.tel}">${o.tel}</a></p>
                <p class="direction__row"><strong>Fax</strong> <span>${o.fax}</span></p>
                ${emailRows}
                <p class="direction__hours">${L(o.hours)}</p>
                <a class="direction__route-btn"
                   href="https://map.naver.com/p/search/${q}"
                   target="_blank" rel="noopener"
                   title="${routeLabel}">
                    <span class="naver-n">N</span>
                    <span>${routeLabel}</span>
                    <i class="fas fa-arrow-up-right-from-square"></i>
                </a>
                <a class="direction__open" href="${link}" target="_blank" rel="noopener">
                    ${openLabel}<i class="fas fa-arrow-up-right-from-square"></i>
                </a>
            </div>
        </article>`;
    }).join('');
}

function setupMailpick() {
    const root = document.getElementById('mailpick');
    if (!root) return;
    const office = state.company?.offices?.[0] || {};
    const emails = office.emails || (office.email ? [office.email] : ['samjoosm@samjoosm.com']);
    const TO = emails.join(',');
    const TO_ENC = encodeURIComponent(TO);
    const refresh = () => {
        const dict = window.I18N?.[state.lang] || {};
        const subj = encodeURIComponent(dict['contact.subject.default'] || '문의');
        const body = encodeURIComponent(dict['contact.body.default']    || '');
        const urls = {
            gmail:   `https://mail.google.com/mail/?view=cm&fs=1&to=${TO_ENC}&su=${subj}&body=${body}`,
            outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${TO_ENC}&subject=${subj}&body=${body}`,
            naver:   `https://mail.naver.com/write/popup/?to=${TO_ENC}&subject=${subj}&body=${body}`
        };
        root.querySelectorAll('[data-mail]').forEach(a => {
            a.setAttribute('href', urls[a.dataset.mail] || `mailto:${TO}`);
        });
        // Update visible emails under the picker
        const toEl = document.getElementById('mailpickTo');
        if (toEl) {
            toEl.innerHTML = emails.map(e => `<a href="mailto:${e}">${e}</a>`).join('<span class="mailpick__sep">·</span>');
        }
    };
    refresh();
    window.refreshMailpick = refresh;
}

function renderAllI18nDependent() {
    bindStaticData();
    renderKPI();
    renderCeoMessage();
    renderFleet();
    renderServices();
    renderOrg();
    renderHistory();
    renderCerts();
    renderDirections();
    if (typeof window.refreshMailpick === 'function') window.refreshMailpick();
}

// ============================================================
// Interactions
// ============================================================
function setupNav() {
    const nav = document.getElementById('nav');
    const isMobileNav = () => window.matchMedia('(max-width: 1024px)').matches;
    document.getElementById('langToggle').addEventListener('click', toggleLang);
    document.getElementById('burger').addEventListener('click', () => {
        nav.classList.toggle('is-open');
    });

    document.querySelectorAll('[data-nav-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isMobileNav()) {
                btn.blur();
                return;
            }
            const item = btn.closest('.nav__item');
            const isOpen = item.classList.contains('is-expanded');
            document.querySelectorAll('.nav__item.is-expanded').forEach(openItem => {
                openItem.classList.remove('is-expanded');
                openItem.querySelector('[data-nav-toggle]')?.setAttribute('aria-expanded', 'false');
            });
            item.classList.toggle('is-expanded', !isOpen);
            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
    });

    document.querySelectorAll('.nav__menu a').forEach(a => {
        a.addEventListener('click', () => {
            nav.classList.remove('is-open');
            document.querySelectorAll('.nav__item.is-expanded').forEach(item => {
                item.classList.remove('is-expanded');
                item.querySelector('[data-nav-toggle]')?.setAttribute('aria-expanded', 'false');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (nav.contains(e.target)) return;
        document.querySelectorAll('.nav__item.is-expanded').forEach(item => {
            item.classList.remove('is-expanded');
            item.querySelector('[data-nav-toggle]')?.setAttribute('aria-expanded', 'false');
        });
    });
}

function setupCeoToggle() {
    const btn = document.getElementById('ceoToggle');
    btn.addEventListener('click', () => {
        const target = document.getElementById('ceoMessage');
        const expanded = target.classList.toggle('expanded');
        syncCeoToggle(expanded);
    });
}

function syncCeoToggle(expanded) {
    const btn = document.getElementById('ceoToggle');
    if (!btn) return;
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.querySelector('span').textContent = expanded
        ? (state.lang === 'ko' ? '접기' : 'Show Less')
        : (state.lang === 'ko' ? '전체 인사말 보기' : 'Read Full Message');
}

function setupBackTop() {
    const btn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 600);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (!loading) return;
    loading.classList.add('hidden');
    setTimeout(() => { loading.style.display = 'none'; }, 400);
}
function setupLoading() {
    // 강력 폴백 — 무조건 1.2초 안에 사라짐 (네트워크 에러 무관)
    setTimeout(hideLoading, 1200);
    // 추가 안전망 — window.load 시점에도 강제
    window.addEventListener('load', () => setTimeout(hideLoading, 400));
}

function setupScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
        bar.style.width = scrolled + '%';
    });
}

function setupNavScrollShadow() {
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 30);
    });
}


function setupReveal() {
    const targets = document.querySelectorAll('.section, .kpi__card, .card, .news-card, .career-card, .timeline__item, .org__box, .fleet__cat, .service, .stats-dark__card, .owner, .cert, .why__item');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in-view');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(t => io.observe(t));
}

// Count-up for numeric stats (.kpi__num, .stats-dark__num, .gnet__stats strong)
function setupCountUp() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parse = (txt) => {
        const m = String(txt).match(/^(\D*)(\d+)(\D*)$/); // single integer with optional prefix/suffix
        return m ? { pre: m[1], num: parseInt(m[2], 10), suf: m[3], digits: m[2].length } : null;
    };
    const run = (el) => {
        const parts = parse(el.textContent);
        if (!parts || el.dataset.counted) return;
        el.dataset.counted = '1';
        const dur = 1100, t0 = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.round(parts.num * eased);
            el.textContent = parts.pre + val + parts.suf;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    document.querySelectorAll('.kpi__num, .stats-dark__num, .gnet__stats strong, .fleet__sum-card strong').forEach(el => io.observe(el));
}

async function init() {
    // 페이지 진입 시 항상 최상단으로 (브라우저의 스크롤 복원 + 해시 점프 차단)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    setupLoading();
    setupScrollProgress();
    setupNavScrollShadow();
    setupNav();
    setupCeoToggle();
    setupBackTop();

    const savedLang = localStorage.getItem('samjoo-lang') || 'ko';
    state.lang = savedLang;

    try {
        const [company, fleet, services, history, org, certs] = await Promise.all([
            API.company(), API.fleet(), API.services(),
            API.history(), API.organization(), API.certifications()
        ]);
        state.company = company;
        state.fleet = fleet;
        state.services = services;
        state.history = history;
        state.org = org;
        state.certs = certs;
    } catch (err) {
        console.error('[INIT] data load failed:', err);
    }

    setLanguage(savedLang);
    setupMailpick();
    setupReveal();
    setupCountUp();
    hideLoading();
    // 데이터 렌더 + 로딩 오버레이 종료 후에도 한 번 더 최상단 강제 (이미지/폰트 reflow 대응)
    requestAnimationFrame(() => window.scrollTo(0, 0));
    window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
}

document.addEventListener('DOMContentLoaded', init);
