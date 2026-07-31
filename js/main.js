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
    certs: null,
    careers: null,
    news: null
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
// 선대 데이터에서 집계 — 어디서든 재사용
function fleetFacts() {
    const vs = state.fleet?.vessels || [];
    const tally = (key) => vs.reduce((m, v) => (m[v[key]] = (m[v[key]] || 0) + 1, m), {});
    const isBulk = (v) => /BULK/i.test(v.type);
    const sum = (list) => list.reduce((n, v) => n + (Number(v.dwt) || 0), 0);
    const rank = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return {
        count: vs.length,
        dwtTotal: sum(vs),
        dwtBulk: sum(vs.filter(isBulk)),
        dwtCar: sum(vs.filter(v => !isBulk(v))),
        owners: rank(tally('owner')),
        classes: rank(tally('class')),
        flags: rank(tally('flag')),
    };
}

// 짧은 선주사 표기 — CO., LTD. 등 법인 접미어 제거
function shortOwner(name) {
    return String(name).replace(/\s*CO\.,?\s*LTD\.?/i, '').replace(/\s+/g, ' ').trim();
}

function renderKPI() {
    const grid = document.getElementById('kpiGrid');
    if (!grid || !state.fleet?.vessels) return;
    const f = fleetFacts();
    const ko = state.lang === 'ko';
    const n = (x) => x.toLocaleString('en-US');

    // 등폭 숫자 자리에는 숫자만 — ISM/ISO/DOC 같은 약어는 11 인증 섹션이 담당
    const cards = [
        {
            value: n(f.dwtTotal),
            label: ko ? '총 재화중량' : 'Total Deadweight',
            desc: ko
                ? `벌크 ${n(f.dwtBulk)} · 자동차운반 ${n(f.dwtCar)}`
                : `Bulk ${n(f.dwtBulk)} · PCC/PCTC ${n(f.dwtCar)}`,
        },
        {
            value: String(f.owners.length),
            label: ko ? '선주사' : 'Principals',
            desc: f.owners.map(([o, c]) => `${shortOwner(o)} ${c}`).join(' · '),
        },
        {
            value: String(f.classes.length),
            label: ko ? '선급' : 'Class Societies',
            desc: f.classes.map(([c, k]) => `${c} ${k}`).join(' · '),
        },
        {
            value: '3',
            label: ko ? '신조 벌크선' : 'Newbuildings',
            desc: ko ? '2026년 인도 예정 · 건조 감리 수행' : 'Delivery 2026 · under supervision',
        },
    ];

    grid.innerHTML = cards.map((k, i) => {
        const plain = k.value.replace(/,/g, '');
        const num = /^\d+$/.test(plain)
            ? `<span data-count="${plain}">${k.value}</span>`
            : k.value;
        return `
        <div class="kpi__card">
            <span class="kpi__idx">${String(i + 1).padStart(2, '0')}</span>
            <div class="kpi__num">${num}</div>
            <div class="kpi__label">${k.label}</div>
            <div class="kpi__desc">${k.desc}</div>
        </div>`;
    }).join('');
    observeCounts();
}

// 서비스별 준거 기준 — 삽화 대신 실제 표준을 라벨로 (FIG 자리 대체)
const SERVICE_STANDARDS = {
    technical: ['CLASS', 'DRY DOCK', 'SPARES', 'PMS'],
    crew: ['STCW', 'MLC', 'FLAG DOC'],
    shqe: ['ISM', 'ISPS', 'ISO 9001', 'ISO 14001', 'ISO 45001'],
    newbuilding: ['PLAN REVIEW', 'SEA TRIAL', 'WARRANTY'],
};

// 선박 명부 티커 — 실제 관리 선박 데이터로 채움
function renderTicker() {
    const track = document.getElementById('vesselTicker');
    if (!track || !state.fleet?.vessels) return;
    const items = state.fleet.vessels.map(v =>
        `<span class="ticker__item"><b>${v.name}</b><em>${v.type}</em><i>${v.dwt.toLocaleString()} DWT</i></span>`
    ).join('<span class="ticker__sep">•</span>');
    // 무한 스크롤을 위해 2회 반복
    track.innerHTML = `<span class="ticker__group">${items}<span class="ticker__sep">•</span></span><span class="ticker__group" aria-hidden="true">${items}<span class="ticker__sep">•</span></span>`;
}

function renderCeoMessage() {
    if (!state.company?.ceo?.message) return;
    const paragraphs = state.company.ceo.message[state.lang] || state.company.ceo.message.ko;
    const target = document.getElementById('ceoMessage');
    target.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
    target.classList.add('expanded');
    syncCeoToggle(true);

    const stamp = document.getElementById('ceoStampFleet');
    if (stamp && state.fleet?.vessels) {
        const f = fleetFacts();
        stamp.textContent = `${f.count} ${state.lang === 'ko' ? '척' : 'VESSELS'} · ${f.dwtTotal.toLocaleString('en-US')} DWT`;
    }
}

function renderFleet() {
    if (!state.fleet) return;
    const s = state.fleet.summary;
    const ko = state.lang === 'ko';
    // 선대 구성 도넛 (실데이터: 벌크 vs PCTC) — 둘레 r=52
    const C = 2 * Math.PI * 52;
    const pctcLen = (s.pctc / s.total) * C;
    const bulkLen = (s.bulk / s.total) * C;
    const bulkRot = -90 + (s.pctc / s.total) * 360; // pctc 다음부터 시작
    const donut = `
        <div class="fleet-donut" aria-label="${ko ? '선대 구성' : 'Fleet composition'}">
            <div class="fleet-donut__chart">
                <svg class="fleet-donut__svg" viewBox="0 0 140 140" role="img"
                     aria-label="${ko ? '벌크선' : 'Bulk'} ${s.bulk}, ${ko ? '자동차운반선' : 'PCTC'} ${s.pctc}">
                    <circle class="fleet-donut__track" cx="70" cy="70" r="52"></circle>
                    <circle class="fleet-donut__seg fleet-donut__seg--pctc" cx="70" cy="70" r="52"
                        style="--len:${pctcLen.toFixed(2)};--gap:${(C - pctcLen).toFixed(2)};--rot:-90deg"></circle>
                    <circle class="fleet-donut__seg fleet-donut__seg--bulk" cx="70" cy="70" r="52"
                        style="--len:${bulkLen.toFixed(2)};--gap:${(C - bulkLen).toFixed(2)};--rot:${bulkRot.toFixed(2)}deg"></circle>
                </svg>
                <div class="fleet-donut__center">
                    <strong data-count="${s.total}">${s.total}</strong>
                    <span>${ko ? '척' : 'vessels'}</span>
                </div>
            </div>
            <ul class="fleet-donut__legend">
                <li data-pillar="bulk"><span class="fleet-donut__dot"></span>${ko ? '벌크선' : 'Bulk'} <b>${s.bulk}</b><em>${s.ratioBulk}%</em></li>
                <li data-pillar="pctc"><span class="fleet-donut__dot"></span>${ko ? '자동차운반선' : 'PCTC'} <b>${s.pctc}</b><em>${s.ratioPctc}%</em></li>
            </ul>
        </div>`;
    document.getElementById('fleetSummary').innerHTML = donut + `
        <div class="fleet__sum-cards">
        <div class="fleet__sum-card">
            <span class="fleet__sum-k">TOTAL</span>
            <div><strong data-count="${s.total}">${s.total}</strong><span>${ko ? '총 관리 선박' : 'Total Vessels'}</span></div>
        </div>
        <div class="fleet__sum-card">
            <span class="fleet__sum-k">BULK</span>
            <div><strong data-count="${s.bulk}">${s.bulk}</strong><span>${ko ? '벌크선' : 'Bulk Carriers'} · ${s.ratioBulk}%</span></div>
        </div>
        <div class="fleet__sum-card">
            <span class="fleet__sum-k">PCTC</span>
            <div><strong data-count="${s.pctc}">${s.pctc}</strong><span>${ko ? '자동차운반선' : 'PCTCs'} · ${s.ratioPctc}%</span></div>
        </div>
        </div>
    `;
    observeDonut();
    observeCounts();

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
        <tr>
            <td><strong>${v.name}</strong></td>
            <td>${v.owner}</td>
            <td><span class="type-badge ${v.type}">${v.type}</span></td>
            <td><span class="flag-cell">${flagImg(v.flag)}<span>${v.flag}</span></span></td>
            <td>${v.dwt.toLocaleString()}</td>
            <td>${v.built}</td>
            <td>${v.class}</td>
        </tr>
    `).join('');

    // Owners — 워드마크 스트립 (아이콘 카드 대신 텍스트 마크)
    const ownersEl = document.getElementById('ownersGrid');
    if (ownersEl && state.fleet.owners) {
        ownersEl.innerHTML = state.fleet.owners.map(o => `
            <div class="owner"><h4>${o}</h4></div>
        `).join('');
    }

    renderTicker();
}

function renderServices() {
    if (!state.services) return;
    // 에디토리얼 행 + 도판(FIG.) 프레임 일러스트
    document.getElementById('servicesGrid').innerHTML = state.services.map((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        return `
        <div class="service">
            <div class="service__index">
                <span class="service__num">${num}</span>
            </div>
            <figure class="service__media">
                <img src="images/${s.image}" alt="${L(s.name)}" loading="lazy">
                <figcaption>FIG. ${num}</figcaption>
            </figure>
            <div class="service__body">
                <h3>${L(s.name)}</h3>
                <p class="service__standards">${(SERVICE_STANDARDS[s.id] || []).map(c => `<span>${c}</span>`).join('')}</p>
                <p>${L(s.description)}</p>
            </div>
            <ul class="service__features">${L(s.features).map(f => `<li>${f}</li>`).join('')}</ul>
        </div>`;
    }).join('');
}

function renderOrg() {
    if (!state.org) return;
    const root = document.getElementById('orgChart');
    // h4 (eyebrow) — 항상 영문 고정 (디자인: 작은 대문자 태그)
    const divLabelEn = { smd: 'Ship Management', bsd: 'Business Support' };

    // 본부별 소속 팀으로 가지 분기 (SMD 3팀 / BSD 1팀)
    const GAP = 1.1; // rem — CSS 그리드 gap과 일치해야 함
    const branches = state.org.divisions.map(d => ({
        div: d,
        teams: state.org.teams.filter(t => t.division === d.id)
    }));
    const totalFr = branches.reduce((a, b) => a + Math.max(b.teams.length, 1), 0);
    const frs = branches.map(b => Math.max(b.teams.length, 1));
    // CEO 가로선 — 첫/끝 가지(본부) 중심을 정확히 연결
    const lineL = `calc((100% - ${GAP * (branches.length - 1)}rem) * ${(frs[0] / 2 / totalFr).toFixed(4)})`;
    const lineR = `calc((100% - ${GAP * (branches.length - 1)}rem) * ${(frs[frs.length - 1] / 2 / totalFr).toFixed(4)})`;

    const branchHtml = branches.map(b => {
        const n = b.teams.length;
        const teamsStyle = n > 1
            ? `grid-template-columns:repeat(${n},1fr);--rail-inset:calc((100% - ${((n - 1) * GAP).toFixed(1)}rem) / ${2 * n})`
            : `grid-template-columns:minmax(0,236px);justify-content:center`;
        return `
        <div class="org__branch">
            <div class="org__box org__box--division">
                <h4>${divLabelEn[b.div.id]}</h4>
                <p>${L(b.div.name)}</p>
            </div>
            <div class="org__teams" data-teams="${n}" style="${teamsStyle}">
                ${b.teams.map(t => `
                <div class="org__box org__box--team">
                    <span class="org__code">${t.id}</span>
                    <p>${L(t.name)}</p>
                    <span class="org__loc">${L(t.location)}</span>
                </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    root.innerHTML = `
        <div class="org__row org__row--ceo">
            <div class="org__box org__box--ceo">
                <h4>Chief Executive Officer</h4>
                <p>${L(state.org.ceo.title)}</p>
            </div>
        </div>
        <div class="org__branches" style="grid-template-columns:${frs.map(f => f + 'fr').join(' ')};--line-l:${lineL};--line-r:${lineR}">
            ${branchHtml}
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
    document.getElementById('timeline').innerHTML = state.history.map(h => `
        <div class="timeline__item ${h.highlight ? 'is-highlight' : ''}">
            <div class="timeline__year">${h.year}</div>
            <div class="timeline__content">
                ${h.highlight ? '<span class="timeline__badge">' + (state.lang === 'ko' ? '현재' : 'PRESENT') + '</span>' : ''}
                <h3>${protectBrand(L(h.title))}</h3>
                <p>${protectBrand(L(h.desc))}</p>
            </div>
        </div>
    `).join('');
}

function renderCerts() {
    if (!state.certs) return;
    // 증서 기록부(ledger) — 선내 증서 목록처럼 행 단위로
    const ko = state.lang === 'ko';
    document.getElementById('certGrid').innerHTML = state.certs.map((c, i) => {
        // 증서번호·발행일·만료일은 채워졌을 때만 노출 (미기입 필드는 조용히 생략)
        const meta = [
            c.issuer && `${ko ? '발행' : 'Issued by'} ${c.issuer}`,
            c.certNo && `NO. ${c.certNo}`,
            c.issued && `${ko ? '발행일' : 'Issued'} ${c.issued}`,
            c.expires && `${ko ? '만료' : 'Valid to'} ${c.expires}`,
            L(c.scope),
        ].filter(Boolean).join('  ·  ');
        return `
        <div class="cert cert--${c.category}">
            <span class="cert__no">${String(i + 1).padStart(2, '0')}</span>
            <span class="cert__code">${c.code}</span>
            <h3>${c.name}</h3>
            <p>${ko ? c.labelKo : c.labelEn}</p>
            ${meta ? `<span class="cert__meta">${meta}</span>` : ''}
            <span class="cert__cat">${c.category.toUpperCase()}</span>
        </div>`;
    }).join('');
}

// 채용 공고 — careers.json (지금까지 데이터만 있고 화면에 없던 것)
const DEPT_LABEL = {
    deck: { ko: '항해', en: 'Deck' },
    engineer: { ko: '기관', en: 'Engine' },
    shore: { ko: '육상', en: 'Shore' },
};
function renderOpenings() {
    const el = document.getElementById('openingsList');
    if (!el) return;
    const list = (state.careers || []).filter(j => j.status === 'open');
    const ko = state.lang === 'ko';
    if (!list.length) {
        el.innerHTML = `<p class="openings__empty">${ko ? '현재 모집 중인 공고가 없습니다.' : 'No open positions at this time.'}</p>`;
        return;
    }
    el.innerHTML = list.map((j, i) => `
        <article class="opening">
            <span class="opening__no">${String(i + 1).padStart(2, '0')}</span>
            <span class="opening__dept">${L(DEPT_LABEL[j.department] || { ko: j.department, en: j.department })}</span>
            <span class="opening__body">
                <h4>${j.title}</h4>
                <p>${j.description}</p>
            </span>
            <span class="opening__meta">
                <span>${j.location}</span>
                <span>${j.employment}</span>
            </span>
            <span class="opening__date">${j.posted_at}</span>
        </article>`).join('');
}

// 운항·인증 기록 — news.json (api.js에 있었지만 호출하는 곳이 없었음)
const RECORD_CAT = {
    press: { ko: '공지', en: 'Notice' },
    certification: { ko: '인증', en: 'Certification' },
    psc: { ko: '검사', en: 'Inspection' },
};
function renderRecord() {
    const el = document.getElementById('recordList');
    if (!el) return;
    const list = (state.news || []).filter(n => n.published)
        .slice().sort((a, b) => String(b.posted_at).localeCompare(String(a.posted_at)));
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = list.map((n, i) => `
        <article class="record__row">
            <span class="record__no">${String(i + 1).padStart(2, '0')}</span>
            <time class="record__date" datetime="${n.posted_at}">${n.posted_at}</time>
            <span class="record__cat">${L(RECORD_CAT[n.category] || { ko: n.category, en: n.category })}</span>
            <span class="record__body">
                <h4>${n.title}</h4>
                <p>${n.content}</p>
            </span>
        </article>`).join('');
}

// 핵심 역량 4칸의 근거 원장 — 전부 실제 선대/인증 데이터에서 도출
function renderWhyEvidence() {
    if (!state.fleet?.vessels) return;
    const f = fleetFacts();
    const ko = state.lang === 'ko';
    const rows = {
        'evi-1': (ko ? '기국 ' : 'Flag ') + f.flags.map(([k, v]) => `${k} ${v}`).join(' · '),
        'evi-2': (ko ? '선급 ' : 'Class ') + f.classes.map(([k, v]) => `${k} ${v}`).join(' · '),
        'evi-3': ko ? 'CMT · 부산 사무소 · STCW / MLC' : 'CMT · Busan office · STCW / MLC',
        'evi-4': 'ISO 9001 · 14001 · 45001',
    };
    Object.entries(rows).forEach(([id, text]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
    const hours = document.getElementById('commitHours');
    if (hours) hours.textContent = L(state.company?.offices?.[0]?.hours || '');
}

function renderDirections() {
    if (!state.company?.offices) return;
    const grid = document.getElementById('directionsGrid');
    if (!grid) return;
    const dict = window.I18N?.[state.lang] || {};
    const openLabel  = dict['directions.openMap']  || '큰 지도로 보기';
    const routeLabel = dict['directions.route']    || '네이버 길찾기';
    // 사무소별 좌표 — 지도 프레임 라벨 (해도 주기 스타일)
    const coords = {
        seoul: `37°33'N 126°58'E`,
        busan: `35°06'N 129°02'E`
    };
    grid.innerHTML = state.company.offices.map(o => {
        const addr = L(o.address);
        // mapQuery(도로명+건물명) 우선 — 서울/부산 지도 핀 정확도 (사용자 라이브 수정 반영)
        const q = encodeURIComponent(o.mapQuery || addr);
        const embed = `https://www.google.com/maps?q=${q}&hl=${state.lang}&z=17&output=embed`;
        const link  = `https://www.google.com/maps/search/?api=1&query=${q}`;
        const emails = o.emails || (o.email ? [o.email] : []);
        const emailRows = emails.map((e, i) => `
            <p class="direction__row">
                <strong>${i === 0 ? 'EMAIL' : ''}</strong>
                <a href="mailto:${e}">${e}</a>
            </p>`).join('');
        return `
        <article class="direction">
            <div class="direction__map">
                <iframe src="${embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                    allowfullscreen title="${L(o.name)} map"></iframe>
                <span class="direction__coord">${coords[o.id] || ''}</span>
            </div>
            <div class="direction__info">
                <h3>${L(o.name)}</h3>
                <p class="direction__addr">${window.icon('pin')}${addr}</p>
                <p class="direction__row"><strong>TEL</strong> <a href="tel:${o.tel}">${o.tel}</a></p>
                <p class="direction__row"><strong>FAX</strong> <span>${o.fax}</span></p>
                ${emailRows}
                <p class="direction__hours">${L(o.hours)}</p>
                <div class="direction__actions">
                    <a class="direction__route-btn"
                       href="https://map.naver.com/p/search/${q}"
                       target="_blank" rel="noopener"
                       title="${routeLabel}">
                        <span class="naver-n">N</span>
                        <span>${routeLabel}</span>
                        ${window.icon('arrow-up-right')}
                    </a>
                    <a class="direction__open" href="${link}" target="_blank" rel="noopener">
                        ${openLabel}${window.icon('arrow-up-right')}
                    </a>
                </div>
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
    renderWhyEvidence();
    renderOpenings();
    renderRecord();
    renderDirections();
    if (typeof window.refreshMailpick === 'function') window.refreshMailpick();
    // 재렌더된 노드들을 reveal 관찰자에 다시 등록 (언어 전환 시 사라짐 방지)
    setupReveal();
}

// ============================================================
// Interactions
// ============================================================
// setupNav 내부에서 채워짐 — 다른 핸들러가 메뉴를 닫을 때 사용
let closeNav = () => {};

function setupNav() {
    const nav = document.getElementById('nav');
    const isMobileNav = () => window.matchMedia('(max-width: 1024px)').matches;
    document.getElementById('langToggle').addEventListener('click', toggleLang);

    // 메뉴 열린 동안 뒤 페이지 스크롤 잠금 (iOS 사파리는 overflow:hidden만으로 안 잠김)
    let lockedY = 0;
    function setNavOpen(open) {
        const body = document.body;
        if (open) {
            lockedY = window.scrollY;
            nav.classList.add('is-open');
            body.classList.add('is-nav-open');
            body.style.top = -lockedY + 'px';
        } else {
            nav.classList.remove('is-open');
            body.classList.remove('is-nav-open');
            body.style.top = '';
            window.scrollTo(0, lockedY);
        }
    }
    closeNav = () => { if (nav.classList.contains('is-open')) setNavOpen(false); };

    document.getElementById('burger').addEventListener('click', () => {
        setNavOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

    document.querySelectorAll('[data-nav-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.nav__item');
            // 데스크톱: 클릭 = 그룹 대표 섹션으로 이동 (드롭다운은 호버로 열림)
            if (!isMobileNav()) {
                const first = item.querySelector('.nav__mega-col.is-focus a[href^="#"]') || item.querySelector('.nav__dropdown a[href^="#"]');
                btn.blur();
                if (first) location.hash = first.getAttribute('href');
                return;
            }
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
            closeNav();
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

function setupTickerPause() {
    // 터치 사용자용 — 탭으로 티커 일시정지/재개 (hover 미지원 기기 대응)
    const tick = document.querySelector('.ticker');
    if (!tick) return;
    tick.addEventListener('click', () => tick.classList.toggle('is-paused'));
}

// 티커 구동 — CSS 애니메이션 대신 JS 직접 구동.
// (감속모션 OS설정·구버전 CSS 캐시 등 어떤 환경에서도 확실히 움직이게)
function setupTickerMotion() {
    const ticker = document.querySelector('.ticker');
    const track = document.getElementById('vesselTicker');
    if (!ticker || !track) return;
    track.style.animation = 'none'; // 캐시된 구버전 CSS의 keyframe까지 무력화
    let x = 0;
    let last = null;
    let hover = false;
    const SPEED = 60; // px/s
    ticker.addEventListener('mouseenter', () => { hover = true; });
    ticker.addEventListener('mouseleave', () => { hover = false; });
    function frame(now) {
        if (last === null) last = now;
        if (!hover && !ticker.classList.contains('is-paused')) {
            x -= SPEED * (now - last) / 1000;
            const half = track.scrollWidth / 2;
            if (half > 0 && -x >= half) x += half; // 절반(1세트) 지나면 이어붙여 무한루프
            track.style.transform = 'translateX(' + x + 'px)';
        }
        last = now;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function setupBackTop() {
    const btn = document.getElementById('backTop');
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 600);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function hideLoading() {
    // 히어로 연출은 커튼이 걷히는 순간부터 — 그 전엔 아무도 못 봄
    document.body.classList.add('is-ready');
    const loading = document.getElementById('loading');
    if (!loading) return;
    loading.classList.add('hidden');
    setTimeout(() => { loading.style.display = 'none'; }, 400);
}
function setupLoading() {
    // 강력 폴백 — 무조건 1.2초 안에 사라짐 (네트워크 에러 무관)
    setTimeout(hideLoading, 600);
    // 추가 안전망 — window.load 시점에도 강제
    window.addEventListener('load', () => setTimeout(hideLoading, 400));
}

function setupScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const h = document.documentElement;
        const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
        bar.style.transform = 'scaleX(' + Math.min(Math.max(p, 0), 1) + ')';
    }, { passive: true });
}

function setupNavScrollShadow() {
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 30);
    }, { passive: true });
}


// ============================================================
// Data infographics — count-up, fleet donut, timeline progress
// ============================================================
function prefersReduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateCount(el) {
    const to = parseFloat(el.getAttribute('data-count'));
    if (isNaN(to)) return;
    if (prefersReduced()) { el.textContent = to.toLocaleString(); return; }
    const dur = 1100;
    const start = performance.now();
    function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = to.toLocaleString();
    }
    requestAnimationFrame(tick);
}

let _countIO;
function observeCounts() {
    if (!_countIO) {
        _countIO = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) { animateCount(e.target); _countIO.unobserve(e.target); }
            });
        }, { threshold: 0.6 });
    }
    document.querySelectorAll('[data-count]:not([data-counted])').forEach(el => {
        el.setAttribute('data-counted', '');
        if (!prefersReduced()) el.textContent = '0';
        _countIO.observe(el);
    });
}

function observeDonut() {
    const d = document.querySelector('.fleet-donut');
    if (!d) return;
    if (prefersReduced()) { d.classList.add('is-drawn'); return; }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('is-drawn'); io.unobserve(e.target); }
        });
    }, { threshold: 0.35 });
    io.observe(d);
}

function setupTimelineProgress() {
    const tl = document.getElementById('timeline');
    if (!tl) return;
    const update = () => {
        const r = tl.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const passed = (vh * 0.65) - r.top;
        const p = Math.max(0, Math.min(1, passed / Math.max(r.height, 1)));
        tl.style.setProperty('--tl-progress', (p * 100).toFixed(1) + '%');
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

const REVEAL_SELECTOR = '.kpi__card, .mv, .timeline__item, .org__box, .fleet__cat, .service, .stats-dark__card, .cert, .why__item, .careers-portal, .esg-col, .safety-col, .safety-cycle__step, .direction';
let _revealIO;
function setupReveal() {
    // 재렌더(언어 전환 등)로 새로 생성된 노드도 매번 다시 관찰한다.
    // 새 노드가 관찰되지 않으면 opacity:0 상태로 영영 안 보이는 버그가 생긴다.
    if (!_revealIO) {
        _revealIO = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('in-view');
                    _revealIO.unobserve(e.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    }
    document.querySelectorAll(REVEAL_SELECTOR).forEach(t => {
        if (!t.hasAttribute('data-revealed')) {
            t.setAttribute('data-revealed', '');
            _revealIO.observe(t);
        }
    });
}

async function init() {
    // 해시 없이 들어오면 최상단 고정(브라우저 스크롤 복원 차단), 해시가 있으면 그 섹션으로 보냄
    const entryHash = location.hash;
    if (!entryHash) {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
    }

    setupLoading();
    setupScrollProgress();
    setupNavScrollShadow();
    setupNav();
    setupCeoToggle();
    setupBackTop();
    setupTickerPause();
    setupTickerMotion();

    const savedLang = localStorage.getItem('samjoo-lang') || 'ko';
    state.lang = savedLang;

    try {
        const [company, fleet, services, history, org, certs, careers, news] = await Promise.all([
            API.company(), API.fleet(), API.services(),
            API.history(), API.organization(), API.certifications(),
            API.careers.list(), API.news.list(20)
        ]);
        state.company = company;
        state.fleet = fleet;
        state.services = services;
        state.history = history;
        state.org = org;
        state.certs = certs;
        state.careers = careers;
        state.news = news;
    } catch (err) {
        console.error('[INIT] data load failed:', err);
    }

    setLanguage(savedLang);
    setupMailpick();
    setupReveal();
    setupTimelineProgress();
    observeCounts();
    hideLoading();

    if (entryHash) {
        // 렌더가 끝난 뒤에 해시 섹션으로 — 13,000px 스무스 스크롤은 부적절하므로 auto
        const land = () => {
            const el = document.querySelector(entryHash);
            if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
        };
        requestAnimationFrame(land);
        window.addEventListener('load', () => requestAnimationFrame(land), { once: true });
    } else {
        // 데이터 렌더 + 로딩 오버레이 종료 후에도 한 번 더 최상단 강제 (이미지/폰트 reflow 대응)
        requestAnimationFrame(() => window.scrollTo(0, 0));
        window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
    }
}

document.addEventListener('DOMContentLoaded', init);
