/* =====================================================================
   CONTROL TOWER — dispatcher workspace (Risk Dashboard, ORTEC
   recommendations, live map, intervention feed, scenarios)
   Fully localized via T() — EN / VI / SV / DA / NO
   ===================================================================== */

const Tower = {
  /* ------------------------------------------------ mount (skeleton) */
  mount() {
    const root = $('#tw-root');
    root.innerHTML = `
    <div class="tower-head">
      <div class="th-title">
        <h2>${T('tTitle')}</h2>
        <div class="sub">${T('tSub')}</div>
        <a class="back-link" href="#/">${T('tBack')}</a>
      </div>
      <div class="th-right">
        <div class="tower-clock"><div class="clock-time" id="tw-clock">${hhmm(nowMin())}</div><div class="clock-zone">${T('clockZone')}</div></div>
        <div class="pl-chips">${['ERP', 'WMS', 'Carrier API', 'eCom'].map(s => `<span class="pl-chip"><i class="dot ok"></i>${s}</span>`).join('')}</div>
        <div class="scn-row">
          <button class="scn-btn" data-scn="traffic">${T('scnTraffic')}</button>
          <button class="scn-btn" data-scn="breakdown">${T('scnBreakdown')}</button>
          <button class="scn-btn" data-scn="reset">${T('scnReset')}</button>
        </div>
      </div>
    </div>

    <div id="tw-alert"></div>

    <div class="kpi-row" id="tw-kpis"></div>

    <div class="tower-grid">
      <section class="panel map-panel">
        <div class="panel-head">
          <div><div class="panel-title">${T('netTitle')}</div><div class="panel-sub">${T('netSub')}</div></div>
          <div class="map-legend">
            <span><i class="lg-dc"></i>${T('legDc')}</span>
            <span><i class="lg-route"></i>${T('legRoute')}</span>
            <span><i class="lg-veh"></i>${T('legVeh')}</span>
            <span><i class="lg-pilot"></i>${T('legPilot')}</span>
          </div>
        </div>
        <div class="map-holder" id="tw-map"></div>
      </section>

      <section class="panel risk-panel">
        <div class="panel-head">
          <div><div class="panel-title">${T('riskTitle')}</div><div class="panel-sub">${T('riskSub')}</div></div>
          <span class="badge b-count" id="tw-riskcount"></span>
        </div>
        <div class="tbl-wrap">
          <table class="risk-table">
            <thead><tr>
              <th>${T('thOrder')}</th><th>${T('thRoute')}</th><th>${T('thDest')}</th><th>${T('thPromised')}</th><th>${T('thEta')}</th><th>${T('thDev')}</th><th>${T('thStatus')}</th><th></th>
            </tr></thead>
            <tbody id="tw-rows"></tbody>
          </table>
        </div>
        <div class="tbl-foot" id="tw-delivered"></div>
      </section>

      <section class="panel feed-panel">
        <div class="panel-head">
          <div><div class="panel-title">${T('feedTitle')}</div><div class="panel-sub">${T('feedSub')}</div></div>
        </div>
        <div class="feed" id="tw-feed"></div>
      </section>

      <section class="panel cap-panel">
        <div class="panel-head">
          <div><div class="panel-title">${T('capTitle')}</div><div class="panel-sub">${T('capSub')}</div></div>
        </div>
        <div class="caps" id="tw-caps"></div>
        <div class="optrack-tip"><b>Optrack</b> — ${T('optrackTip')}</div>
      </section>
    </div>`;

    $('#tw-map').innerHTML = svgSweden({ routes: true, pilot: true });
    this.bind();
    this.update();
  },

  /* ------------------------------------------------ event binding (once) */
  bind() {
    if (this._bound) return;
    this._bound = true;
    $('#tw-root').addEventListener('click', e => {
      const scn = e.target.closest('[data-scn]');
      if (scn) { this.scenario(scn.dataset.scn); return; }

      const rec = e.target.closest('.btn-rec');
      if (rec) { this.apply(rec.dataset.id, rec.dataset.kind); return; }

      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const url = location.href.split('#')[0] + '#/track/' + cp.dataset.copy;
        navigator.clipboard && navigator.clipboard.writeText(url).catch(() => {});
        toast(T('toastCopy'));
        return;
      }

      const dismiss = e.target.closest('[data-dismiss]');
      if (dismiss) { State.incident = null; this.update(); return; }

      const link = e.target.closest('.r-link');
      if (link) { location.hash = '#/track/' + link.dataset.id; return; }

      const row = e.target.closest('tr.r-row');
      if (row) { this.openDrawer(row.dataset.id); return; }
    });
    $('#tw-drawer').addEventListener('click', e => {
      const rec = e.target.closest('.btn-rec');
      if (rec) { this.apply(rec.dataset.id, rec.dataset.kind); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const url = location.href.split('#')[0] + '#/track/' + cp.dataset.copy;
        navigator.clipboard && navigator.clipboard.writeText(url).catch(() => {});
        toast(T('toastCopy'));
        return;
      }
      if (e.target.closest('.dr-x')) closeDrawer();
    });
    $('#tw-drawer-veil').addEventListener('click', closeDrawer);
  },

  /* ------------------------------------------------ periodic update */
  update() {
    if (State.view !== 'tower' || !$('#tw-kpis')) return;
    const act = activeOrders();
    const risks = act.filter(o => riskOf(o) === 'risk').length;
    const lates = act.filter(o => ['late', 'informed'].includes(riskOf(o))).length;
    const saved = State.savedToday;
    const pct = onTimePct();
    const devs = act.filter(o => ['risk', 'late'].includes(riskOf(o))).map(o => o.eta - o.promised[1]);
    const avgDev = devs.length ? Math.round(devs.reduce((a, b) => a + b, 0) / devs.length) : 0;
    const outStops = act.filter(o => o.status === 'out').length;

    $('#tw-kpis').innerHTML = [
      [T('kOnTime'), pct.toFixed(1) + '%', T('kOnTimeSub', { v: State.startOnTime.toFixed(1) }), pct >= 90 ? 'good' : pct >= 75 ? 'warn' : 'bad'],
      [T('kRisk'), risks, T('kRiskSub'), risks ? 'warn' : 'good'],
      [T('kLate'), lates, T('kLateSub'), lates ? 'bad' : 'good'],
      [T('kSaved'), saved, T('kSavedSub'), 'good'],
      [T('kDev'), (avgDev > 0 ? '+' : '') + avgDev + ' min', T('kDevSub'), Math.abs(avgDev) > 10 ? 'warn' : 'good'],
      [T('kRoutes'), '6 / 6', T('kRoutesSub', { n: outStops }), 'good'],
    ].map(([l, v, s, c]) => `
      <div class="kpi k-${c}">
        <div class="kpi-label">${l}</div>
        <div class="kpi-value">${v}</div>
        <div class="kpi-sub">${s}</div>
      </div>`).join('');

    /* ---- risk table ---- */
    const rows = act.slice().sort((a, b) => sevOf(b) - sevOf(a) || (b.eta - b.promised[1]) - (a.eta - a.promised[1]));
    $('#tw-rows').innerHTML = rows.map(o => {
      const r = riskOf(o);
      const dev = Math.round(o.eta - o.promised[1]);
      const upcoming = o.status === 'picking' || o.status === 'loaded';
      const badge =
        r === 'late' ? `<span class="badge b-late">${T('bLate')}</span>` :
        r === 'informed' ? `<span class="badge b-info">${T('bSms')}</span>` :
        r === 'risk' ? `<span class="badge b-risk">${T('bRisk')}</span>` :
        r === 'saved' ? `<span class="badge b-saved">${T('bSaved')}</span>` :
        upcoming ? `<span class="badge b-up">${o.status === 'picking' ? T('bAtDc') : T('bLoaded')}</span>` :
        `<span class="badge b-ok">${T('bOk')}</span>`;
      const devChip = upcoming ? `<span class="dev-chip d-plan">${T('planned')}</span>` :
        `<span class="dev-chip ${dev > 0 ? 'd-late' : dev > -20 ? 'd-warn' : 'd-ok'}">${dev > 0 ? '+' : dev < 0 ? '−' : ''}${Math.abs(dev)} min</span>`;
      const trend = (o.bias > 0.6 && r === 'risk') ? ' <span class="trend-up">&#9650;</span>' : '';
      return `
      <tr class="r-row r-${r}" data-id="${o.id}">
        <td class="c-id"><b>${o.id}</b><span class="c-items">${T('itemsCount', { n: o.items.length })} · ${o.weight} kg</span></td>
        <td class="c-route">${o.routeId}<span>${o.vehicle}</span></td>
        <td class="c-dest">${o.district}<span>${CITY[o.city].name}</span></td>
        <td class="c-win">${hhwin(o.promised[0], o.promised[1])}</td>
        <td class="c-eta">${upcoming ? hhmm(o.promised[0]) : hhmm(o.eta)}${trend}</td>
        <td class="c-dev">${devChip}</td>
        <td class="c-badge">${badge}</td>
        <td class="c-link"><a class="r-link" data-id="${o.id}" title="${T('btnOpen')}">&#8599;</a></td>
      </tr>`;
    }).join('');

    $('#tw-riskcount').textContent = T('needAtt', { n: risks + lates });
    $('#tw-delivered').textContent = T('deliveredFoot', { n: State.deliveredToday });

    /* ---- feed ---- */
    const ico = { sys: '&#9881;', sms: '&#9993;', act: '&#9889;', inc: '&#9888;', slot: '&#9636;', cust: '&#128100;' };
    $('#tw-feed').innerHTML = State.feed.slice(0, 14).map(f => `
      <div class="f-row t-${f.type}"><span class="f-ico">${ico[f.type] || '&#9881;'}</span>
      <div class="f-txt">${esc(f.text)}</div><span class="f-time">${hhmm(f.t)}</span></div>`).join('');

    /* ---- capacity ---- */
    $('#tw-caps').innerHTML = GEO.routes.map(r => {
      const stops = act.filter(o => o.routeId === r.id).length;
      const worst = act.filter(o => o.routeId === r.id).reduce((m, o) => Math.max(m, sevOf(o)), 0);
      const col = State.vehicles[r.id].stalled ? 'bad' : worst >= 5 ? 'bad' : worst >= 4 ? 'warn' : 'ok';
      return `
      <div class="cap-row">
        <div class="cap-name"><b>${r.id}</b><span>${r.vehicle} · ${T('capStops', { n: stops })}${State.vehicles[r.id].stalled ? ' · ' + T('capStalled') : ''}</span></div>
        <div class="cap-bar"><i class="cb-${col}" style="width:${r.fill}%"></i></div>
        <span class="fill-pct">${r.fill}%</span>
      </div>`;
    }).join('');

    /* ---- incident banner ---- */
    const al = $('#tw-alert');
    if (State.incident && State.incident.until > nowMin()) {
      al.innerHTML = `
      <div class="alert">
        <span class="a-ico">&#9888;</span>
        <div><b>${esc(State.incident.title)}</b><span>${esc(State.incident.detail)}</span></div>
        <button data-dismiss="1">&#10005;</button>
      </div>`;
    } else { al.innerHTML = ''; if (State.incident) State.incident = null; }

    /* ---- vehicle rings on the map ---- */
    GEO.routes.forEach(r => {
      const worst = act.filter(o => o.routeId === r.id).reduce((m, o) => Math.max(m, sevOf(o)), 0);
      const g = document.getElementById('veh-' + r.vehicle);
      if (g) {
        const ring = g.querySelector('.veh-ring');
        const col = State.vehicles[r.id].stalled || worst >= 5 ? 'var(--red-br)' : worst >= 4 ? 'var(--amber-br)' : 'var(--blue)';
        ring.style.stroke = col;
        g.classList.toggle('veh-bad', State.vehicles[r.id].stalled || worst >= 5);
      }
    });

    /* ---- drawer refresh (if open) ---- */
    if (State.selected) this.renderDrawer(State.selected);
  },

  /* ------------------------------------------------ order drawer */
  openDrawer(id) {
    State.selected = id;
    this.renderDrawer(id);
    $('#tw-drawer').hidden = false;
    $('#tw-drawer-veil').hidden = false;
  },

  renderDrawer(id) {
    const o = State.orders.find(x => x.id === id);
    if (!o) { closeDrawer(); return; }
    const r = riskOf(o);
    const dev = Math.round(o.eta - o.promised[1]);
    const route = GEO.routes.find(x => x.id === o.routeId);
    const dc = GEO.dcs[route.dc];
    const badge =
      r === 'late' ? `<span class="badge b-late">${T('bLate')}</span>` :
      r === 'informed' ? `<span class="badge b-info">${T('bSms')}</span>` :
      r === 'risk' ? `<span class="badge b-risk">${T('bRisk')}</span>` :
      r === 'saved' ? `<span class="badge b-saved">${T('bSaved')}</span>` :
      `<span class="badge b-ok">${T('bOk')}</span>`;

    let recsHtml;
    if (r === 'risk' || r === 'late') {
      recsHtml = recommendationsFor(o).map(rec => `
        <div class="rec">
          <div class="rec-head">
            <span class="rec-ico">${rec.icon}</span>
            <div><div class="rec-title">${rec.title}</div><div class="rec-why">${rec.why}</div></div>
            <span class="rec-prob">${rec.prob}%</span>
          </div>
          <div class="rec-foot">
            <span class="rec-impacts">${rec.impact.map(i => `<i class="imp-chip">${i}</i>`).join('')}</span>
            <button class="btn-rec" data-id="${o.id}" data-kind="${rec.kind}">${T('btnExecute')}</button>
          </div>
        </div>`).join('');
    } else if (r === 'saved') {
      recsHtml = `<div class="rec-done">
        <span class="ok-ico">&#10003;</span>
        <div><b>${T('recExecuted')}</b>
        <span>${o.by === 'customer' ? T('recByCust') : T('recByTower')}
        ${T('recNewWin')} <b>${hhwin(o.promised[0], o.promised[1])}</b></span></div></div>`;
    } else if (r === 'informed') {
      recsHtml = `<div class="rec-done"><span class="warn-ico">&#9993;</span>
        <div><b>${T('recSmsT')}</b><span>${T('recSmsW')}</span></div></div>`;
    } else {
      recsHtml = `<div class="rec-done"><span class="ok-ico">&#9679;</span>
        <div><b>${T('recNone')}</b><span>${T('recNoneWhy')}</span></div></div>`;
    }

    const url = location.href.split('#')[0] + '#/track/' + o.id;
    $('#tw-drawer').innerHTML = `
      <div class="dr-head">
        <div>
          <div class="dr-id">${o.id} ${badge}</div>
          <div class="dr-cust">${esc(o.name)} · ${o.phone}</div>
        </div>
        <button class="dr-x" title="Close">&#10005;</button>
      </div>
      <div class="dr-scroll">
        <div class="dr-grid">
          <div class="dr-block"><h5>${T('drDelivery')}</h5><p>${esc(o.address)}</p><p class="mut">${esc(o.district)} · ${CITY[o.city].name}</p></div>
          <div class="dr-block"><h5>${T('drRoute')}</h5><p>${o.routeId} · ${o.vehicle}</p><p class="mut">${T('fromDc', { dc: dc.label })}</p></div>
          <div class="dr-block"><h5>${T('drValue')}</h5><p>${fmtKr(o.value)}</p><p class="mut">${o.weight} kg · ${T('itemsCount', { n: o.items.length })}</p></div>
        </div>
        <div class="dr-block"><h5>${T('drItems')}</h5>
          <ul class="dr-items">${o.items.map(i => `<li><span>${esc(i.name)}</span><b>${i.qty} ×</b></li>`).join('')}</ul>
        </div>
        <div class="dr-block"><h5>${T('drCompare')}</h5>
          <div class="winbars">
            <div class="wb"><span>${T('drWindow')}</span><b>${hhwin(o.promised[0], o.promised[1])}</b></div>
            <div class="wb"><span>${T('drEta')}</span><b class="${dev > 0 ? 'txt-red' : dev > -20 ? 'txt-amber' : 'txt-green'}">${hhmm(o.eta)}</b></div>
            <div class="wb"><span>${T('drDev')}</span><b class="${dev > 0 ? 'txt-red' : dev > -20 ? 'txt-amber' : 'txt-green'}">${dev > 0 ? '+' : ''}${dev} min</b></div>
          </div>
        </div>
        <div class="dr-block"><h5>${T('drRecs')}</h5>${recsHtml}</div>
        <div class="dr-block dr-link">
          <h5>${T('drLink')}</h5>
          <div class="link-row"><code>${esc(url)}</code>
            <button class="btn btn-ghost btn-sm" data-copy="${o.id}">${T('btnCopy')}</button>
            <a class="btn btn-sm" href="#/track/${o.id}">${T('btnOpen')}</a>
          </div>
        </div>
      </div>`;
  },

  /* ------------------------------------------------ execute action */
  apply(id, kind) {
    const o = State.orders.find(x => x.id === id);
    if (!o) return;
    const n = nowMin();

    if (kind === 'reslot') {
      const s = Math.max(o.promised[1] + 5, n + 25);
      o.promised = [s, s + 120];
      o.eta = s + randi(6, 14);
      o.status = 'rescheduled'; o.by = 'tower';
      o.sms.push({ dir: 'out', time: hhmm(n), text: smsText('moved', o) });
      State.savedToday++; State.smsToday++;
      logEvent('act', `Executed — re-slot ${o.id} → ${hhwin(o.promised[0], o.promised[1])} · SMS sent to customer`);
      toast(T('toastReslot', { id: o.id, win: hhwin(o.promised[0], o.promised[1]) }));

    } else if (kind === 'reslot-nextday') {
      const s = (Math.floor(n / 1440) + 1) * 1440 + 9 * 60;
      o.promised = [s, s + 120];
      o.eta = s + randi(8, 18);
      o.status = 'rescheduled'; o.by = 'tower';
      o.sms.push({ dir: 'out', time: hhmm(n), text: smsText('moved', o) + T('voucherApplied') });
      State.savedToday++; State.smsToday++;
      logEvent('act', `Executed — ${o.id} moved to tomorrow 09:00–11:00 + 150 kr voucher · SMS sent`);
      toast(T('toastNextday', { id: o.id }));

    } else if (kind === 'reassign') {
      const route = GEO.routes.find(r => r.id === o.routeId);
      const alt = route.alt;
      const gain = randi(20, 34);
      o.vehicle = alt;
      o.eta = Math.max(n + 8, o.eta - gain);
      if (o.eta <= o.promised[1]) { o.status = 'rescheduled'; o.by = 'tower'; State.savedToday++; }
      o.sms.push({ dir: 'out', time: hhmm(n), text: smsText('moved', o) });
      State.smsToday++;
      logEvent('act', `Executed — ${o.id} reassigned to ${alt} · ETA −${gain} min${o.status === 'rescheduled' ? ' · saved' : ''}`);
      toast(T('toastReassign', { id: o.id, v: alt }));

    } else if (kind === 'reseq') {
      o.eta = Math.max(n + 8, o.eta - 18);
      if (o.eta <= o.promised[1]) { o.status = 'rescheduled'; o.by = 'tower'; State.savedToday++; }
      logEvent('act', `Executed — ${o.district} moved to stop #1 on ${o.routeId} · ${o.id} ETA −18 min`);
      toast(T('toastReseq', { id: o.id }));

    } else if (kind === 'notify') {
      o.status = 'informed';
      State.smsToday++;
      o.sms.push({ dir: 'out', time: hhmm(n), text: smsText('late', o) });
      logEvent('sms', `Proactive delay SMS sent — ${o.id} (T−${Math.max(5, Math.round(o.promised[1] - n))} min before window end)`);
      toast(T('toastSms', { id: o.id }));
    }

    this.update();
    if (State.view === 'track') Customer.render();
  },

  /* ------------------------------------------------ scenarios */
  scenario(kind) {
    const n = nowMin();
    if (kind === 'reset') { resetDemo(); this.mount(); toast(T('toastReset')); return; }

    if (kind === 'traffic') {
      State.incident = { t: n, title: 'E4 Södertälje — 6 km queue (northbound)', detail: 'Stockholm routes re-scored · ORTEC recommends action within 12 min', until: n + 20 };
      State.orders.filter(o => o.city === 'stockholm' && !['delivered', 'rescheduled'].includes(o.status))
        .forEach(o => { o.eta += randi(16, 30); });
      logEvent('inc', 'Traffic — E4 Södertälje 6 km queue · STH routes +16–30 min · re-scoring complete');
      toast(T('toastScnTraffic'));

    } else if (kind === 'breakdown') {
      State.vehicles['STH-04'].stalled = true;
      const affected = State.orders.filter(o => o.routeId === 'STH-04' && o.status === 'out');
      affected.forEach(o => { o.eta += randi(35, 55); });
      State.incident = { t: n, title: 'TRK-118 (STH-04) — breakdown at Årsta', detail: `${affected.length} orders affected · reassign to TRK-121 recommended`, until: n + 20 };
      logEvent('inc', `Breakdown — TRK-118 at Årsta · ${affected.length} stops affected · tow ETA 22 min`);
      toast(T('toastScnBrk'));
    }
    this.update();
  },
};
