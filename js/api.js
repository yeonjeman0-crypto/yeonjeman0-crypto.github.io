/**
 * Static API — Cloudflare Pages / Netlify / GitHub Pages compatible
 * No backend required. All data is served from /data/*.json.
 * Contact form posts to Formspree (or any compatible form service).
 *
 * Setup Formspree:
 *   1) https://formspree.io  → New Form → copy endpoint URL
 *   2) Replace REPLACE_ME below with that URL, e.g. https://formspree.io/f/abcd1234
 *
 * If you don't want Formspree, leave REPLACE_ME and the form will fall back
 * to mailto: smt@doriko.com which opens the user's mail client.
 */
window.API = (function () {
    var DATA = './data';
    var CONTACT_ENDPOINT =
        (window.SAMJOO_CONFIG && window.SAMJOO_CONFIG.contactEndpoint) ||
        'https://formspree.io/f/REPLACE_ME';

    function loadJson(url, fallbackKey) {
        return fetch(url, { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
            .catch(function () {
                return (window.SAMJOO_DATA && window.SAMJOO_DATA[fallbackKey]) || null;
            });
    }

    function getCareers(cat) {
        return loadJson(DATA + '/careers.json', 'careers').then(function (all) {
            all = all || [];
            return (cat && cat !== 'all')
                ? all.filter(function (c) { return c.department === cat; })
                : all;
        });
    }

    function getNews(n) {
        var limit = n || 6;
        return loadJson(DATA + '/news.json', 'news').then(function (all) {
            all = all || [];
            return all.slice(0, limit);
        });
    }

    function postContact(data) {
        if (!CONTACT_ENDPOINT || CONTACT_ENDPOINT.indexOf('REPLACE_ME') !== -1) {
            var body = encodeURIComponent(
                'Name: '    + (data.name    || '') + '\n' +
                'Email: '   + (data.email   || '') + '\n' +
                'Company: ' + (data.company || '') + '\n' +
                'Subject: ' + (data.subject || '') + '\n\n' +
                (data.message || '')
            );
            window.location.href = 'mailto:smt@doriko.com?subject=' +
                encodeURIComponent('[Website] ' + (data.subject || 'Inquiry')) +
                '&body=' + body;
            return Promise.resolve({ ok: true, fallback: 'mailto' });
        }
        return fetch(CONTACT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
        }).then(function (r) {
            if (r.ok) return { ok: true };
            return r.json().then(function (j) {
                return { ok: false, error: (j && j.error) || ('HTTP ' + r.status) };
            }).catch(function () {
                return { ok: false, error: 'HTTP ' + r.status };
            });
        }).catch(function (e) {
            return { ok: false, error: e.message };
        });
    }

    return {
        company:        function () { return loadJson(DATA + '/company.json',        'company'); },
        fleet:          function () { return loadJson(DATA + '/fleet.json',          'fleet'); },
        services:       function () { return loadJson(DATA + '/services.json',       'services'); },
        history:        function () { return loadJson(DATA + '/history.json',        'history'); },
        organization:   function () { return loadJson(DATA + '/organization.json',   'organization'); },
        certifications: function () { return loadJson(DATA + '/certifications.json', 'certifications'); },
        careers: { list: getCareers },
        news:    { list: getNews },
        contact: { submit: postContact }
    };
})();
