/*══════════════════════════════════════════════
   MindVest – Main Application Logic
   ══════════════════════════════════════════════ */

/* ── State ── */
const State = {
    user: null,
    token: null,
    riskProfile: 'Moderate',
    quizScore: 0,
    quizIndex: 0,
    quizStreak: 0,
    holdings: [
        { symbol: 'RELIANCE', company: 'Reliance Industries', sector: 'Energy', qty: 20, avgPrice: 2750, cmp: 2890 },
        { symbol: 'TCS', company: 'Tata Consultancy', sector: 'IT', qty: 10, avgPrice: 3700, cmp: 3621 },
        { symbol: 'INFY', company: 'Infosys', sector: 'IT', qty: 30, avgPrice: 1480, cmp: 1543 },
        { symbol: 'HDFC', company: 'HDFC Bank', sector: 'Banking', qty: 15, avgPrice: 1650, cmp: 1720 },
        { symbol: 'TATAMOTORS', company: 'Tata Motors', sector: 'Auto', qty: 25, avgPrice: 840, cmp: 912 },
    ],
    predHorizon: '1D',
    chartType: 'line',
    showNewsOverlay: true,
    showMA: true,
    activeTimeframe: '1D',
    charts: {},
    newsData: [],
    allHoldings: [],
};

/* ══════════════════════════════════════════════
   ALPHA VANTAGE API CONFIG
   ══════════════════════════════════════════════ */
const API_CONFIG = {
    // 🔑 Paste your free Alpha Vantage key here → https://www.alphavantage.co/support/#api-key
    KEY: 'YOUR_API_KEY_HERE',
    BASE: 'https://www.alphavantage.co/query',
    // Map our symbol names to Alpha Vantage BSE symbols
    SYMBOL_MAP: {
        RELIANCE: 'RELIANCE.BSE',
        TCS: 'TCS.BSE',
        INFY: 'INFY.BSE',
        HDFC: 'HDFCBANK.BSE',
        WIPRO: 'WIPRO.BSE',
        TATAMOTORS: 'TATAMOTORS.BSE',
    }
};

// In-memory cache so we don't burn through 25 free requests/day
const API_CACHE = {};

/**
 * Fetch intraday (5min) or daily data from Alpha Vantage.
 * Returns { labels: [], prices: [] } or null on error.
 */
async function fetchAlphaVantage(symbol, timeframe) {
    const avSymbol = API_CONFIG.SYMBOL_MAP[symbol] || symbol + '.BSE';
    const cacheKey = `${avSymbol}_${timeframe}`;

    // Return cached data if it's less than 5 minutes old
    if (API_CACHE[cacheKey] && Date.now() - API_CACHE[cacheKey].ts < 5 * 60 * 1000) {
        return API_CACHE[cacheKey].data;
    }

    try {
        let url, seriesKey, count;
        if (timeframe === '1D') {
            url = `${API_CONFIG.BASE}?function=TIME_SERIES_INTRADAY&symbol=${avSymbol}&interval=5min&apikey=${API_CONFIG.KEY}`;
            seriesKey = 'Time Series (5min)';
            count = 20;
        } else if (timeframe === '1W') {
            url = `${API_CONFIG.BASE}?function=TIME_SERIES_DAILY&symbol=${avSymbol}&apikey=${API_CONFIG.KEY}`;
            seriesKey = 'Time Series (Daily)';
            count = 7;
        } else if (timeframe === '1M') {
            url = `${API_CONFIG.BASE}?function=TIME_SERIES_DAILY&symbol=${avSymbol}&apikey=${API_CONFIG.KEY}`;
            seriesKey = 'Time Series (Daily)';
            count = 30;
        } else {
            url = `${API_CONFIG.BASE}?function=TIME_SERIES_WEEKLY&symbol=${avSymbol}&apikey=${API_CONFIG.KEY}`;
            seriesKey = 'Weekly Time Series';
            count = timeframe === '3M' ? 13 : 52;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (json['Note'] || json['Information']) {
            console.warn('Alpha Vantage rate limit hit — using mock data');
            return null;
        }

        const series = json[seriesKey];
        if (!series) return null;

        const entries = Object.entries(series).slice(0, count).reverse();
        const labels = entries.map(([t]) => timeframe === '1D' ? t.split(' ')[1].slice(0, 5) : t.slice(5));
        const prices = entries.map(([, v]) => parseFloat(v['4. close']));

        const result = { labels, prices };
        API_CACHE[cacheKey] = { data: result, ts: Date.now() };
        return result;
    } catch (err) {
        console.error('Alpha Vantage fetch error:', err);
        return null;
    }
}

/* ══════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════ */
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    if (!email || !pass) { showToast('Please fill all fields', 'error'); return; }
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.' + btoa(email);
    localStorage.setItem('mindvest_token', token);
    localStorage.setItem('mindvest_user', email.split('@')[0]);
    State.token = token;
    State.user = email.split('@')[0];
    bootApp();
}

function handleWeb3Login() {
    showToast('🦊 Connecting MetaMask wallet…', 'info');
    setTimeout(() => {
        State.token = 'web3_mock_token';
        State.user = 'Web3User';
        localStorage.setItem('mindvest_token', State.token);
        localStorage.setItem('mindvest_user', State.user);
        bootApp();
    }, 1200);
}

function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    if (!name || !email || !pass) { showToast('Please fill all fields', 'error'); return; }
    showToast('Account created! Please sign in.', 'success');
    showLogin();
}

function handleLogout() {
    localStorage.removeItem('mindvest_token');
    localStorage.removeItem('mindvest_user');
    State.token = null;
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    showToast('Logged out successfully', 'info');
}

function showLogin() { document.getElementById('auth-form-login').classList.remove('hidden'); document.getElementById('auth-form-register').classList.add('hidden'); }
function showRegister() { document.getElementById('auth-form-register').classList.remove('hidden'); document.getElementById('auth-form-login').classList.add('hidden'); }

function bootApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    const initials = State.user.substring(0, 2).toUpperCase();
    document.getElementById('user-avatar').textContent = initials;
    document.getElementById('nav-username').textContent = State.user;
    // Properly initialize tabs — remove hidden from dashboard, add to all others
    switchTab('dashboard');
    initDashboard();
    initPortfolioCharts();
    initPredictionChart();
    initSentimentChart();
    initAdvisorChart();
    renderHoldings();
    loadQuiz();
    loadNewsItems();
    loadSentimentStocks();
    showToast(`Welcome back, ${State.user}! 🚀`, 'success');
}

/* ══════════════════════════════════════════════
   TAB NAVIGATION
   ══════════════════════════════════════════════ */
function switchTab(name) {
    document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });
    const target = document.getElementById('tab-' + name);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('nav-' + name);
    if (btn) btn.classList.add('active');
    if (name === 'portfolio') refreshPortfolioKPIs();
    if (name === 'advisor') refreshFlowPanel();
}

/* ══════════════════════════════════════════════
   DASHBOARD – MAIN CHART
   ══════════════════════════════════════════════ */
const STOCK_DATA = {
    RELIANCE: { price: 2890, change: '+52.20', pct: '+1.84%', dir: 'positive', data: [2650, 2680, 2710, 2740, 2700, 2760, 2810, 2840, 2890, 2870, 2890] },
    TCS: { price: 3621, change: '-18.50', pct: '-0.51%', dir: 'negative', data: [3700, 3720, 3690, 3680, 3710, 3695, 3660, 3640, 3630, 3625, 3621] },
    INFY: { price: 1543, change: '+13.80', pct: '+0.90%', dir: 'positive', data: [1480, 1495, 1510, 1520, 1505, 1515, 1528, 1535, 1542, 1540, 1543] },
    HDFC: { price: 1720, change: '+35.50', pct: '+2.11%', dir: 'positive', data: [1640, 1655, 1668, 1679, 1670, 1685, 1695, 1704, 1710, 1716, 1720] },
    WIPRO: { price: 456, change: '-5.50', pct: '-1.19%', dir: 'negative', data: [480, 475, 468, 462, 470, 465, 460, 458, 457, 456, 456] },
    TATAMOTORS: { price: 912, change: '+30.00', pct: '+3.41%', dir: 'positive', data: [820, 838, 852, 868, 860, 875, 888, 895, 905, 908, 912] },
};

const LABELS_MAP = {
    '1D': ['9:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:00', '15:15', '15:30'],
    '1W': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    '1M': ['Week1', 'Week2', 'Week3', 'Week4'],
    '3M': ['Jan', 'Feb', 'Mar'],
    '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

let currentStock = 'RELIANCE';

function initDashboard() {
    drawRiskGauge('Moderate');
    updateChartInfo(currentStock);
    buildMainChart('line');
}

function buildChartData(symbol, tf) {
    const sd = STOCK_DATA[symbol];
    const labels = LABELS_MAP[tf] || LABELS_MAP['1D'];
    const data = generatePriceData(sd.data, labels.length);
    const ma = calcMA(data, 3);
    const newsPoints = State.showNewsOverlay ? generateNewsAnnotations(labels, data) : [];

    const datasets = [{
        label: symbol,
        data,
        borderColor: '#00ff99',
        backgroundColor: function (context) {
            const chart = context.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'rgba(0,255,153,0.15)';
            return createGradient(c, '#00ff99', 0.3, 0);
        },
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: true,
    }];

    if (State.showMA) {
        datasets.push({
            label: 'MA(20)',
            data: ma,
            borderColor: 'rgba(99,102,241,0.8)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.4,
            pointRadius: 0,
            fill: false,
        });
    }

    // News overlay points
    if (State.showNewsOverlay) {
        datasets.push({
            label: 'News Impact',
            data: newsPoints,
            borderColor: 'transparent',
            backgroundColor: ctx => {
                if (ctx.raw === null) return 'transparent';
                return ctx.raw.sentiment === 'positive' ? 'rgba(0,255,153,0.9)' : 'rgba(239,68,68,0.9)';
            },
            pointRadius: ctx => ctx.raw === null ? 0 : 7,
            pointStyle: 'circle',
            fill: false,
            tension: 0,
            showLine: false,
        });
    }

    return { labels, datasets };
}

function generatePriceData(base, count) {
    const arr = [...base];
    while (arr.length < count) {
        const last = arr[arr.length - 1];
        arr.push(+(last + (Math.random() - 0.48) * last * 0.012).toFixed(2));
    }
    return arr.slice(0, count);
}

function generateNewsAnnotations(labels, prices) {
    return prices.map((p, i) => {
        if (i === 2) return { x: labels[i], y: p, sentiment: 'positive' };
        if (i === 7) return { x: labels[i], y: p, sentiment: 'negative' };
        return null;
    });
}

function calcMA(data, period) {
    return data.map((_, i) => {
        if (i < period - 1) return null;
        const slice = data.slice(i - period + 1, i + 1);
        return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(2);
    });
}

function createGradient(ctx, hexColor, alpha1 = 0.3, alpha2 = 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    // Convert hex to rgba
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha1})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},${alpha2})`);
    return grad;
}

function buildChartOptions() {
    return {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1e2e',
                borderColor: '#252a3d',
                borderWidth: 1,
                titleColor: '#e8eaf0',
                bodyColor: '#8892a4',
                padding: 10,
                callbacks: {
                    label: ctx => {
                        if (ctx.dataset.label === 'News Impact') return null;
                        return ` ₹${ctx.parsed.y}`;
                    }
                }
            },
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 10 }, callback: v => '₹' + v } },
        },
    };
}

function loadStock(symbol) {
    currentStock = symbol;
    updateChartInfo(symbol);
    buildMainChart(State.chartType);
    document.querySelectorAll('.watch-item').forEach(el => {
        el.style.background = el.querySelector('.watch-symbol').textContent === symbol ? 'var(--bg-card)' : '';
    });
}

function updateChartInfo(symbol) {
    const sd = STOCK_DATA[symbol];
    document.getElementById('chart-symbol-name').textContent = symbol;
    document.getElementById('chart-price').textContent = '₹' + sd.price.toLocaleString('en-IN');
    const el = document.getElementById('chart-change');
    el.textContent = (sd.dir === 'positive' ? '▲ +' : '▼ ') + sd.change + ' (' + sd.pct + ')';
    el.className = 'chart-price-change ' + sd.dir;
}

function setTimeframe(tf, btn) {
    State.activeTimeframe = tf;
    document.querySelectorAll('.timeframe-btns .tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildMainChart(State.chartType);
}

function generateOHLC(stockData, tf) {
    const prices = generatePriceData(stockData.data, (LABELS_MAP[tf] || LABELS_MAP['1D']).length);
    const labels = LABELS_MAP[tf] || LABELS_MAP['1D'];
    return prices.map((close, i) => {
        const open = i === 0 ? close * 0.998 : prices[i - 1];
        const swing = close * 0.008;
        const high = Math.max(open, close) + swing * Math.random();
        const low = Math.min(open, close) - swing * Math.random();
        return { x: labels[i], o: +open.toFixed(2), h: +high.toFixed(2), l: +low.toFixed(2), c: +close.toFixed(2) };
    });
}

function setChartType(type, btn) {
    State.chartType = type;
    document.querySelectorAll('.chart-tools .tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildMainChart(type);
}

async function buildMainChart(type) {
    // Destroy existing chart cleanly
    if (State.charts.main) {
        State.charts.main.destroy();
        State.charts.main = null;
    }
    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ── Try Alpha Vantage API if key is set ──
    let realLabels = null, realPrices = null;
    if (API_CONFIG.KEY && API_CONFIG.KEY !== 'YOUR_KEY' && type !== 'candlestick') {
        showToast('📡 Fetching live data…', 'info');
        const apiData = await fetchAlphaVantage(currentStock, State.activeTimeframe);
        if (apiData && apiData.prices.length > 0) {
            realLabels = apiData.labels;
            realPrices = apiData.prices;
            // Update price info from real data
            const lastPrice = realPrices[realPrices.length - 1];
            const prevPrice = realPrices[realPrices.length - 2] || lastPrice;
            const change = (lastPrice - prevPrice).toFixed(2);
            const pct = ((lastPrice - prevPrice) / prevPrice * 100).toFixed(2);
            const dir = change >= 0 ? 'positive' : 'negative';
            document.getElementById('chart-price').textContent = '₹' + lastPrice.toLocaleString('en-IN');
            const el = document.getElementById('chart-change');
            el.textContent = (dir === 'positive' ? '▲ +' : '▼ ') + change + ' (' + pct + '%)';
            el.className = 'chart-price-change ' + dir;
            showToast('✅ Live data loaded for ' + currentStock, 'success');
        } else {
            showToast('⚠️ Using mock data (API limit or error)', 'info');
        }
    }

    if (type === 'candlestick') {
        const ohlcData = generateOHLC(STOCK_DATA[currentStock], State.activeTimeframe);
        const labels = LABELS_MAP[State.activeTimeframe] || LABELS_MAP['1D'];
        State.charts.main = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: currentStock,
                    data: ohlcData,
                    color: { up: '#00ff99', down: '#ef4444', unchanged: '#f59e0b' },
                    borderColor: { up: '#00ff99', down: '#ef4444', unchanged: '#f59e0b' },
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { type: 'category', labels, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5568', font: { size: 10 }, callback: v => '₹' + v } }
                }
            }
        });
    } else if (realLabels && realPrices) {
        // ── Real API data chart ──
        const ma = calcMA(realPrices, 5);
        const datasets = [{
            label: currentStock,
            data: realPrices,
            borderColor: '#00ff99',
            backgroundColor: function (context) {
                const chart = context.chart;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return 'rgba(0,255,153,0.15)';
                return createGradient(c, '#00ff99', 0.3, 0);
            },
            borderWidth: 2, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, fill: true,
        }];
        if (State.showMA) datasets.push({
            label: 'MA(5)', data: ma,
            borderColor: 'rgba(99,102,241,0.8)', borderWidth: 1.5,
            borderDash: [4, 4], tension: 0.4, pointRadius: 0, fill: false,
        });
        State.charts.main = new Chart(ctx, {
            type: type === 'bar' ? 'bar' : 'line',
            data: { labels: realLabels, datasets },
            options: buildChartOptions(),
        });
    } else {
        // ── Mock data fallback ──
        State.charts.main = new Chart(ctx, {
            type: type === 'bar' ? 'bar' : 'line',
            data: buildChartData(currentStock, State.activeTimeframe),
            options: buildChartOptions(),
        });
    }
}

function toggleNewsOverlay() {
    State.showNewsOverlay = document.getElementById('toggle-news-overlay').checked;
    document.getElementById('news-overlay-legend').style.opacity = State.showNewsOverlay ? '1' : '0.3';
    buildMainChart(State.chartType);
}

function toggleMA() {
    State.showMA = document.getElementById('toggle-ma').checked;
    buildMainChart(State.chartType);
}


/* ── Risk Gauge ── */
function drawRiskGauge(level) {
    const canvas = document.getElementById('risk-gauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const levels = { Conservative: 0.2, Moderate: 0.5, Aggressive: 0.85 };
    const ratio = levels[level] || 0.5;
    const cx = 80, cy = 80, r = 55;
    const startAngle = Math.PI, endAngle = 2 * Math.PI;
    const fillEnd = startAngle + ratio * Math.PI;

    ctx.clearRect(0, 0, 160, 95);
    // Track
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineCap = 'round'; ctx.stroke();
    // Fill
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, '#00ff99'); grad.addColorStop(0.5, '#f59e0b'); grad.addColorStop(1, '#ef4444');
    ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, fillEnd);
    ctx.strokeStyle = grad; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();
    // Needle
    const angle = startAngle + ratio * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 45 * Math.cos(angle), cy + 45 * Math.sin(angle));
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();

    document.getElementById('gauge-risk-label').textContent = level;
    document.getElementById('gauge-value') && (document.getElementById('gauge-value').textContent = level);
}

/* ══════════════════════════════════════════════
   PORTFOLIO
   ══════════════════════════════════════════════ */
function renderHoldings(filter = '') {
    State.allHoldings = [...State.holdings];
    const tbody = document.getElementById('holdings-tbody');
    const totalVal = State.holdings.reduce((s, h) => s + h.qty * h.cmp, 0);
    tbody.innerHTML = '';
    State.holdings
        .filter(h => !filter || h.symbol.includes(filter.toUpperCase()) || h.company.toLowerCase().includes(filter.toLowerCase()))
        .forEach(h => {
            const pnl = (h.cmp - h.avgPrice) * h.qty;
            const pnlPct = ((h.cmp - h.avgPrice) / h.avgPrice * 100).toFixed(1);
            const val = h.qty * h.cmp;
            const alloc = ((val / totalVal) * 100).toFixed(1);
            const sign = pnl >= 0 ? '+' : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
        <td><span class="stock-sym">${h.symbol}</span></td>
        <td style="color:var(--text-secondary)">${h.company}</td>
        <td><span style="background:var(--accent-purple-dim);color:var(--accent-purple);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">${h.sector}</span></td>
        <td>${h.qty}</td>
        <td style="font-family:var(--font-mono)">₹${h.avgPrice.toLocaleString('en-IN')}</td>
        <td style="font-family:var(--font-mono)">₹${h.cmp.toLocaleString('en-IN')}</td>
        <td class="${pnl >= 0 ? 'positive' : 'negative'}" style="font-family:var(--font-mono)">${sign}₹${Math.abs(pnl).toLocaleString('en-IN')} <span style="font-size:10px">(${sign}${pnlPct}%)</span></td>
        <td>
          <div class="alloc-bar-wrap">
            <span style="font-size:11px;font-weight:700">${alloc}%</span>
            <div class="alloc-bar"><div class="alloc-fill" style="width:${alloc}%"></div></div>
          </div>
        </td>
        <td><button class="delete-btn" onclick="removeHolding('${h.symbol}')">Remove</button></td>
      `;
            tbody.appendChild(tr);
        });
}

function filterHoldings(val) { renderHoldings(val); }

function refreshPortfolioKPIs() {
    const total = State.holdings.reduce((s, h) => s + h.qty * h.cmp, 0);
    const invested = State.holdings.reduce((s, h) => s + h.qty * h.avgPrice, 0);
    const pnl = total - invested;
    document.getElementById('p-total-value').textContent = '₹' + total.toLocaleString('en-IN');
    document.getElementById('p-invested').textContent = '₹' + invested.toLocaleString('en-IN');
    document.getElementById('p-pnl').textContent = (pnl >= 0 ? '+' : '') + '₹' + Math.abs(pnl).toLocaleString('en-IN');
    document.getElementById('p-pnl').className = pnl >= 0 ? 'positive' : 'negative';
    document.getElementById('kpi-portfolio').textContent = '₹' + total.toLocaleString('en-IN');
    updateAllocationChart();
}

function initPortfolioCharts() {
    // Allocation Pie
    const labels = [...new Set(State.holdings.map(h => h.sector))];
    const vals = labels.map(s => State.holdings.filter(h => h.sector === s).reduce((a, h) => a + h.qty * h.cmp, 0));
    const colors = ['#6366f1', '#00ff99', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
    State.charts.alloc = new Chart(document.getElementById('allocation-chart'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: '#13161f' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', font: { size: 11 }, padding: 10 } } }, cutout: '65%' },
    });

    // Performance Line
    State.charts.perfChart = new Chart(document.getElementById('portfolio-perf-chart'), {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Portfolio Value',
                data: [140000, 145000, 138000, 152000, 158000, 155000, 162000, 168000, 172000, 176000, 180000, 184250],
                borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 9 }, callback: v => '₹' + v.toLocaleString('en-IN') } },
            }
        },
    });
    refreshPortfolioKPIs();
}

function updateAllocationChart() {
    if (!State.charts.alloc) return;
    const labels = [...new Set(State.holdings.map(h => h.sector))];
    const vals = labels.map(s => State.holdings.filter(h => h.sector === s).reduce((a, h) => a + h.qty * h.cmp, 0));
    State.charts.alloc.data.labels = labels;
    State.charts.alloc.data.datasets[0].data = vals;
    State.charts.alloc.update();
}

// Modal
function openAddStockModal() { document.getElementById('add-stock-modal').classList.remove('hidden'); }
function closeAddStockModal() { document.getElementById('add-stock-modal').classList.add('hidden'); }

function addHolding() {
    const sym = document.getElementById('stock-symbol-select').value;
    const qty = parseInt(document.getElementById('stock-qty').value);
    const buyPrice = parseFloat(document.getElementById('stock-buy-price').value);
    if (!qty || !buyPrice || qty < 1) { showToast('Please fill all fields correctly', 'error'); return; }
    const existing = State.holdings.find(h => h.symbol === sym);
    if (existing) {
        existing.qty += qty;
        existing.avgPrice = ((existing.avgPrice * existing.qty + buyPrice * qty) / (existing.qty + qty)).toFixed(0) * 1;
    } else {
        const stockDb = {
            RELIANCE: { company: 'Reliance Industries', sector: 'Energy', cmp: 2890 },
            TCS: { company: 'Tata Consultancy', sector: 'IT', cmp: 3621 },
            INFY: { company: 'Infosys', sector: 'IT', cmp: 1543 },
            HDFC: { company: 'HDFC Bank', sector: 'Banking', cmp: 1720 },
            WIPRO: { company: 'Wipro', sector: 'IT', cmp: 456 },
            TATAMOTORS: { company: 'Tata Motors', sector: 'Auto', cmp: 912 },
            SUNPHARMA: { company: 'Sun Pharma', sector: 'Pharma', cmp: 1185 },
            ONGC: { company: 'ONGC', sector: 'Energy', cmp: 267 },
        };
        const db = stockDb[sym];
        State.holdings.push({ symbol: sym, company: db.company, sector: db.sector, qty, avgPrice: buyPrice, cmp: db.cmp });
    }
    closeAddStockModal();
    renderHoldings();
    refreshPortfolioKPIs();
    showToast(`✅ ${sym} added to portfolio`, 'success');
}

function removeHolding(symbol) {
    State.holdings = State.holdings.filter(h => h.symbol !== symbol);
    renderHoldings();
    refreshPortfolioKPIs();
    showToast(`${symbol} removed from portfolio`, 'info');
}

/* ══════════════════════════════════════════════
   AI PREDICTION ENGINE
   ══════════════════════════════════════════════ */
function setHorizon(h, btn) {
    State.predHorizon = h;
    document.querySelectorAll('.pred-horizon-btns .tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function updatePredStock() { }

function runPrediction() {
    const sym = document.getElementById('pred-stock').value;
    const result = document.getElementById('pred-result-content');
    const loader = document.getElementById('pred-result-loading');
    result.classList.add('hidden');
    loader.classList.remove('hidden');
    const btnText = document.getElementById('pred-btn-text');
    btnText.textContent = '⏳ Analyzing…';

    setTimeout(() => {
        loader.classList.add('hidden');
        result.classList.remove('hidden');
        btnText.textContent = '🔮 Run AI Prediction';
        const predictions = {
            RELIANCE: { dir: 'UP', conf: 82, reason: ['Positive sentiment', 'Rising volume', 'RSI breakout', 'FII buying'] },
            TCS: { dir: 'DOWN', conf: 67, reason: ['Weak guidance', 'Margin pressure', 'Tech sell-off', 'High P/E'] },
            INFY: { dir: 'UP', conf: 74, reason: ['Strong deal flow', 'Positive news', 'MA crossover'] },
            HDFC: { dir: 'UP', conf: 79, reason: ['RBI rate hold', 'Credit growth', 'FII inflows'] },
            WIPRO: { dir: 'DOWN', conf: 61, reason: ['Revenue miss', 'CEO change', 'Sector headwinds'] },
            TATAMOTORS: { dir: 'UP', conf: 88, reason: ['EV sales surge', 'JLR profits', 'Strong exports'] },
        };
        const pred = predictions[sym] || { dir: 'UP', conf: 75, reason: ['Technical breakout'] };
        const isUp = pred.dir === 'UP';

        result.innerHTML = `
      <div class="pred-direction-card">
        <div class="pred-direction-icon">${isUp ? '🚀' : '📉'}</div>
        <div class="pred-direction-label ${isUp ? 'up' : 'down'}">${pred.dir}</div>
        <div class="confidence-bar-wrap">
          <div class="confidence-label">AI Confidence Score</div>
          <div class="confidence-bar">
            <div class="confidence-fill" id="conf-fill" style="width:0%"></div>
          </div>
        </div>
        <div class="confidence-pct" id="conf-pct">0%</div>
        <div style="font-size:11px;color:var(--text-secondary);margin:8px 0">Prediction Horizon: ${State.predHorizon}</div>
        <div class="pred-signals">
          ${pred.reason.map(r => `<span class="signal-tag">${r}</span>`).join('')}
        </div>
      </div>
    `;
        // Animate confidence
        let cur = 0;
        const interval = setInterval(() => {
            cur += 2;
            if (cur >= pred.conf) { cur = pred.conf; clearInterval(interval); }
            document.getElementById('conf-fill').style.width = cur + '%';
            document.getElementById('conf-pct').textContent = cur + '%';
        }, 18);

        // Update prediction chart
        updatePredictionChart(sym, isUp, pred.conf);
        // Update flow panel
        document.getElementById('flow-pred-state').textContent = pred.conf + '% ' + pred.dir;
        document.getElementById('kpi-confidence').textContent = pred.conf + '%';
        showToast(`AI Prediction for ${sym}: ${pred.dir} (${pred.conf}% confidence)`, 'success');
    }, 2200);
}

function initPredictionChart() {
    const labels = Array.from({ length: 20 }, (_, i) => `D-${20 - i}`).concat(['D+1', 'D+2', 'D+3', 'D+4', 'D+5']);
    const hist = [2650, 2660, 2680, 2700, 2720, 2710, 2730, 2750, 2740, 2760, 2770, 2780, 2800, 2820, 2810, 2830, 2850, 2860, 2870, 2890];
    const pred = Array(20).fill(null).concat([2890, 2930, 2960, 3010, 3050]);
    const upper = Array(20).fill(null).concat([2890, 2960, 3000, 3065, 3115]);
    const lower = Array(20).fill(null).concat([2890, 2900, 2920, 2955, 2985]);

    State.charts.pred = new Chart(document.getElementById('prediction-chart'), {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Actual', data: hist, borderColor: '#00ff99', borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false },
                { label: 'AI Predicted', data: pred, borderColor: 'rgba(99,102,241,0.9)', borderWidth: 2, borderDash: [6, 3], pointRadius: 3, tension: 0.4, fill: false },
                { label: 'Upper Band', data: upper, borderColor: 'rgba(245,158,11,0.3)', borderWidth: 1, pointRadius: 0, tension: 0.4, fill: '+1', backgroundColor: 'rgba(245,158,11,0.08)' },
                { label: 'Lower Band', data: lower, borderColor: 'rgba(245,158,11,0.3)', borderWidth: 1, pointRadius: 0, tension: 0.4, fill: false },
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 9 }, callback: v => '₹' + v } },
            }
        },
    });
}

function updatePredictionChart(sym, isUp, conf) {
    if (!State.charts.pred) return;
    const sd = STOCK_DATA[sym];
    const base = sd.price;
    const factor = isUp ? 1 : -1;
    const confFactor = conf / 100;
    const preds = [base, base * (1 + factor * 0.01 * confFactor), base * (1 + factor * 0.02 * confFactor), base * (1 + factor * 0.03 * confFactor), base * (1 + factor * 0.045 * confFactor)];
    State.charts.pred.data.datasets[1].data = Array(20).fill(null).concat(preds);
    State.charts.pred.update();
}

/* ══════════════════════════════════════════════
   NEWS SENTIMENT
   ══════════════════════════════════════════════ */
State.newsData = [
    { id: 1, title: 'Reliance Industries posts record profit, eyes green energy expansion', sentiment: 'positive', source: 'Economic Times', time: '2h ago', stock: 'RELIANCE', impact: 'high', detail: 'Q3 profit surged 23% YoY driven by Jio and retail segments.' },
    { id: 2, title: 'RBI holds repo rate steady, bullish signal for banking stocks', sentiment: 'positive', source: 'Mint', time: '3h ago', stock: 'HDFC', impact: 'high', detail: 'Stable rates reduce NIM pressure on banks, positive for lending growth.' },
    { id: 3, title: 'IT sector faces headwinds as US tech layoffs impact outsourcing demand', sentiment: 'negative', source: 'Business Standard', time: '5h ago', stock: 'TCS', impact: 'high', detail: 'Deal pipeline weakening amid cost-cutting across US enterprises.' },
    { id: 4, title: 'Gold hits ₹72,500, geopolitical uncertainty fuels safe-haven demand', sentiment: 'positive', source: 'CNBC Awaaz', time: '6h ago', stock: 'GOLD', impact: 'medium', detail: 'Middle East tensions and weak USD driving gold rally.' },
    { id: 5, title: 'Tata Motors EV sales cross 50,000 units — analysts upgrade to BUY', sentiment: 'positive', source: 'Moneycontrol', time: '7h ago', stock: 'TATAMOTORS', impact: 'high', detail: 'EV penetration now at 8% of total Tata Motors volume.' },
    { id: 6, title: 'Wipro Q3 revenue misses estimates by 4%, margin pressure continues', sentiment: 'negative', source: 'Reuters', time: '9h ago', stock: 'WIPRO', impact: 'medium', detail: 'CEO transition uncertainty weighing on near-term deal closures.' },
    { id: 7, title: 'FII inflows surge to ₹12,000 Cr, market sentiment turns bullish', sentiment: 'positive', source: 'Zee Business', time: '10h ago', stock: 'NIFTY', impact: 'medium', detail: 'Emerging market funds rotating back to Indian equities.' },
    { id: 8, title: 'Infosys wins $900M deal from European bank, stock rallies 2%', sentiment: 'positive', source: 'The Hindu', time: '12h ago', stock: 'INFY', impact: 'medium', detail: 'Large deal TCV improving, guidance likely to be upgraded.' },
];

function loadNewsItems(filter = 'all') {
    const feed = document.getElementById('news-feed-items');
    feed.innerHTML = '';
    State.newsData
        .filter(n => filter === 'all' || n.sentiment === filter)
        .forEach(n => {
            const div = document.createElement('div');
            div.className = 'news-item';
            div.innerHTML = `
        <div class="news-item-head">
          <span class="news-sent-badge ${n.sentiment}">${n.sentiment.charAt(0).toUpperCase() + n.sentiment.slice(1)}</span>
          <span style="font-size:11px;font-weight:700;color:var(--accent-purple)">${n.stock}</span>
          <span class="news-source">${n.source}</span>
        </div>
        <div class="news-item-title">${n.title}</div>
        <div class="news-item-meta">
          <span>${n.time}</span>
          <span class="news-impact ${n.impact}">${n.impact.toUpperCase()} IMPACT</span>
        </div>
      `;
            feed.appendChild(div);
        });
}

function filterNews(val) { loadNewsItems(val); }

function loadSentimentStocks() {
    const list = document.getElementById('sent-stock-list');
    const stocks = [
        { sym: 'RELIANCE', score: 78, type: 'positive' },
        { sym: 'TCS', score: 35, type: 'negative' },
        { sym: 'INFY', score: 68, type: 'positive' },
        { sym: 'HDFC', score: 72, type: 'positive' },
        { sym: 'WIPRO', score: 28, type: 'negative' },
        { sym: 'TATAMOTORS', score: 85, type: 'positive' },
    ];
    list.innerHTML = stocks.map(s => `
    <div class="sent-stock-item">
      <span class="sent-stock-sym">${s.sym}</span>
      <div class="sent-score-bar"><div class="sent-score-fill ${s.type}" style="width:${s.score}%"></div></div>
      <span class="sent-score-val ${s.type}">${s.score}</span>
    </div>
  `).join('');
}

function initSentimentChart() {
    State.charts.sentiment = new Chart(document.getElementById('sentiment-chart'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                { label: 'Bullish', data: [55, 60, 52, 68, 70, 65, 62], borderColor: '#00ff99', backgroundColor: 'rgba(0,255,153,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 },
                { label: 'Bearish', data: [30, 25, 35, 20, 18, 22, 23], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 },
                { label: 'Neutral', data: [15, 15, 13, 12, 12, 13, 15], borderColor: '#f59e0b', fill: false, tension: 0.4, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 2 },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8892a4', font: { size: 10 } } } },
            scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4a5568', font: { size: 10 }, callback: v => v + '%' }, max: 100, min: 0 } },
        },
    });

    new Chart(document.getElementById('sentiment-donut'), {
        type: 'doughnut',
        data: { labels: ['Bullish', 'Bearish', 'Neutral'], datasets: [{ data: [62, 23, 15], backgroundColor: ['#00ff99', '#ef4444', '#f59e0b'], borderWidth: 2, borderColor: '#13161f' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#8892a4', font: { size: 10 }, padding: 8 } } }, cutout: '60%' },
    });
}

/* ══════════════════════════════════════════════
   AI ADVISOR
   ══════════════════════════════════════════════ */
function initAdvisorChart() {
    State.charts.recAlloc = new Chart(document.getElementById('rec-allocation-chart'), {
        type: 'doughnut',
        data: { labels: ['IT', 'Banking', 'Energy', 'FMCG', 'Pharma', 'Auto'], datasets: [{ data: [25, 25, 20, 15, 10, 5], backgroundColor: ['#00ff99', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'], borderWidth: 2, borderColor: '#13161f' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' },
    });
}

function refreshFlowPanel() {
    document.getElementById('flow-risk-profile').textContent = State.riskProfile;
    const total = State.holdings.reduce((s, h) => s + h.qty * h.cmp, 0);
    document.querySelector('.flow-node:nth-child(5) .flow-val').textContent = '₹' + total.toLocaleString('en-IN');
}

function generateFullStrategy() {
    const strategies = [
        { icon: '⚠️', title: 'Rebalance Volatile Holdings', desc: 'Current IT sector exposure at 47% exceeds your risk profile threshold of 30%. Reduce INFY/WIPRO by 15%.', tag: 'REBALANCE', impact: 'High Impact', cls: 'high-priority' },
        { icon: '📈', title: 'Opportunity: TATAMOTORS Uptrend', desc: 'EV momentum + 88% AI confidence signals strong upside. Consider increasing allocation by 5–8%.', tag: 'BUY', impact: 'Medium Impact', cls: 'medium-priority' },
        { icon: '🛡️', title: 'Add Defensive Exposure (FMCG/Pharma)', desc: 'Adding Sun Pharma or HUL at 10% allocation improves diversification score from 72 → 87.', tag: 'DIVERSIFY', impact: 'Low Risk', cls: 'low-priority' },
        { icon: '🔴', title: 'Set Stop-Loss on WIPRO', desc: 'WIPRO at -1.2% with bearish sentiment (score: 28). Place stop-loss at ₹430 to limit downside.', tag: 'STOP-LOSS', impact: 'Risk Control', cls: 'high-priority' },
    ];
    const out = document.getElementById('strategy-output');
    out.innerHTML = strategies.map(s => `
    <div class="strategy-card ${s.cls}">
      <div class="strategy-icon">${s.icon}</div>
      <div class="strategy-content">
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
        <div class="strategy-action">
          <span class="action-tag">${s.tag}</span>
          <span class="action-impact">${s.impact}</span>
        </div>
      </div>
    </div>
  `).join('');
    document.getElementById('strategy-time').textContent = 'Updated ' + new Date().toLocaleTimeString();
    showToast('🧠 AI Strategy regenerated!', 'success');
}

/* ══════════════════════════════════════════════
   LEARNING MODULE – QUIZ
   ══════════════════════════════════════════════ */
const QUIZ_QUESTIONS = [
    { q: 'What does P/E ratio measure?', opts: ['Price to Earnings', 'Profit to Equity', 'Portfolio to Equity', 'Price to Exchange'], ans: 0 },
    { q: 'Which indicator measures market momentum and overbought/oversold conditions?', opts: ['MACD', 'Bollinger Bands', 'RSI', 'EMA'], ans: 2 },
    { q: 'A "stop-loss" order is used to:', opts: ['Maximize profits', 'Limit losses below a set price', 'Buy at market open', 'Short-sell stocks'], ans: 1 },
    { q: 'What is diversification in investing?', opts: ['Buying one stock heavily', 'Spreading investments across assets to reduce risk', 'Borrowing to invest', 'Selling all assets'], ans: 1 },
    { q: 'Which of these is a DEFENSIVE sector?', opts: ['Technology', 'Cryptocurrency', 'FMCG / Consumer Staples', 'Real Estate'], ans: 2 },
];

function loadQuiz() {
    State.quizIndex = 0; State.quizScore = 0; State.quizStreak = 0;
    document.getElementById('quiz-score-disp').textContent = 0;
    document.getElementById('quiz-total-disp').textContent = QUIZ_QUESTIONS.length;
    document.getElementById('quiz-streak').textContent = '🔥 0 streak';
    document.getElementById('quiz-result').classList.add('hidden');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const container = document.getElementById('quiz-container');
    if (State.quizIndex >= QUIZ_QUESTIONS.length) { showQuizResult(); return; }
    const q = QUIZ_QUESTIONS[State.quizIndex];
    const letters = ['A', 'B', 'C', 'D'];
    container.innerHTML = `
    <div class="quiz-question">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:11px;color:var(--text-secondary)">Question ${State.quizIndex + 1} of ${QUIZ_QUESTIONS.length}</span>
        <div style="height:4px;flex:1;margin-left:12px;background:var(--bg-elevated);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${(State.quizIndex / QUIZ_QUESTIONS.length) * 100}%;background:var(--accent-green);transition:width 0.4s ease;border-radius:2px"></div>
        </div>
      </div>
      <p class="quiz-q-text">${q.q}</p>
      <div class="quiz-options">
        ${q.opts.map((opt, i) => `
          <div class="quiz-opt" id="qopt-${i}" onclick="selectAnswer(${i})">
            <span class="quiz-opt-letter">${letters[i]}</span>
            <span>${opt}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function selectAnswer(idx) {
    const q = QUIZ_QUESTIONS[State.quizIndex];
    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach(o => o.style.pointerEvents = 'none');
    opts[q.ans].classList.add('correct');
    if (idx !== q.ans) { opts[idx].classList.add('wrong'); State.quizStreak = 0; }
    else { State.quizScore++; State.quizStreak++; document.getElementById('quiz-score-disp').textContent = State.quizScore; document.getElementById('quiz-streak').textContent = '🔥 ' + State.quizStreak + ' streak'; }
    setTimeout(() => { State.quizIndex++; renderQuizQuestion(); }, 1000);
}

function showQuizResult() {
    document.getElementById('quiz-container').innerHTML = '';
    const pct = Math.round((State.quizScore / QUIZ_QUESTIONS.length) * 100);
    const msg = pct >= 80 ? '🏆 Excellent! You\'re investment-ready!' : pct >= 60 ? '👍 Good job! Keep learning.' : '📚 Review the topics and try again.';
    const result = document.getElementById('quiz-result');
    result.classList.remove('hidden');
    result.innerHTML = `<h3 style="font-size:24px;margin-bottom:8px">${msg}</h3>
    <p style="color:var(--text-secondary)">You scored <strong style="color:var(--accent-green)">${State.quizScore}/${QUIZ_QUESTIONS.length}</strong> (${pct}%)</p>
    <button class="btn-primary" style="margin-top:16px" onclick="loadQuiz()">Retake Quiz</button>`;
}

/* ── Risk Profiler ── */
function calculateRiskProfile() {
    const vals = [1, 2, 3, 4].map(i => {
        const sel = document.querySelector(`input[name="rq${i}"]:checked`);
        return sel ? parseInt(sel.value) : 0;
    });
    if (vals.some(v => v === 0)) { showToast('Please answer all questions', 'error'); return; }
    const total = vals.reduce((a, b) => a + b, 0);
    let profile = '', color = '', desc = '';
    if (total <= 6) { profile = 'Conservative'; color = 'var(--positive)'; desc = 'You prefer capital preservation with low-risk instruments like FDs, bonds, and blue-chip stocks.'; }
    else if (total <= 12) { profile = 'Moderate'; color = 'var(--accent-amber)'; desc = 'You balance growth and safety. Diversified equity + debt allocation suits your profile.'; }
    else { profile = 'Aggressive'; color = 'var(--negative)'; desc = 'You seek high returns and tolerate volatility. Mid/small-cap stocks and sector funds are your zone.'; }

    State.riskProfile = profile;
    document.getElementById('risk-profile-result').textContent = profile + ' Investor';
    document.getElementById('risk-badge').textContent = 'Risk: ' + profile;
    const out = document.getElementById('risk-profile-output');
    out.classList.remove('hidden');
    out.innerHTML = `
    <div style="padding:16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md)">
      <h4 style="color:${color};font-size:18px;margin-bottom:8px">${profile} Risk Investor</h4>
      <p style="color:var(--text-secondary);font-size:13px;line-height:1.7">${desc}</p>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        ${profile === 'Conservative' ? ['FDs', 'Govt Bonds', 'Large-cap', 'Gold'] : profile === 'Moderate' ? ['Mutual Funds', 'Large-cap', 'Index Funds', 'SIP'] : ['Mid-cap', 'Small-cap', 'Sector Funds', 'Derivatives']}
        ${['a', 'b'].map(() => '').join('')}
      </div>
    </div>
  `;
    drawRiskGauge(profile);
    showToast(`Risk Profile set to: ${profile} 🧬`, 'success');
}

/* ══════════════════════════════════════════════
   TOPIC MODAL
   ══════════════════════════════════════════════ */
const TOPIC_CONTENT = {
    basics: {
        title: '📈 Stock Market Basics',
        body: `<div class="topic-content">
      <h4>What is a Stock Market?</h4>
      <p>A stock market is a marketplace where buyers and sellers trade shares of publicly listed companies. In India, the major exchanges are NSE (National Stock Exchange) and BSE (Bombay Stock Exchange).</p>
      <h4>Key Concepts</h4>
      <ul>
        <li><strong>Share/Stock:</strong> Ownership unit in a company</li>
        <li><strong>Bull Market:</strong> Rising market (prices going up)</li>
        <li><strong>Bear Market:</strong> Falling market (prices going down)</li>
        <li><strong>Bid-Ask Spread:</strong> Difference between buying and selling price</li>
        <li><strong>Market Cap:</strong> Total value = Price × Outstanding shares</li>
      </ul>
      <div class="ai-explanation-box">
        <strong>🤖 AI Explanation</strong>
        <p>Think of the stock market like an auction house. Companies put their ownership pieces (shares) up for public trading. When more people want to buy than sell, prices rise. The 'Bid' is what buyers offer; the 'Ask' is what sellers want. The difference is the spread — your transaction cost.</p>
      </div>
    </div>`
    },
    risk: {
        title: '⚠️ Risk Management',
        body: `<div class="topic-content">
      <h4>Stop-Loss Orders</h4>
      <p>A stop-loss automatically sells your stock when it falls to a preset price, capping your downside. Example: Buy RELIANCE at ₹2,890, set stop-loss at ₹2,700 (7% below).</p>
      <h4>Position Sizing</h4>
      <p>Never invest more than 5–10% of your portfolio in a single stock. This limits the damage if any one position fails.</p>
      <h4>Diversification Rules</h4>
      <ul>
        <li>Spread across at least 4–6 different sectors</li>
        <li>Mix large-cap (stable) and mid-cap (growth)</li>
        <li>Keep 10–20% in defensive assets (gold, bonds)</li>
      </ul>
      <div class="ai-explanation-box">
        <strong>🤖 AI Tip for You</strong>
        <p>Based on your portfolio, your IT sector exposure is 47% — significantly above safe levels. AI recommends rebalancing 15% into Banking or FMCG to reduce sector concentration risk.</p>
      </div>
    </div>`
    },
};

function openTopic(id) {
    const content = TOPIC_CONTENT[id];
    if (!content) { showToast('Topic content coming soon!', 'info'); return; }
    document.getElementById('topic-modal-title').textContent = content.title;
    document.getElementById('topic-modal-body').innerHTML = content.body;
    document.getElementById('topic-modal').classList.remove('hidden');
}
function closeTopicModal() { document.getElementById('topic-modal').classList.add('hidden'); }
function markTopicDone() { closeTopicModal(); showToast('🎓 Topic marked complete! +50 XP', 'success'); }

function showAddWatchlist() { showToast('Watchlist customization coming soon!', 'info'); }

/* ══════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); }, 3400);
}

/* ══════════════════════════════════════════════
   INIT ON LOAD
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('mindvest_token');
    const savedUser = localStorage.getItem('mindvest_user');
    if (savedToken && savedUser) {
        State.token = savedToken;
        State.user = savedUser;
        bootApp();
    }

    // Ticker animation — live price simulation
    setInterval(() => {
        document.querySelectorAll('.ticker-item').forEach(el => {
            const valEl = el.querySelector('.ticker-val');
            if (!valEl) return;
            const change = (Math.random() - 0.5) * 0.3;
            const isPos = Math.random() > 0.4;
            el.className = 'ticker-item ' + (isPos ? 'positive' : 'negative');
        });
    }, 3000);
});
