/** Company website motion. Anime.js 4.5.0 (MIT), served locally. */
(() => {
    'use strict';
    if (!window.anime) return;
    const { animate, createTimeline, stagger, onScroll } = window.anime;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1025px) and (hover: hover) and (pointer: fine)');
    const body = document.body;
    const hero = document.querySelector('.hero');
    const slides = [...document.querySelectorAll('.hero__slide')];
    const scenes = [...document.querySelectorAll('[data-scene]')];
    const toggle = document.getElementById('motionToggle');
    const jobs = new Set();
    const ambient = new Map();
    const scrollJobs = new Map();
    const pointerJobs = new Map();
    const seen = new WeakSet();
    const bound = new WeakSet();
    let pending = new Map();
    let selector = '';
    let initialized = false;
    let ready = false;
    let userPaused = false;
    let heroVisible = true;
    let activeSlide = 0;
    let heroTimer;
    let heroDue = 0;
    let heroRemaining = 7200;
    let heroJobs = [];
    let slideRequest = 0;
    let printing = false;
    const still = () => reduced.matches || userPaused || printing;
    const running = () => !still() && !document.hidden;

    function play(targets, params) {
        const complete = params.onComplete;
        const job = animate(targets, {
            ...params,
            onComplete: self => { jobs.delete(self); complete?.(self); }
        });
        jobs.add(job);
        if (!running()) job.pause();
        return job;
    }

    const revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const action = pending.get(entry.target);
            revealObserver.unobserve(entry.target);
            pending.delete(entry.target);
            seen.add(entry.target);
            if (running()) action?.();
            entry.target.classList.add('in-view');
        }
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });

    function once(element, action) {
        if (!element || seen.has(element) || still()) return;
        pending.set(element, action);
        revealObserver.observe(element);
    }

    function syncLabels() {
        const en = body.classList.contains('lang-en');
        toggle.setAttribute('aria-label', en
            ? (userPaused ? 'Resume motion' : 'Pause motion')
            : (userPaused ? '모션 재생' : '모션 일시정지'));
        toggle.setAttribute('aria-pressed', String(userPaused));
        document.querySelector('.hero__scenes').setAttribute('aria-label', en ? 'Choose fleet photograph' : '선박 사진 선택');
        scenes.forEach((button, i) => {
            button.setAttribute('aria-label', en ? `Fleet photograph ${i + 1}` : `선박 사진 ${i + 1}`);
            button.setAttribute('aria-pressed', String(i === activeSlide));
        });
    }

    function scheduleHero(delay = 7200) {
        clearTimeout(heroTimer);
        heroRemaining = delay;
        if (!running() || !heroVisible) return;
        heroDue = performance.now() + delay;
        heroTimer = setTimeout(() => showSlide((activeSlide + 1) % slides.length), delay);
    }

    function freezeHero() {
        if (heroTimer) heroRemaining = Math.max(50, heroDue - performance.now());
        clearTimeout(heroTimer);
        heroTimer = null;
    }

    async function showSlide(index, immediate = false) {
        if (index === activeSlide && !immediate) return;
        const request = ++slideRequest;
        freezeHero();
        const next = slides[index];
        const source = next.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if (source && !immediate) {
            const image = new Image();
            image.src = source;
            try { await image.decode(); } catch { scheduleHero(); return; }
        }
        if (request !== slideRequest) return;
        heroJobs.forEach(job => { job.cancel(); jobs.delete(job); });
        heroJobs = [];
        const previous = activeSlide;
        activeSlide = index;
        slides.forEach((slide, i) => {
            slide.style.opacity = i === previous ? '1' : '0';
            slide.style.zIndex = i === index ? '1' : '0';
        });
        syncLabels();
        scenes.forEach(button => { button.querySelector('i').style.transform = 'scaleX(0)'; });
        if (still() || immediate) {
            slides.forEach((slide, i) => { slide.style.opacity = i === index ? '1' : '0'; });
        } else {
            heroJobs.push(play(next, { opacity: [0, 1], duration: 1100, ease: 'inOutSine' }));
            if (previous !== index) heroJobs.push(play(slides[previous], { opacity: [1, 0], duration: 1100, ease: 'inOutSine' }));
        }
        if (!still()) {
            heroJobs.push(play(next, {
                scale: [1.035, desktop.matches ? 1.105 : 1.065],
                x: [index % 2 ? '-.7%' : '.7%', index % 2 ? '.7%' : '-.7%'],
                duration: 8300, ease: 'linear'
            }));
            heroJobs.push(play(scenes[index].querySelector('i'), { scaleX: [0, 1], duration: 7200, ease: 'linear' }));
        }
        scheduleHero();
    }

    const ambientObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
            const record = ambient.get(entry.target);
            if (!record) continue;
            record.visible = entry.isIntersecting;
            record.jobs.forEach(job => entry.isIntersecting && running() ? job.play() : job.pause());
        }
    });

    function addAmbient(element, makeJobs) {
        if (!element || ambient.has(element) || still()) return;
        const record = { jobs: makeJobs(), visible: false };
        record.jobs.forEach(job => job.pause());
        ambient.set(element, record);
        ambientObserver.observe(element);
    }

    function syncPlayback() {
        body.classList.toggle('motion-paused', still());
        const continuous = new Set([...heroJobs, ...[...ambient.values()].flatMap(record => record.jobs)]);
        jobs.forEach(job => {
            if (still() && !continuous.has(job)) job.complete();
            else if (running()) job.play();
            else job.pause();
        });
        if (still()) resetPointers();
        ambient.forEach(record => record.jobs.forEach(job => running() && record.visible ? job.play() : job.pause()));
        if (running() && heroVisible) scheduleHero(heroRemaining);
        else { freezeHero(); heroJobs.forEach(job => job.pause()); }
        syncLabels();
    }

    function clearScroll() {
        scrollJobs.forEach(job => job.revert());
        scrollJobs.clear();
    }

    function refresh(revealSelector = selector) {
        selector = revealSelector;
        if (!initialized) init();
        syncLabels();
        revealObserver.disconnect();
        pending = new Map();
        document.querySelectorAll(selector || '[data-motion-reveal]').forEach(element => once(element, () => {
            play(element, { opacity: [0, 1], y: [22, 0], duration: 820, ease: 'outQuint' });
        }));
        document.querySelectorAll('.section__head').forEach(head => once(head, () => {
            play(head.querySelectorAll('.eyebrow, h2, .lead'), {
                opacity: [0, 1], y: [24, 0], clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'],
                duration: 900, delay: stagger(90), ease: 'outQuint'
            });
            play(head, { '--rule-draw': [0, 1], duration: 1250, ease: 'outCubic' });
        }));
        document.querySelectorAll('.fleet__cat-media, .service__media, .nb__media').forEach(frame => {
            frame.classList.add('motion-image');
            once(frame, () => {
                play(frame, { '--image-cover': [1, 0], duration: 1150, ease: 'inOutQuart' });
                if (!desktop.matches || frame.matches('.service__media')) {
                    play(frame.querySelector('img'), { scale: [1.06, 1], duration: 1500, ease: 'outQuint' });
                }
            });
            if (desktop.matches && !still() && !scrollJobs.has(frame) && !frame.matches('.service__media')) {
                const scroller = onScroll({ target: frame, enter: 'bottom top', leave: 'top bottom', sync: true });
                scrollJobs.set(frame, animate(frame.querySelector('img'), {
                    y: [-10, 10], scale: [1.055, 1.055], ease: 'linear', autoplay: scroller
                }));
            }
        });
        scrollJobs.forEach((job, element) => {
            if (!element.isConnected) { job.revert(); scrollJobs.delete(element); }
        });
        document.querySelectorAll('.service__standards, .owners__grid').forEach(group => once(group, () => {
            play(group.children, { opacity: [0, 1], y: [10, 0], duration: 650, delay: stagger(60), ease: 'outCubic' });
        }));
        const cycle = document.querySelector('.safety-cycle__flow');
        once(cycle, () => {
            play(cycle, { '--flow-draw': [0, 1], duration: 1800, ease: 'inOutCubic' });
            play(cycle.querySelectorAll('.safety-cycle__num'), {
                '--step-halo': [0, 1], backgroundColor: ['#ffffff', '#e7f3f3'],
                duration: 700, delay: stagger(300), ease: 'outCubic'
            });
        });
        once(document.querySelector('.about__visual'), () => {
            play('.about__quote-line, .about__visual cite', {
                opacity: [0, 1], y: [20, 0], duration: 900, delay: stagger(140), ease: 'outQuint'
            });
        });
        addAmbient(document.querySelector('.about__visual'), () => [
            play('.about__visual', { '--chart-shift': ['0px', '52px'], duration: 30000, loop: true, ease: 'linear' })
        ]);
        if (!still()) bindPointers();
    }

    function bindPointers() {
        if (!desktop.matches) return;
        document.querySelectorAll('.hero__cta .btn, .kpi__card, .mv, .fleet__cat, .service, .why__item').forEach(element => {
            if (bound.has(element)) return;
            bound.add(element);
            const button = element.matches('.btn');
            if (!button) element.classList.add('motion-surface');
            element.addEventListener('pointermove', event => {
                if (still() || !desktop.matches) return;
                const rect = element.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                if (button) {
                    pointerJobs.get(element)?.cancel();
                    const job = animate(element, {
                        x: (x / rect.width - .5) * 6, y: (y / rect.height - .5) * 6,
                        duration: 250, ease: 'outCubic', onComplete: self => {
                            if (pointerJobs.get(element) === self) pointerJobs.delete(element);
                        }
                    });
                    pointerJobs.set(element, job);
                } else {
                    element.style.setProperty('--pointer-x', `${x}px`);
                    element.style.setProperty('--pointer-y', `${y}px`);
                    element.style.setProperty('--surface-light', '1');
                }
            });
            const reset = () => {
                pointerJobs.get(element)?.cancel();
                pointerJobs.delete(element);
                if (button) { element.style.removeProperty('transform'); }
                else { element.style.removeProperty('--surface-light'); }
            };
            element.addEventListener('pointerleave', reset);
            element.addEventListener('focus', reset);
        });
    }

    function resetPointers() {
        pointerJobs.forEach(job => job.cancel());
        pointerJobs.clear();
        document.querySelectorAll('.hero__cta .btn').forEach(button => button.style.removeProperty('transform'));
        document.querySelectorAll('.motion-surface').forEach(element => element.style.removeProperty('--surface-light'));
    }

    function init() {
        initialized = true;
        body.classList.add('has-company-motion');
        const heroObserver = new IntersectionObserver(([entry]) => {
            heroVisible = entry.isIntersecting;
            syncPlayback();
        });
        heroObserver.observe(hero);
        toggle.addEventListener('click', () => {
            userPaused = !userPaused;
            if (userPaused) clearScroll();
            syncPlayback();
            if (!userPaused) refresh();
        });
        scenes.forEach((button, i) => button.addEventListener('click', () => showSlide(i)));
        document.addEventListener('visibilitychange', syncPlayback);
        reduced.addEventListener('change', () => {
            freezeHero();
            slideRequest++;
            jobs.forEach(job => job.revert());
            jobs.clear();
            ambient.forEach(record => record.jobs.forEach(job => job.revert()));
            ambient.clear();
            ambientObserver.disconnect();
            clearScroll();
            heroJobs = [];
            refresh();
            showSlide(activeSlide, true);
            setupAtmosphere();
            syncPlayback();
        });
        desktop.addEventListener('change', () => { clearScroll(); resetPointers(); refresh(); });
        addEventListener('beforeprint', () => { printing = true; clearScroll(); syncPlayback(); });
        addEventListener('afterprint', () => { printing = false; refresh(); syncPlayback(); });
        setupAtmosphere();
        showSlide(0, true);
    }

    function setupAtmosphere() {
        addAmbient(document.querySelector('.hero__atmosphere'), () => [
            play('.hero__sea path', { strokeDashoffset: [0, -446], duration: 26000, delay: stagger(1000), loop: true, ease: 'linear' }),
            play('.hero__light', { x: ['-24%', '24%'], opacity: [0, .85, 0], duration: 14000, loop: true, ease: 'inOutSine' })
        ]);
    }

    function startIntro() {
        if (ready) return;
        ready = true;
        if (!initialized) init();
        if (still()) return;
        const intro = createTimeline({ defaults: { ease: 'outQuint' } });
        intro.add('.hero__eyebrow', { opacity: [0, 1], y: [12, 0], duration: 700 }, 0)
            .add('.hero__title > span', {
                opacity: [0, 1], y: [42, 0], clipPath: ['inset(0 0 100% 0)', 'inset(0 0 -8% 0)'],
                duration: 1150, delay: stagger(130)
            }, 100)
            .add('.hero__lead, .hero__cta', { opacity: [0, 1], y: [18, 0], duration: 900, delay: stagger(100) }, 430)
            .add('.hero__dock > a', { opacity: [0, 1], y: [16, 0], duration: 900, delay: stagger(80) }, 600);
        intro.onComplete = () => jobs.delete(intro);
        jobs.add(intro);
    }

    window.CompanyMotion = { refresh, ready: startIntro, isPaused: () => still() };
})();
