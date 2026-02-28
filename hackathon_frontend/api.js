/* ══════════════════════════════════════════════════════════════════
   MindVest – Backend API Client
   Connects the frontend to the FastAPI backend at BASE_URL
   ══════════════════════════════════════════════════════════════════ */

const API = (() => {
    // ── Config ────────────────────────────────────────────────────
    const BASE_URL = 'http://127.0.0.1:8000';   // ← consistent local IP

    // ── Helpers ───────────────────────────────────────────────────
    function getToken() {
        return localStorage.getItem('mindvest_token') || '';
    }

    async function request(method, path, body = null, useAuth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (useAuth && getToken()) {
            headers['Authorization'] = `Bearer ${getToken()}`;
        }
        const opts = {
            method,
            headers,
            mode: 'cors'  // Explicitly enable CORS
        };
        if (body) opts.body = JSON.stringify(body);

        try {
            const res = await fetch(`${BASE_URL}${path}`, opts);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            // Network error (backend not running) → bubble up
            throw err;
        }
    }

    // ── Health ────────────────────────────────────────────────────
    async function ping() {
        return request('GET', '/health', null, false);
    }

    // ── Auth ──────────────────────────────────────────────────────
    async function login(email, password) {
        return request('POST', '/api/auth/login', { email, password }, false);
    }

    async function register(full_name, email, password) {
        return request('POST', '/api/auth/register', { full_name, email, password }, false);
    }

    async function web3Login(wallet_address, signature, message) {
        return request('POST', '/api/auth/web3-login', { wallet_address, signature, message }, false);
    }

    // ── Learning ──────────────────────────────────────────────────
    async function getQuizQuestions() {
        return request('GET', '/api/learning/quiz/questions');
    }

    async function submitQuiz(user_id, answers) {
        // answers: [{question_id, selected_option}, ...]
        return request('POST', '/api/learning/quiz/submit', { user_id, answers });
    }

    async function getTopics() {
        return request('GET', '/api/learning/topics');
    }

    // ── Investment / Portfolio ─────────────────────────────────────
    async function allocatePortfolio(user_id, investment_amount, risk_profile) {
        return request('POST', '/api/investment/portfolio/allocate', {
            user_id,
            investment_amount,
            risk_profile,
        });
    }

    async function getAllocationTemplates() {
        return request('GET', '/api/investment/allocation-templates');
    }

    // ── AI Prediction ─────────────────────────────────────────────
    async function predict(ticker, days = 30, model = 'lstm') {
        return request('POST', `/api/predict?model=${model}`, { ticker, days });
    }

    async function getTickers() {
        return request('GET', '/api/predict/tickers');
    }

    // ── News / Sentiment ──────────────────────────────────────────
    async function getNews(query = 'Indian stock market', limit = 10) {
        return request('GET', `/api/news?query=${encodeURIComponent(query)}&limit=${limit}`);
    }

    // ── AI Advisor ────────────────────────────────────────────────
    async function askAdvisor(user_id, query) {
        return request('POST', '/api/advisor/ask', { user_id, query });
    }

    async function chat(message, user_id = 0) {
        return request('POST', '/api/advisor/chat', { message, user_id });
    }

    async function predictInsight(ticker, days = 7) {
        return request('POST', `/api/advisor/predict-insight?ticker=${ticker}&days=${days}`);
    }

    // ── Public API surface ────────────────────────────────────────
    return {
        BASE_URL,
        ping,
        login,
        register,
        web3Login,
        getQuizQuestions,
        submitQuiz,
        getTopics,
        allocatePortfolio,
        getAllocationTemplates,
        predict,
        getTickers,
        getNews,
        askAdvisor,
        chat,
        predictInsight,
    };
})();

/* ── Backend Status Check ──────────────────────────────────────── */
let BACKEND_ONLINE = false;

async function checkBackendStatus(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await API.ping();
            BACKEND_ONLINE = true;
            console.log('%c✅ MindVest Backend: ONLINE', 'color:#00ff99;font-weight:bold;');
            return;
        } catch (err) {
            console.log(`Backend check attempt ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
            }
        }
    }
    BACKEND_ONLINE = false;
    console.warn('%c⚠️ MindVest Backend: OFFLINE – running in demo mode', 'color:#f59e0b;font-weight:bold;');
}

// Check on page load
checkBackendStatus();
