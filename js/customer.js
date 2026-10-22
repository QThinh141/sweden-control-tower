/* =====================================================================
   CUSTOMER PORTAL — the SMS-link experience (no app, no login)
   Mobile-first light UI · self-service re-booking · localized
   ===================================================================== */

const Customer = {
  /* ------------------------------------------------ mount skeleton */
  mount() {
    const root = $('#track-root');
    root.innerHTML = `
    <div class="portal-stage">
      <aside class="portal-demo">
        <div class="demo-card">
          <div class="demo-title">${T('demoTitle')}</div>
          <label class="demo-label">${T('demoLabel')}</label>
          <select id="demo-order"></select>
          <div class="demo-row">
            <button id="demo-delay">${T('demoDelay')}</button>
            <button id="demo-reset">${T('demoReset')}</button>
          </div>
          <button id="demo-tower" class="ghost-full">${T('demoBack')}</button>
          <p class="demo-note">${T('demoNote')}</p>
        </div>
      </aside>

      <div class="phone">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="p-statusbar"><span id="p-clock">${hhmm(nowMin())}</span><span class="p-sig">A-Bolaget ▮▮▮▯</span></div>
          <div class="phone-screen" id="phone-body"></div>
        </div>
      </div>
    </div>`;

    $('#demo-tower').addEventListener('click', () => { location.hash = '#/tower'; });
    $('#demo-delay').addEventListener('click', () => this.simDelay());
    $('#demo-reset').addEventListener('click', () => { State.draft = null; this.open(State.tracked || 'SE-1042'); toast(T('toastPReset')); });
    $('#demo-order').addEventListener('change', e => this.open(e.target.value));
    $('#phone-body').addEventListener('click', e => {
      if (e.target.closest('[data-slot]')) { this.chooseSlot(e.target.closest('[data-slot]').dataset.slot); return; }
      if (e.target.closest('[data-keep]')) { this.chooseSlot('keep'); return; }
      if (e.target.closest('#p-confirm')) { this.confirmRebook(); return; }
      if (e.target.closest('[data-lang-cycle]')) {
        const i = LANG_CYCLE.indexOf(State.lang);
        applyLang(LANG_CYCLE[(i + 1) % LANG_CYCLE.length]);
        return;
      }
      const lk = e.target.closest('#lk-btn');
      if (lk) {
        const v = ($('#lk-input').value || '').trim().toUpperCase();
        const o = State.orders.find(x => x.id === v);
        if (o) this.open(v); else toast(T('toastNotFound'));
        return;
      }
      const dd = e.target.closest('[data-open]');
      if (dd) this.open(dd.dataset.open);
    });
    this.render();
  },

  /* ------------------------------------------------ open an order */
  open(id) {
    const o = State.orders.find(x => x.id === id);
    if (!o) return;
    State.tracked = id;
    State.draft = null;
    this.render();
  },

  /* ------------------------------------------------ demo: simulate delay */
  simDelay() {
    const o = State.orders.find(x => x.id === State.tracked);
    if (!o) return;
    if (o.status === 'delivered') { toast(T('toastDelivered')); return; }
    o.eta = Math.max(o.eta + 12, o.promised[1] + randi(16, 28));
    o.sms.push({ dir: 'in', time: hhmm(nowMin()), text: smsText('delay', o) });
    logEvent('sms', `Delay warning SMS delivered — ${o.id} · customer link opened`);
    State.draft = null;
    this.render();
    toast(T('toastDelay'));
  },

  /* ------------------------------------------------ re-booking slots */
  slots(o) {
    const n = nowMin();
    const after = Math.max(n + 75, o.promised[1] + 15);
    const out = [];
    if (after < 21 * 60) out.push({ label: T('today') + ' ' + hhmm(after) + '–' + hhmm(after + 120), win: [Math.round(after), Math.round(after) + 120], pop: true });
    if (n < 17.5 * 60) out.push({ label: T('today') + ' 18:00–20:00', win: [1080, 1200] });
    out.push({ label: T('tomorrow') + ' 09:00–11:00', win: [1440 + 540, 1440 + 660] });
    out.push({ label: T('tomorrow') + ' 13:00–15:00', win: [1440 + 780, 1440 + 900] });
    return out.slice(0, 4);
  },

  chooseSlot(v) {
    if (v === 'keep') { State.draft = { keep: true }; }
    else { const s = this.slots(this.order())[+v]; if (s) State.draft = { win: s.win }; }
    this.render();
  },

  order() { return State.orders.find(x => x.id === State.tracked); },

  confirmRebook() {
    const o = this.order();
    if (!o || !State.draft) return;
    if (State.draft.keep) {
      State.draft = null;
      toast(T('toastKeep'));
      this.render();
      return;
    }
    const [s, e] = State.draft.win;
    o.promised = [s, e];
    o.eta = s + randi(5, 12);
    o.status = 'rescheduled'; o.by = 'customer';
    o.sms.push({ dir: 'in', time: hhmm(nowMin()), text: smsText('confirm', o) });
    State.savedToday++;
    logEvent('cust', `Customer re-booked ${o.id} via SMS link → ${hhwin(s, e)} · zero dispatcher time`);
    State.draft = null;
    this.render();
    toast(T('toastRebook'));
  },

  /* ------------------------------------------------ render phone */
  render() {
    if (State.view !== 'track' || !$('#phone-body')) return;
    const o = this.order();

    /* demo controls sync */
    const sel = $('#demo-order');
    if (sel) {
      const opts = State.orders.map(x => `<option value="${x.id}" ${x.id === State.tracked ? 'selected' : ''}>${x.id} · ${x.name}</option>`).join('');
      if (sel.dataset.opts !== opts) { sel.innerHTML = opts; sel.dataset.opts = opts; }
    }

    if (!o) { this.renderLookup(); return; }
    this.renderOrder(o);
  },

  renderLookup() {
    $('#phone-body').innerHTML = `
      <div class="lookup">
        <div class="lk-logo"><span>A</span></div>
        <h2 class="lk-title">${T('track')}</h2>
        <p class="lk-hint">${T('lookupHint')}</p>
        <input id="lk-input" class="lk-input" value="SE-1042" spellcheck="false">
        <button id="lk-btn" class="lk-btn">${T('btnTrack')}</button>
        <div class="lk-demo">
          <span>${T('quickOpen')}</span>
          ${['SE-1042', 'SE-1051', 'SE-2031', 'SE-3061'].map(id =>
            `<button data-open="${id}">${id}</button>`).join('')}
        </div>
      </div>`;
  },

  renderOrder(o) {
    const r = riskOf(o);
    const delayed = ['risk', 'late', 'informed'].includes(r);
    const handled = o.status === 'rescheduled';
    const stepIdx = o.status === 'delivered' ? 4 :
      o.status === 'out' || o.status === 'informed' || o.status === 'rescheduled' ? 3 :
      o.status === 'loaded' ? 2 : 1;
    const doneIdx = o.status === 'delivered' ? 4 :
      stepIdx >= 3 ? 2 : stepIdx - 1;
    const steps = T('steps');
    const stepTimes = [
      hhmm(o.promised[0] - 160),
      o.status === 'picking' ? '· · ·' : hhmm(o.promised[0] - 120),
      o.status === 'loaded' ? '· · ·' : ['out', 'informed', 'rescheduled', 'delivered'].includes(o.status) ? hhmm(o.promised[0] - 60) : '—',
      ['out', 'informed', 'rescheduled'].includes(o.status) ? '●' : o.status === 'delivered' ? hhmm(o.eta) : '—',
      o.status === 'delivered' ? hhmm(o.eta) : '—',
    ];
    const bigEta = `${hhmm(Math.max(nowMin() + 3, o.eta - 10))}–${hhmm(o.eta + 10)}`;
    const statusChip = o.status === 'delivered' ? `<span class="st-chip st-done">&#10003; ${steps[4]}</span>` :
      handled ? `<span class="st-chip st-saved">&#10003; ${T('saved')}</span>` :
      delayed ? `<span class="st-chip st-late">&#9888; ${T('delayed')}</span>` :
      `<span class="st-chip st-ok">&#9679; ${T('onTime')}</span>`;

    /* re-booking / status message cards */
    let actionCard = '';
    if (delayed && !handled) {
      const slots = this.slots(o);
      const draft = State.draft;
      const selKeep = draft && draft.keep;
      actionCard = `
      <div class="delay-card attn">
        <div class="warn-row"><span class="warn-ico">&#9888;</span><b>${T('delayTitle')}</b></div>
        <p>${T('delayBody')}</p>
        <div class="slot-cap">${T('choose')}:</div>
        <div class="slot-grid">
          ${slots.map((s, i) => `
            <button class="slot ${draft && !draft.keep && State.draft.win[0] === s.win[0] ? 'on' : ''}" data-slot="${i}">
              <span class="s-label">${s.label}</span>${s.pop ? `<span class="s-note">${T('popular')}</span>` : ''}
            </button>`).join('')}
          <button class="slot slot-keep ${selKeep ? 'on' : ''}" data-keep="1"><span class="s-label">${T('keep')}</span></button>
        </div>
        ${draft ? `<button id="p-confirm" class="p-confirm">${T('confirm')}</button>` : ''}
      </div>`;
    } else if (handled) {
      const note = o.by === 'tower' ? T('teamNote') : T('confirmedBody');
      actionCard = `
      <div class="success-card">
        <span class="ok-ico">&#10003;</span>
        <div><b>${o.by === 'tower' ? T('saved') : T('confirmedTitle')}</b>
        <span>${note.split('{win}').join(hhwin(o.promised[0], o.promised[1]))}</span></div>
      </div>`;
    }

    const itemsHtml = o.items.map(i => `
      <div class="item"><span>${esc(i.name)}</span><b>${i.qty} ×</b></div>`).join('');

    const smsHtml = o.sms.length ? o.sms.map(m => `
      <div class="sms ${m.dir === 'out' ? 'sms-out' : 'sms-in'}">
        <div class="sms-bub">${esc(m.text)}</div><span class="sms-time">${m.time}</span>
      </div>`).join('') : `<div class="sms-empty">${T('noMsg')}</div>`;

    $('#phone-body').innerHTML = `
      <div class="p-head">
        <div class="p-brand"><span class="p-logo">A</span><span>${CONFIG.portalName}</span></div>
        <button class="p-lang-cycle" data-lang-cycle="1" title="Language">🌐 ${State.lang.toUpperCase()}</button>
      </div>

      <div class="p-scroll">
        <div class="p-hero">
          <div class="st-ico">${o.status === 'delivered' ? '&#127968;' : '&#128666;'}</div>
          <div>
            <div class="p-order">${T('order')} ${o.id} ${statusChip}</div>
            <div class="p-addr">${esc(o.address)}</div>
          </div>
        </div>

        ${o.status === 'picking' || o.status === 'loaded' ? `
        <div class="eta-card">
          <div class="eta-cap">${T('etaTitle')}</div>
          <div class="eta-big">${hhwin(o.promised[0], o.promised[1])}</div>
          <div class="eta-sub">${T('loading').split('{dc}').join(GEO.dcs[GEO.routes.find(x => x.id === o.routeId).dc].label)}</div>
        </div>` : `
        <div class="eta-card">
          <div class="eta-cap">${T('etaTitle')}</div>
          <div class="eta-big ${delayed && !handled ? 'eta-late' : ''}">${o.status === 'delivered' ? steps[4] : bigEta}</div>
          <div class="eta-sub">${T('winTitle')}: <b>${hhwin(o.promised[0], o.promised[1])}</b>${delayed && !handled ? ` · <span class="txt-amber">${T('delayed').toLowerCase()}</span>` : ''}</div>
        </div>`}

        ${actionCard}

        <div class="p-tl">
          ${steps.map((s, i) => `
          <div class="tl-step ${i <= doneIdx ? 'done' : ''} ${i === stepIdx && o.status !== 'delivered' ? 'active' : ''}">
            <span class="tl-dot">${i <= doneIdx ? '&#10003;' : ''}</span>
            <div class="tl-body"><span class="tl-label">${s}</span><span class="tl-time">${stepTimes[i]}</span></div>
          </div>`).join('')}
        </div>

        <div class="p-sec">
          <div class="p-sec-cap">${T('items')}</div>
          ${itemsHtml}
        </div>

        <div class="p-sec">
          <div class="p-sec-cap">${T('messages')}</div>
          ${smsHtml}
        </div>

        <div class="help-row">
          <span>${T('help')}</span>
          <a href="tel:${CONFIG.supportPhone.replace(' ', '')}">${T('call')} ${CONFIG.supportPhone}</a>
        </div>
      </div>`;
  },
};
