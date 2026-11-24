/*
 * Decorative background: faint mathematical curves behind the page content.
 * Self-contained: if this file is removed or throws, the rest of the site is unaffected.
 *
 * HOW TO EDIT
 *  - SETTINGS: global look (opacity, line width, colour).
 *  - SHAPES:   one entry per curve. Add, remove or change entries freely.
 *      type    : 'rose' | 'lissajous' | 'spirograph' | 'superformula' | 'spiral' | 'waves' | 'fresnel'
 *      anchor  : id of a section to place the shape in (e.g. 'about'), or 'page' for the whole page
 *      x, y    : position in % (x of the page width, y of the anchor's height; 0 = top, 100 = bottom)
 *      size    : diameter in px (shrinks automatically on small screens)
 *      rotate  : degrees (optional)
 *      opacity : overrides SETTINGS.opacity for this shape (optional)
 *      other keys are the parameters of the formula, listed next to each formula below.
 */

const BACKGROUND_SETTINGS = {
    opacity: 0.11,                  // 0 = invisible, 1 = fully visible
    strokeWidth: 1.1,               // line thickness in px
    color: 'var(--text-color)',     // any CSS colour; theme variables follow light/dark mode
    samples: 1400,                  // points per curve (smoothness)
};

const BACKGROUND_SHAPES = [
    { type: 'fresnel',      anchor: 'page',         x: 10, y: 1,  size: 280, zones: 10 },
    { type: 'rose',         anchor: 'about',        x: 91, y: 30, size: 210, n: 5, d: 3, rotate: 15 },
    { type: 'waves',        anchor: 'publications', x: 5,  y: 45, size: 360, lines: 6, cycles: 3, rotate: -18 },
    { type: 'spirograph',   anchor: 'projects',     x: 94, y: 55, size: 240, R: 7, r: 4, d: 6 },
    { type: 'superformula', anchor: 'experience',   x: 6,  y: 12, size: 180, m: 7, n1: 0.6, n2: 1.8, n3: 1.8 },
    { type: 'lissajous',    anchor: 'experience',   x: 94, y: 62, size: 190, a: 3, b: 4, delta: Math.PI / 2 },
    { type: 'spiral',       anchor: 'education',    x: 7,  y: 65, size: 230, b: 0.14, turns: 5 },
    { type: 'waves',        anchor: 'education',    x: 96, y: 15, size: 260, lines: 4, cycles: 2, rotate: 72 },
    { type: 'rose',         anchor: 'skills',       x: 92, y: 40, size: 150, n: 7, d: 4, rotate: 0 },
    { type: 'superformula', anchor: 'languages',    x: 9,  y: 70, size: 130, m: 5, n1: 2, n2: 7, n3: 7 },
];

/* ---------- Nothing below needs editing for normal use ---------- */

(function () {
    const TAU = Math.PI * 2;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);

    // Sample a parametric curve t -> [x, y] over [0, range].
    function curve(range, fn, samples) {
        const pts = [];
        for (let i = 0; i <= samples; i++) pts.push(fn((i / samples) * range));
        return pts;
    }

    // Each formula returns a list of polylines in arbitrary units; they are normalised to [-1, 1] later.
    const FORMULAS = {
        // Rose curve: r = cos(n/d * θ)
        rose: ({ n = 5, d = 3 }, s) =>
            [curve(TAU * d, t => { const r = Math.cos((n / d) * t); return [r * Math.cos(t), r * Math.sin(t)]; }, s)],

        // Lissajous figure: x = sin(a t + δ), y = sin(b t)
        lissajous: ({ a = 3, b = 4, delta = Math.PI / 2 }, s) =>
            [curve(TAU, t => [Math.sin(a * t + delta), Math.sin(b * t)], s)],

        // Hypotrochoid (spirograph): circle of radius r rolling inside radius R, pen at distance d
        spirograph: ({ R = 7, r = 4, d = 6 }, s) => {
            const k = (R - r) / r;
            return [curve(TAU * r / gcd(R, r), t =>
                [(R - r) * Math.cos(t) + d * Math.cos(k * t), (R - r) * Math.sin(t) - d * Math.sin(k * t)], s)];
        },

        // Gielis superformula: r(φ) = (|cos(mφ/4)|^n2 + |sin(mφ/4)|^n3)^(-1/n1)
        superformula: ({ m = 6, n1 = 1, n2 = 7, n3 = 8 }, s) =>
            [curve(TAU, t => {
                const r = Math.pow(Math.pow(Math.abs(Math.cos(m * t / 4)), n2) +
                                   Math.pow(Math.abs(Math.sin(m * t / 4)), n3), -1 / n1);
                return [r * Math.cos(t), r * Math.sin(t)];
            }, s)],

        // Logarithmic spiral: r = e^(bθ)
        spiral: ({ b = 0.15, turns = 5 }, s) =>
            [curve(TAU * turns, t => { const r = Math.exp(b * t); return [r * Math.cos(t), r * Math.sin(t)]; }, s)],

        // Parallel sine waves with shifting phase: y = A sin(2π·cycles·x + i·φ)
        waves: ({ lines = 5, cycles = 3, amplitude = 0.12, gap = 0.18, shift = 0.6 }, s) =>
            Array.from({ length: lines }, (_, i) => curve(2, x =>
                [x - 1, (i - (lines - 1) / 2) * gap + amplitude * Math.sin(Math.PI * cycles * x + i * shift)], s)),

        // Fresnel zones: concentric circles with radius ∝ √n
        fresnel: ({ zones = 10 }, s) =>
            Array.from({ length: zones }, (_, i) => {
                const r = Math.sqrt(i + 1);
                return curve(TAU, t => [r * Math.cos(t), r * Math.sin(t)], Math.ceil(s / 4));
            }),
    };

    function toPath(lines) {
        let max = 1e-9;
        lines.forEach(l => l.forEach(([x, y]) => { max = Math.max(max, Math.abs(x), Math.abs(y)); }));
        return lines.map(l => 'M' + l.map(([x, y]) => (x / max).toFixed(4) + ' ' + (y / max).toFixed(4)).join('L')).join('');
    }

    // Paths are computed once in unit coordinates; only their placement changes on resize.
    const shapes = BACKGROUND_SHAPES.map(cfg => {
        const formula = FORMULAS[cfg.type];
        if (!formula) { console.warn('background.js: unknown shape type', cfg.type); return null; }
        return { cfg, d: toPath(formula(cfg, BACKGROUND_SETTINGS.samples)) };
    }).filter(Boolean);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:-1;overflow:hidden;';
    svg.style.color = BACKGROUND_SETTINGS.color;

    // Radial fade so every shape dissolves into the page at its edges.
    svg.innerHTML =
        '<defs><radialGradient id="bg-fade-grad">' +
        '<stop offset="0.25" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
        '<mask id="bg-fade" maskContentUnits="objectBoundingBox">' +
        '<rect width="1" height="1" fill="url(#bg-fade-grad)"/></mask></defs><g id="bg-shapes"></g>';
    const group = svg.querySelector('#bg-shapes');

    function render() {
        const width = document.documentElement.clientWidth;
        const height = document.body.offsetHeight;
        const scale = Math.max(0.55, Math.min(1, width / 1200));
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.height = height + 'px';

        group.innerHTML = '';
        shapes.forEach(({ cfg, d }) => {
            const anchor = cfg.anchor && cfg.anchor !== 'page' ? document.getElementById(cfg.anchor) : null;
            const top = anchor ? anchor.getBoundingClientRect().top + window.scrollY : 0;
            const span = anchor ? anchor.offsetHeight : height;
            const cx = (cfg.x / 100) * width;
            const cy = top + (cfg.y / 100) * span;
            const half = ((cfg.size || 200) * scale) / 2;

            const g = document.createElementNS(SVG_NS, 'g');
            g.setAttribute('mask', 'url(#bg-fade)');
            g.setAttribute('opacity', cfg.opacity != null ? cfg.opacity : BACKGROUND_SETTINGS.opacity);
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('vector-effect', 'non-scaling-stroke');
            path.setAttribute('stroke-width', BACKGROUND_SETTINGS.strokeWidth);
            path.setAttribute('transform',
                `translate(${cx} ${cy}) rotate(${cfg.rotate || 0}) scale(${half})`);
            g.appendChild(path);
            group.appendChild(g);
        });
    }

    function start() {
        document.body.prepend(svg);
        render();
        // Re-place shapes whenever the layout changes size (fonts, images, window resize).
        new ResizeObserver(() => requestAnimationFrame(render)).observe(document.body);
        window.addEventListener('resize', () => requestAnimationFrame(render));
    }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
        else start();
    } catch (err) {
        console.warn('background.js disabled:', err);
    }
})();
