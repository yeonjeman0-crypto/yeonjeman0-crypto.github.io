/**
 * Inline SVG icon set — 1.6px stroke, round caps. Replaces Font Awesome.
 * Usage: window.icon('ship') → svg string, window.icon('ship', 'my-class')
 */
(function () {
    var P = {
        ship: '<path d="M3 17.5 4.2 13h15.6l1.2 4.5M5 13V8h14v5M9 8V5.5h6V8M12 3.5v2"/><path d="M2.5 20c1.6 1.2 3 1.2 4.7 0 1.6 1.2 3 1.2 4.7 0 1.6 1.2 3 1.2 4.7 0 1.6 1.2 3 1.2 4.7 0"/>',
        anchor: '<circle cx="12" cy="5.5" r="2.2"/><path d="M12 7.7V20M5 13c0 4 3.1 7 7 7s7-3 7-7M3.5 13H7M17 13h3.5"/>',
        shield: '<path d="M12 3.5 5 6v5.5c0 4.5 2.9 7.6 7 9 4.1-1.4 7-4.5 7-9V6l-7-2.5Z"/><path d="m9 11.8 2.1 2.2 3.9-4.2"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7"/>',
        users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.3"/><path d="M16.6 14.6c2.1.3 3.5 1.8 3.9 4.2"/>',
        award: '<circle cx="12" cy="9" r="5"/><path d="m9.3 13.2-1.4 7 4.1-2.4 4.1 2.4-1.4-7"/>',
        leaf: '<path d="M5 19c0-8 4.5-13 14-13.5C19 14 14 19 6.5 19H5Z"/><path d="M5 19c2.5-5.5 6-9 10.5-11"/>',
        globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.7 2.4 4 5.2 4 8.5s-1.3 6.1-4 8.5c-2.7-2.4-4-5.2-4-8.5s1.3-6.1 4-8.5Z"/>',
        scale: '<path d="M12 4v16M7 20h10M12 6.5 6 8m6-1.5L18 8"/><path d="M3.5 13.5 6 8l2.5 5.5c-.6 2.3-4.4 2.3-5 0ZM15.5 13.5 18 8l2.5 5.5c-.6 2.3-4.4 2.3-5 0Z"/>',
        'file-shield': '<path d="M14 3.5H6.5v17h11V8L14 3.5Z"/><path d="M14 3.5V8h3.5"/><path d="M12 10.5 9.5 11.5v2.2c0 1.8 1.1 3 2.5 3.6 1.4-.6 2.5-1.8 2.5-3.6v-2.2L12 10.5Z"/>',
        'hard-hat': '<path d="M4.5 16.5v-2c0-3.6 2.4-6.6 6-7.3M13.5 7.2c3.6.7 6 3.7 6 7.3v2"/><path d="M10.5 6.5h3V11h-3zM3 16.5h18v2.2H3z"/>',
        graduation: '<path d="m12 4.5 9.5 4L12 12.5l-9.5-4 9.5-4Z"/><path d="M6.5 10.5V15c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.5M21.5 8.5V14"/>',
        alert: '<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4M12 16.8v.4"/>',
        radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
        clipboard: '<rect x="5.5" y="5" width="13" height="16" rx="1.5"/><path d="M9 5a3 3 0 0 1 6 0M9 12l2.1 2.2L15 10"/>',
        tools: '<path d="M13.5 6.5 17 3c1.9.6 3.4 2.1 4 4l-3.5 3.5M13 7 4.5 15.5a2.2 2.2 0 0 0 0 3.1l.9.9a2.2 2.2 0 0 0 3.1 0L17 11"/>',
        hammer: '<path d="M14 5.5 8 11.5l-4.5 6a1.6 1.6 0 0 0 2.3 2.3l6-4.5 6-6"/><path d="m12 4 3-1.5 5.5 5.5L19 11l-7-7Z"/>',
        compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
        lifebuoy: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M6 6l3.4 3.4M18 6l-3.4 3.4M18 18l-3.4-3.4M6 18l3.4-3.4"/>',
        mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
        pin: '<path d="M12 21s-6.5-5.6-6.5-10.4a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10.4" r="2.3"/>',
        phone: '<path d="M7.5 4h3l1.2 4-2 1.5a11 11 0 0 0 4.8 4.8L16 12.3l4 1.2v3c0 1-.8 1.9-1.9 1.8C10.9 17.6 6.4 13.1 5.7 5.9 5.6 4.8 6.5 4 7.5 4Z"/>',
        printer: '<path d="M7 8V3.5h10V8M7 16.5H4.5v-6c0-1.4 1-2.5 2.4-2.5h10.2c1.4 0 2.4 1.1 2.4 2.5v6H17"/><rect x="7" y="14" width="10" height="6.5"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
        'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
        'arrow-up-right': '<path d="M7 17 17 7M9 7h8v8"/>',
        'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
        'chevron-up': '<path d="m6 14.5 6-6 6 6"/>',
        check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        building: '<rect x="5" y="4" width="14" height="16.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10.5 20.5V16h3v4.5"/>',
        external: '<path d="M14 4.5h5.5V10M19 5 11.5 12.5M9.5 6H6a1.5 1.5 0 0 0-1.5 1.5V18A1.5 1.5 0 0 0 6 19.5h10.5A1.5 1.5 0 0 0 18 18v-3.5"/>'
    };
    window.icon = function (name, cls) {
        var body = P[name] || P.compass;
        return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
    };
})();
