/* =====================================================================
   CORE — state, helpers, i18n, simulation engine, router
   ===================================================================== */

/* ---------------------- DOM + format helpers ------------------------ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad2 = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.round(rand(a, b));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); };
const hhwin = (a, b) => hhmm(a) + '–' + hhmm(b);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtKr = v => v.toLocaleString('sv-SE') + ' kr';

/* ---------------------- i18n ----------------------------------------- */
function T(key, vars) {
  const L = STR[State.lang] || STR.en;
  let s = (key in L) ? L[key] : (key in STR.en ? STR.en[key] : key);
  if (vars && typeof s === 'string') {
    for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v);
  }
  return s;
}
const LANG_CYCLE = ['en', 'sv', 'vi', 'da', 'no'];

function applyLang(lang, opts = {}) {
  State.lang = STR[lang] ? lang : 'en';
  try { localStorage.setItem('sct-lang', State.lang); } catch (e) { /* private mode */ }
  const sel = $('#lang-sel');
  if (sel) sel.value = State.lang;
  const d = $('#nav-demo-btn'), p = $('#nav-portal-btn');
  if (d) d.textContent = '▶ ' + T('navDemo');
  if (p) p.textContent = T('navPortal');
  if (!opts.silent) {
    if (State.view === 'tower') Tower.mount();
    if (State.view === 'track') { const id = State.tracked; Customer.mount(); if (id) Customer.open(id); }
  }
}

/* Stockholm local time (minutes of day) */
const STH = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false });
function nowMin() {
  const p = STH.formatToParts(new Date());
  let h = +p.find(x => x.type === 'hour').value;
  const m = +p.find(x => x.type === 'minute').value;
  if (h === 24) h = 0;
  return h * 60 + m;
}

/* ---------------------- Global state -------------------------------- */
const State = {
  orders: [], feed: [], vehicles: {},
  savedToday: 0, deliveredToday: 9, smsToday: 38,
  incident: null, lang: 'en', view: 'home',
  selected: null,          // order id open in tower drawer
  tracked: null,           // order id shown in customer portal
  draft: null,             // pending slot choice in portal
  startOnTime: null,
};

function logEvent(type, text) {
  State.feed.unshift({ t: nowMin(), type, text });
  if (State.feed.length > 60) State.feed.pop();
}

/* ---------------------- Risk model ---------------------------------- */
function riskOf(o) {
  if (o.status === 'delivered') return 'done';
  if (o.status === 'rescheduled') return 'saved';
  if (o.status === 'informed') return 'informed';
  const dev = o.eta - o.promised[1];
  if (dev > 0) return 'late';
  if (dev > -20) return 'risk';
  return 'ok';
}
function sevOf(o) { return { late: 5, risk: 4, informed: 3, saved: 2, ok: 1, done: 0 }[riskOf(o)]; }
function activeOrders() { return State.orders.filter(o => o.status !== 'delivered'); }
function onTimePct() {
  const act = activeOrders();
  if (!act.length) return 100;
  const ok = act.filter(o => ['ok', 'saved'].includes(riskOf(o))).length;
  return 100 * ok / act.length;
}

/* ---------------------- Seed initial data --------------------------- */
function initOrders() {
  const n = nowMin();
  State.orders = ORDER_SEED.map(s => ({
    ...s,
    items: s.items.map(([name, qty]) => ({ name, qty })),
    promised: [n + s.win[0], n + s.win[1]],
    eta: n + s.eta,
    sms: [], by: null,
  }));
  // pre-existing delay SMS for the orders already flagged at login
  ['SE-1042', 'SE-1058', 'SE-3057', 'SE-2031'].forEach(id => {
    const o = State.orders.find(x => x.id === id);
    if (o) o.sms.push({ dir: 'in', time: hhmm(n - 4), text: smsText('delay', o) });
  });
  ['SE-1051', 'SE-2044'].forEach(id => {
    const o = State.orders.find(x => x.id === id);
    if (o) o.sms.push({ dir: 'in', time: hhmm(n - 7), text: smsText('delay', o) });
  });
}

function resetDemo() {
  initOrders();
  State.feed = [];
  FEED_SEED.forEach(([t, x], i) => State.feed.push({ t: nowMin() - (FEED_SEED.length - i) * 2, type: t, text: x }));
  State.savedToday = 0; State.deliveredToday = 9; State.smsToday = 38;
  State.incident = null; State.selected = null; State.draft = null;
  GEO.routes.forEach(r => { State.vehicles[r.id] = { p: rand(0.2, 0.75), stalled: false }; });
  State.startOnTime = onTimePct();
  closeDrawer();
}

/* ---------------------- Sweden map (SVG, light theme) ---------------- */
function posOnRoute(route, p) {
  const pts = route.path;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d); total += d;
  }
  let target = clamp(p, 0, 1) * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? target / segs[i] : 0;
      return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k };
    }
    target -= segs[i];
  }
  return { x: pts[0][0], y: pts[0][1] };
}

function svgSweden(o = {}) {
  const c = GEO.cities, d = GEO.dcs;
  let s = '<svg viewBox="0 0 240 560" class="map-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sweden — pilot metros">';
  s += '<defs><linearGradient id="landg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4eefb"/></linearGradient></defs>';
  s += `<path class="map-norway" d="${GEO.norway}"/><text class="map-tiny" x="12" y="292">NORGE</text>`;
  s += `<path class="map-land" d="${GEO.sweden}"/>`;
  s += '<ellipse class="map-island" cx="160" cy="446" rx="8" ry="11"/><path class="map-island-s" d="M134 424 L137 442"/>';
  if (o.routes) GEO.routes.forEach(r => {
    s += `<polyline class="map-route" points="${r.path.map(p => p.join(',')).join(' ')}"/>`;
  });
  if (o.pilot) Object.values(c).forEach(k => { s += `<circle class="map-pilot" cx="${k.x}" cy="${k.y}" r="17"/>`; });
  Object.values(d).forEach(k => {
    s += `<rect class="map-dc" x="${k.x - 2.5}" y="${k.y - 2.5}" width="5" height="5"/><text class="map-dc-lbl" x="${k.lx}" y="${k.ly}" text-anchor="${k.anchor}">${k.label}</text>`;
  });
  Object.values(c).forEach(k => {
    s += `<g class="map-city"><circle class="city-pulse" cx="${k.x}" cy="${k.y}" r="9"/><circle class="city-core" cx="${k.x}" cy="${k.y}" r="3.6"/><text class="map-city-lbl" x="${k.lx}" y="${k.ly}" text-anchor="${k.anchor}">${k.label}</text></g>`;
  });
  if (o.routes) GEO.routes.forEach(r => {
    const p = posOnRoute(r, State.vehicles[r.id].p);
    s += `<g class="veh" id="veh-${r.vehicle}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><circle class="veh-ring" r="7"/><circle class="veh-dot" r="3"/><text class="veh-id" x="11" y="3">${r.vehicle}</text></g>`;
  });
  s += '</svg>';
  return s;
}

/* ---------------------- Simulation loop ------------------------------ */
function tick() {
  const n = nowMin();

  /* vehicles */
  GEO.routes.forEach(r => {
    const v = State.vehicles[r.id];
    if (v.stalled) return;
    let p = v.p + rand(0.008, 0.02);
    if (p > 0.98) p = 0.12;
    v.p = p;
    const pos = posOnRoute(r, p);
    const g = document.getElementById('veh-' + r.vehicle);
    if (g) g.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`);
  });

  /* ETA drift */
  State.orders.forEach(o => {
    if (o.status === 'delivered' || o.status === 'rescheduled') return;
    let d = o.bias * rand(0.15, 0.6);
    if (Math.random() < 0.25) d -= rand(0.2, 0.8);
    o.eta = clamp(o.eta + d, n + 4, o.promised[1] + 70);
  });

  /* occasional carrier hiccup promotes an OK order to at-risk */
  if (Math.random() < 0.07) {
    const cand = State.orders.filter(o => riskOf(o) === 'ok' && o.status === 'out');
    if (cand.length) {
      const o = pick(cand);
      o.eta += randi(14, 26);
      logEvent('sys', `Carrier API — delay reported for ${o.id} (${o.district}, ${CITY[o.city].name})`);
    }
  }

  /* occasional completed delivery */
  if (Math.random() < 0.05) {
    const cand = State.orders.filter(o => o.status === 'out' && o.eta <= n);
    if (cand.length) {
      const o = pick(cand);
      o.status = 'delivered';
      State.deliveredToday++;
      logEvent('slot', `Delivered — ${o.id} · ${o.district}, ${CITY[o.city].name} (photo proof received)`);
    }
  }

  /* background feed event */
  if (Math.random() < 0.14) {
    const [type, text] = pick(FEED_POOL);
    logEvent(type, text);
  }

  /* refresh the operational views */
  if (State.view === 'tower') Tower.update();
  if (State.view === 'track' && !State.draft) Customer.render();
}

/* ---------------------- Toast ---------------------------------------- */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 300); }, 3600);
}

/* ---------------------- Drawer helpers ------------------------------- */
function closeDrawer() {
  $('#tw-drawer').hidden = true;
  $('#tw-drawer-veil').hidden = true;
  State.selected = null;
}

/* ---------------------- Home page effects ----------------------------- */
function animCount(el) {
  const target = parseFloat(el.dataset.count);
  const dec = el.dataset.dec ? 1 : 0;
  const pre = el.dataset.prefix || '';
  const suf = el.dataset.suffix || '';
  let t0 = null; const dur = 1100;
  function f(ts) {
    if (!t0) t0 = ts;
    const k = Math.min(1, (ts - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = pre + (target * e).toFixed(dec) + suf;
    if (k < 1) requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}

function initHome() {
  $('#team-name').textContent = CONFIG.teamName;
  $('#foot-team').textContent = CONFIG.teamName;
  $('#hero-map').innerHTML = svgSweden({ pilot: true });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('on');
      if (e.target.dataset.count !== undefined) animCount(e.target);
      io.unobserve(e.target);
    }
  }), { threshold: 0.15 });
  $$('.reveal, [data-count]').forEach(el => io.observe(el));
}

/* ---------------------- Router ---------------------------------------- */
function setView(v) {
  State.view = v;
  ['home', 'tower', 'track'].forEach(x => { $('#view-' + x).hidden = x !== v; });
  if (v === 'tower') { Tower.mount(); window.scrollTo({ top: 0 }); }
  if (v === 'track') { Customer.mount(); window.scrollTo({ top: 0 }); }
}

function route() {
  const h = location.hash || '';
  if (h.startsWith('#/tower')) { setView('tower'); return; }
  if (h.startsWith('#/track')) {
    setView('track');
    const id = (h.split('/')[2] || '').toUpperCase();
    if (id && State.orders.find(o => o.id === id)) Customer.open(id);
    else Customer.open('SE-1042');
    return;
  }
  setView('home');
  const anchor = h.length > 1 ? h.slice(1) : '';
  if (anchor && !anchor.startsWith('/')) {
    const el = document.getElementById(anchor);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60);
  }
}

/* ---------------------- Boot ------------------------------------------ */
function boot() {
  /* language first (persisted) — so seeded SMS use the right language */
  let saved = 'en';
  try { saved = localStorage.getItem('sct-lang') || 'en'; } catch (e) { /* private mode */ }
  State.lang = STR[saved] ? saved : 'en';
  applyLang(State.lang, { silent: true });

  initOrders();
  FEED_SEED.forEach(([t, x], i) => State.feed.push({ t: nowMin() - (FEED_SEED.length - i) * 2, type: t, text: x }));
  GEO.routes.forEach(r => { State.vehicles[r.id] = { p: rand(0.2, 0.75), stalled: false }; });
  State.startOnTime = onTimePct();

  /* nav language selector */
  const sel = $('#lang-sel');
  if (sel) {
    sel.value = State.lang;
    sel.addEventListener('change', () => applyLang(sel.value));
  }

  initHome();
  route();
  setInterval(tick, 4000);
  setInterval(() => {
    const n = hhmm(nowMin());
    const a = $('#tw-clock'); if (a) a.textContent = n;
    const b = $('#p-clock'); if (b) b.textContent = n;
  }, 1000);
}

document.addEventListener('DOMContentLoaded', boot);
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
