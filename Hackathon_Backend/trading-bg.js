/* ══════════════════════════════════════════════════════════
   trading-bg.js  —  MindVest Pro
   3D Neon Candlestick Animated Background
   Style: "3D Candlestick Chart Crypto 4K VJ Loop"
   Pure Canvas 2D with perspective projection — no libraries
   ══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────
       SETUP
    ───────────────────────────────────────────── */
    const canvas = document.getElementById('trading-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    /* ─────────────────────────────────────────────
       CONSTANTS
    ───────────────────────────────────────────── */
    const FOV = 700;
    const CAM_Y = -320;       // camera height (negative = above floor)
    const FLOOR_Y = 0;         // world Y of the reflective floor
    const DEPTH_MIN = 600;
    const DEPTH_MAX = 5000;
    const CANDLE_COUNT = 60;
    const CANDLE_SPACING = 160;  // world units between candles
    const COLS = 6;          // grid columns
    const SCROLL_SPEED = 80;     // world units per second (Z scroll)
    const BULL = { r: 0, g: 255, b: 140 };
    const BEAR = { r: 239, g: 68, b: 68 };
    const NEUTRAL = { r: 99, g: 102, b: 241 };

    /* ─────────────────────────────────────────────
       3-D PROJECTION
       Maps world (x,y,z) → screen (sx, sy, scale)
    ───────────────────────────────────────────── */
    function project(wx, wy, wz) {
        const dz = wz + FOV;
        if (dz <= 1) return null;
        const scale = FOV / dz;
        return {
            x: W / 2 + wx * scale,
            y: H / 2 + (wy - CAM_Y) * scale,
            s: scale,
        };
    }

    /* ─────────────────────────────────────────────
       CANDLE FACTORY
    ───────────────────────────────────────────── */
    function makeCandle(col, row, baseZ) {
        const open = 200 + Math.random() * 800;
        const close = open + (Math.random() - 0.46) * 300;
        const high = Math.max(open, close) + Math.random() * 120;
        const low = Math.min(open, close) - Math.random() * 80;
        const isUp = close >= open;
        return {
            col, row,                          // grid position
            wx: (col - (COLS - 1) / 2) * CANDLE_SPACING,
            wz: baseZ + row * CANDLE_SPACING,
            open, close, high, low, isUp,
            color: isUp ? BULL : (Math.random() > 0.15 ? BEAR : NEUTRAL),
            // animation
            riseOffset: Math.random() * Math.PI * 2,
            riseSpeed: 0.5 + Math.random() * 0.8,
            floatAmp: 6 + Math.random() * 10,
            floatSpeed: 0.3 + Math.random() * 0.5,
            birthT: 0,      // set on creation
            lifeState: 'rising', // rising → alive → fading
        };
    }

    function buildGrid() {
        const candles = [];
        const rows = Math.ceil(CANDLE_COUNT / COLS);
        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < rows; row++) {
                candles.push(makeCandle(col, row, DEPTH_MIN));
            }
        }
        return candles;
    }

    let candles = buildGrid();

    /* ─────────────────────────────────────────────
       COLOUR HELPERS
    ───────────────────────────────────────────── */
    function rgba(c, a) {
        return `rgba(${c.r},${c.g},${c.b},${a})`;
    }

    function hex(c) {
        return `rgb(${c.r},${c.g},${c.b})`;
    }

    /* ─────────────────────────────────────────────
       DRAW ONE NEON 3D CANDLE
    ───────────────────────────────────────────── */
    const PRICE_SCALE = 0.28;  // px-per-unit height in world space
    const BODY_HALF_W = 28;

    function drawCandle(c, t, scrollZ) {
        const wz = c.wz - scrollZ;
        if (wz < 20 || wz > DEPTH_MAX) return;   // behind or too far

        // float animation
        const floatY = Math.sin(t * c.floatSpeed + c.riseOffset) * c.floatAmp;

        // world heights (negative Y = upward)
        const bodyBot = FLOOR_Y - Math.min(c.open, c.close) * PRICE_SCALE + floatY;
        const bodyTop = FLOOR_Y - Math.max(c.open, c.close) * PRICE_SCALE + floatY;
        const wickTop = FLOOR_Y - c.high * PRICE_SCALE + floatY;
        const wickBot = FLOOR_Y - c.low * PRICE_SCALE + floatY;

        // project corners
        const pBBL = project(c.wx - BODY_HALF_W, bodyBot, wz);
        const pBBR = project(c.wx + BODY_HALF_W, bodyBot, wz);
        const pBTL = project(c.wx - BODY_HALF_W, bodyTop, wz);
        const pBTR = project(c.wx + BODY_HALF_W, bodyTop, wz);
        const pWT = project(c.wx, wickTop, wz);
        const pWB = project(c.wx, wickBot, wz);
        if (!pBBL || !pBTL || !pWT || !pWB) return;

        // ── depth-based fade ──
        const proximity = 1 - (wz - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN);
        const alpha = Math.min(1, proximity * 1.8 + 0.15);

        const col = c.color;
        const glowPx = pBBL.s * 18;

        // ── WICK ──
        const wickMidX = (pBTL.x + pBTR.x) / 2;
        ctx.save();
        ctx.shadowColor = rgba(col, 0.9);
        ctx.shadowBlur = glowPx * 0.6;
        ctx.strokeStyle = rgba(col, alpha * 0.9);
        ctx.lineWidth = Math.max(1, pBBL.s * 3);
        ctx.beginPath();
        ctx.moveTo(wickMidX, pWT.y);
        ctx.lineTo(wickMidX, pWB.y);
        ctx.stroke();
        ctx.restore();

        // ── BODY FILL ──
        const bodyH = Math.abs(pBTL.y - pBBL.y);
        if (bodyH < 0.5) return;                  // too small to draw

        ctx.save();
        ctx.shadowColor = rgba(col, 0.8);
        ctx.shadowBlur = glowPx;

        // vertical gradient for neon depth
        const grad = ctx.createLinearGradient(0, pBTL.y, 0, pBBL.y);
        grad.addColorStop(0, rgba(col, alpha * 0.95));
        grad.addColorStop(0.5, rgba(col, alpha * 0.6));
        grad.addColorStop(1, rgba(col, alpha * 0.2));
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(pBTL.x, pBTL.y);
        ctx.lineTo(pBTR.x, pBTR.y);
        ctx.lineTo(pBBR.x, pBBR.y);
        ctx.lineTo(pBBL.x, pBBL.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ── BODY OUTLINE (neon edge) ──
        ctx.save();
        ctx.shadowColor = rgba(col, 1);
        ctx.shadowBlur = glowPx * 1.2;
        ctx.strokeStyle = rgba(col, alpha);
        ctx.lineWidth = Math.max(0.8, pBBL.s * 2);
        ctx.beginPath();
        ctx.moveTo(pBTL.x, pBTL.y);
        ctx.lineTo(pBTR.x, pBTR.y);
        ctx.lineTo(pBBR.x, pBBR.y);
        ctx.lineTo(pBBL.x, pBBL.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // ── TOP EDGE extra glow ──
        ctx.save();
        ctx.shadowColor = rgba(col, 1);
        ctx.shadowBlur = glowPx * 0.8;
        ctx.strokeStyle = rgba(col, alpha * 0.7);
        ctx.lineWidth = Math.max(0.5, pBBL.s * 1.5);
        ctx.beginPath();
        ctx.moveTo(pBTL.x, pBTL.y);
        ctx.lineTo(pBTR.x, pBTR.y);
        ctx.stroke();
        ctx.restore();

        // ── FLOOR REFLECTION ──
        const pFBL = project(c.wx - BODY_HALF_W, -bodyBot, wz);
        const pFBR = project(c.wx + BODY_HALF_W, -bodyBot, wz);
        const pFTL = project(c.wx - BODY_HALF_W, -bodyTop, wz);
        const pFTR = project(c.wx + BODY_HALF_W, -bodyTop, wz);
        if (pFBL && pFTL) {
            ctx.save();
            ctx.globalAlpha = 0.08 * alpha;
            ctx.fillStyle = rgba(col, 1);
            ctx.beginPath();
            ctx.moveTo(pFTL.x, pFTL.y);
            ctx.lineTo(pFTR.x, pFTR.y);
            ctx.lineTo(pFBR.x, pFBR.y);
            ctx.lineTo(pFBL.x, pFBL.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    /* ─────────────────────────────────────────────
       REFLECTIVE GRID FLOOR
    ───────────────────────────────────────────── */
    function drawFloor(scrollZ) {
        const rows = 30, cols2 = 20;
        const cellW = CANDLE_SPACING, cellD = CANDLE_SPACING;
        const floorX0 = -(cols2 / 2) * cellW;
        const floorZ0 = (scrollZ % cellD);

        ctx.save();
        ctx.lineWidth = 0.5;

        // Vertical lines (columns)
        for (let c = 0; c <= cols2; c++) {
            const wx = floorX0 + c * cellW;
            const p1 = project(wx, FLOOR_Y, floorZ0);
            const p2 = project(wx, FLOOR_Y, floorZ0 + rows * cellD);
            if (!p1 || !p2) continue;
            const major = c % 4 === 0;
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, `rgba(0,255,140,${major ? 0.15 : 0.04})`);
            grad.addColorStop(0.5, `rgba(0,255,140,${major ? 0.06 : 0.02})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }

        // Horizontal lines (rows)
        for (let r = 0; r <= rows; r++) {
            const wz = floorZ0 + r * cellD;
            const p1 = project(floorX0, FLOOR_Y, wz);
            const p2 = project(-floorX0, FLOOR_Y, wz);
            if (!p1 || !p2) continue;
            const fade = 1 - r / rows;
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.5, `rgba(99,102,241,${0.1 * fade})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }

        ctx.restore();
    }

    /* ─────────────────────────────────────────────
       AMBIENT BACKGROUND GLOW
    ───────────────────────────────────────────── */
    function drawBackground() {
        // deep dark base
        ctx.fillStyle = '#060810';
        ctx.fillRect(0, 0, W, H);

        // center horizon glow (green)
        const horizY = H / 2 + 40;
        const g1 = ctx.createRadialGradient(W / 2, horizY, 0, W / 2, horizY, W * 0.6);
        g1.addColorStop(0, 'rgba(0,255,140,0.07)');
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

        // left purple blob
        const g2 = ctx.createRadialGradient(W * 0.1, H * 0.3, 0, W * 0.1, H * 0.3, W * 0.4);
        g2.addColorStop(0, 'rgba(99,102,241,0.1)');
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

        // right teal blob
        const g3 = ctx.createRadialGradient(W * 0.9, H * 0.7, 0, W * 0.9, H * 0.7, W * 0.35);
        g3.addColorStop(0, 'rgba(0,200,180,0.07)');
        g3.addColorStop(1, 'transparent');
        ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
    }

    /* ─────────────────────────────────────────────
       MATRIX-STYLE FALLING TICKER DATA
    ───────────────────────────────────────────── */
    const TICK_CHARS = '0123456789.%₹▲▼+-';
    const matrixCols = [];
    function initMatrix() {
        matrixCols.length = 0;
        const ncols = Math.ceil(W / 20);
        for (let i = 0; i < ncols; i++) {
            matrixCols.push({
                x: i * 20 + 10,
                y: Math.random() * H,
                speed: 0.5 + Math.random() * 1.2,
                alpha: 0.04 + Math.random() * 0.06,
            });
        }
    }
    initMatrix();
    window.addEventListener('resize', initMatrix);

    function drawMatrix() {
        ctx.font = '12px "JetBrains Mono", monospace';
        matrixCols.forEach(col => {
            const ch = TICK_CHARS[Math.floor(Math.random() * TICK_CHARS.length)];
            ctx.fillStyle = `rgba(0,255,140,${col.alpha})`;
            ctx.fillText(ch, col.x, col.y);
            col.y += col.speed * 2;
            if (col.y > H) col.y = 0;
        });
    }

    /* ─────────────────────────────────────────────
       FLOATING PRICE LABELS
    ───────────────────────────────────────────── */
    const LABELS = [
        'RELIANCE  ▲ +1.84%', 'TCS  ▼ -0.51%',
        'NIFTY 50  ▲ +1.2%', 'SENSEX  ▼ -0.3%',
        'GOLD  ▲ +0.8%', 'HDFC  ▲ +2.1%',
        'INFY  ▲ +0.9%', 'WIPRO  ▼ -1.2%',
        'BTC  ▲ +3.4%', 'ETH  ▲ +2.1%',
    ];

    const floaters = LABELS.map((lbl, i) => ({
        label: lbl,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.4),
        alpha: 0.25 + Math.random() * 0.4,
        color: lbl.includes('▲') ? '#00ff8c' : '#ef4444',
        size: 11 + Math.random() * 4,
    }));

    function drawFloaters() {
        floaters.forEach(f => {
            f.x += f.vx; f.y += f.vy;
            if (f.y < -20) { f.y = H + 20; f.x = Math.random() * W; }
            ctx.font = `${f.size}px "JetBrains Mono", monospace`;
            ctx.globalAlpha = f.alpha;
            ctx.fillStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 6;
            ctx.fillText(f.label, f.x, f.y);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        });
    }

    /* ─────────────────────────────────────────────
       VIGNETTE OVERLAY
    ───────────────────────────────────────────── */
    function drawVignette() {
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
        v.addColorStop(0, 'transparent');
        v.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    }

    /* ─────────────────────────────────────────────
       HORIZONTAL SCAN LINE (cinematic)
    ───────────────────────────────────────────── */
    let scanY = 0;
    function drawScanLine(t) {
        scanY = (H / 2) + Math.sin(t * 0.15) * (H * 0.45);
        const sl = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
        sl.addColorStop(0, 'transparent');
        sl.addColorStop(0.5, 'rgba(0,255,140,0.04)');
        sl.addColorStop(1, 'transparent');
        ctx.fillStyle = sl;
        ctx.fillRect(0, scanY - 2, W, 4);
    }

    /* ─────────────────────────────────────────────
       MAIN RENDER LOOP
    ───────────────────────────────────────────── */
    let t = 0;
    let scrollZ = 0;
    let lastTs = null;

    function loop(ts) {
        // Pause when dashboard is open (save CPU)
        const authEl = document.getElementById('auth-screen');
        if (authEl && authEl.classList.contains('hidden')) {
            requestAnimationFrame(loop);
            return;
        }

        const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
        lastTs = ts;
        t += dt;
        scrollZ += SCROLL_SPEED * dt;

        // recycle candles that scrolled past camera
        candles.forEach(c => {
            if (c.wz - scrollZ < -200) {
                // move to back
                c.wz += CANDLE_COUNT / COLS * CANDLE_SPACING;
                // randomise new candle data
                const open = 200 + Math.random() * 800;
                const close = open + (Math.random() - 0.46) * 300;
                c.open = open; c.close = close;
                c.high = Math.max(open, close) + Math.random() * 120;
                c.low = Math.min(open, close) - Math.random() * 80;
                c.isUp = close >= open;
                c.color = c.isUp ? BULL : (Math.random() > 0.15 ? BEAR : NEUTRAL);
                c.riseOffset = Math.random() * Math.PI * 2;
                c.floatAmp = 6 + Math.random() * 10;
            }
        });

        // ── COMPOSITE ──
        drawBackground();
        drawMatrix();
        drawScanLine(t);
        drawFloor(scrollZ);

        // sort candles back→front for correct transparency
        const sorted = [...candles].sort((a, b) => (b.wz - scrollZ) - (a.wz - scrollZ));
        sorted.forEach(c => drawCandle(c, t, scrollZ));

        drawFloaters();
        drawVignette();

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

})();
