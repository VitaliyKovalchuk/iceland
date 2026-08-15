const D = JSON.parse(document.getElementById('trip').textContent);
const LOC = D.locations, V = D.variants;
const $ = s => document.querySelector(s);
const el = (t, a = {}, kids = []) => {
  const n = document.createElementNS(a.ns || 'http://www.w3.org/1999/xhtml', t);
  for (const [k, v] of Object.entries(a)) {
    if (k === 'ns' || v == null) continue;
    if (k === 'text') n.textContent = v; else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => c && n.appendChild(c));
  return n;
};
const S = (t, a = {}, k = []) => el(t, { ...a, ns: 'http://www.w3.org/2000/svg' }, k);
const isk = n => n.toLocaleString('en-US');
const eur = n => '€' + Math.round(n / D.isk_eur).toLocaleString('en-US');
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const mins = t => t ? (+t.slice(0, 2) * 60 + +t.slice(3, 5)) : null;
const dur = m => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m / 60} h`) : `${m} min`;
const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const dayCol = i => css('--d' + Math.min(i, 8));
// Google Maps by place name, not coordinates — readable links that snap to the real place
const q = s => encodeURIComponent(s);
const gmaps = loc => `https://www.google.com/maps/search/?api=1&query=${q(LOC[loc].search)}`;
function gmapsDir(stops) {
  const seq = [];
  stops.forEach(s => { if (!seq.length || seq[seq.length - 1] !== s.loc) seq.push(s.loc); });
  if (seq.length < 2) return null;
  let wp = seq.slice(1, -1);
  if (wp.length > 9) { const st = (wp.length - 1) / 8; wp = Array.from({ length: 9 }, (_, i) => wp[Math.round(i * st)]); }
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving' +
    `&origin=${q(LOC[seq[0]].search)}&destination=${q(LOC[seq[seq.length - 1]].search)}` +
    (wp.length ? `&waypoints=${wp.map(l => q(LOC[l].search)).join('|')}` : '');
}

/* theme */
const THEMES = ['auto', 'light', 'dark'];
let theme = localStorage.getItem('is-theme') || 'auto';
const isDark = () => theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
function applyTheme() {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  $('#themeBtn').textContent = 'Theme: ' + theme;
  localStorage.setItem('is-theme', theme);
  Object.values(MAPS).forEach(m => { m.setTiles(); m.draw(); });
  document.querySelectorAll('[data-redraw]').forEach(n => n.dispatchEvent(new Event('redraw')));
}
$('#themeBtn').onclick = () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; applyTheme(); };

/* facts */
[['Out', 'Oct 2, 21:00 → land ~23:00'], ['Back', 'Oct 10, 23:30 from KEF'],
 ['On the ground', '8 days · 8 nights'], ['Party', '3 · one couple + one friend'],
 ['Vehicle', 'Small 4×4, self-drive'], ['Clock', 'GMT, no DST']]
  .forEach(([k, v]) => $('#facts').append(el('div', { class: 'fact' },
    [el('dt', { text: k }), el('dd', { text: v })])));

/* ---------------- daylight bar ---------------- */
function daylightBar(d) {
  const W = 1000, H = 54, T0 = 330, T1 = 1320, x = m => (m - T0) / (T1 - T0) * W;
  const rise = mins(d.sunrise), set = mins(d.sunset);
  const svg = S('svg', { viewBox: `-26 0 ${W + 52} ${H}`, role: 'img',
    'aria-label': `${d.date}: driving starts ${d.start}, day ends ${d.ends}. ` +
      `Sunrise ${d.sunrise}, sunset ${d.sunset}.` +
      (d.after_dark.length ? ` ${d.after_dark.length} stop(s) fall after dark.` : '') });
  const band = (a, b, f) => svg.append(S('rect', { x: x(a), y: 0, width: Math.max(0, x(b) - x(a)), height: 30, fill: f }));
  band(T0, rise - 45, 'var(--night)'); band(rise - 45, rise, 'var(--twilight)');
  band(rise, set, 'var(--accent-soft)');
  band(set, set + 40, 'var(--twilight)'); band(set + 40, T1, 'var(--night)');
  [rise, set].forEach(m => svg.append(S('line', { x1: x(m), y1: 0, x2: x(m), y2: 30,
    stroke: 'var(--ink-3)', 'stroke-width': 1 })));
  for (let t = 360; t <= 1320; t += 60) {
    svg.append(S('line', { x1: x(t), y1: 26, x2: x(t), y2: 30, stroke: 'var(--ink-3)', 'stroke-width': .6, opacity: .5 }));
    if (t % 180 === 0) svg.append(S('text', { x: x(t), y: 48, 'text-anchor': 'middle',
      fill: 'var(--ink-3)', 'font-size': 11, 'font-family': 'var(--mono)', text: hhmm(t) }));
  }
  d.stops.forEach(s => {
    const a = mins(s.arrive), b = mins(s.depart);
    if (a == null && b == null) return;
    const s0 = a ?? b, s1 = Math.max(b ?? a, (a ?? b) + 6);
    const dark = s0 > set || s0 < rise;
    svg.append(S('rect', { x: x(s0), y: 5, width: Math.max(3, x(s1) - x(s0)), height: 20, rx: 3,
      fill: dark ? 'var(--bad)' : dayCol(d.day), stroke: 'var(--surface)', 'stroke-width': 2 }));
  });
  return svg;
}

/* ---------------- leaflet map per variant ---------------- */
const MAPS = {};
function buildMap(v, host) {
  const state = { day: 'all', beds: false, missed: false };
  const box = el('div', { class: 'mapbox' });
  const div = el('div', { class: 'lmap' });
  const hint = el('div', { class: 'zoomhint', text: 'Click map to scroll-zoom' });
  const legend = el('div', { class: 'legend' });
  box.append(div, hint, legend);
  const panel = el('div', { class: 'panel' });
  const ph = el('div', { class: 'panel-head' });
  const pt = el('h3'), ps = el('div', { class: 'sub' });
  const gb = el('a', { class: 'gbtn', target: '_blank', rel: 'noopener', href: '#' });
  ph.append(pt, ps, gb);
  const list = el('ul', { class: 'stoplist' });
  panel.append(ph, list);
  const chips = el('div', { class: 'daychips' });
  const ctl = el('div', { class: 'controls' }, [el('span', { class: 'eyebrow', text: 'Day' }), chips]);
  const cb = (lab, f) => {
    const i = el('input', { type: 'checkbox' });
    i.onchange = () => { f(i.checked); api.draw(); };
    return el('label', { class: 'chk' }, [i, document.createTextNode(lab)]);
  };
  ctl.append(cb('Show where you sleep', b => state.beds = b),
             cb('Show top-20 sights you miss', b => state.missed = b));
  host.append(ctl, el('div', { class: 'maprow' }, [box, panel]));

  const map = L.map(div, { zoomControl: true, scrollWheelZoom: false }).setView([64.6, -19], 6);
  const routeL = L.layerGroup().addTo(map), pinL = L.layerGroup().addTo(map);
  const bedL = L.layerGroup().addTo(map), missL = L.layerGroup().addTo(map);
  let tiles = null;
  map.on('click', () => { map.scrollWheelZoom.enable(); hint.classList.add('off'); });
  div.addEventListener('mouseleave', () => { map.scrollWheelZoom.disable(); hint.classList.remove('off'); });

  const mk = (lab, val, col) => {
    const b = el('button', { class: 'daychip', type: 'button' }, col ? [el('span', { class: 'sw', style: `background:${col}` })] : []);
    b.append(document.createTextNode(lab));
    b.onclick = () => { state.day = val; api.draw(); };
    return b;
  };
  chips.append(mk('All', 'all', null));
  v.days.forEach(d => chips.append(mk(String(d.day), String(d.day), dayCol(d.day))));

  const api = {
    setTiles() {
      if (tiles) map.removeLayer(tiles);
      tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/${isDark() ? 'dark_all' : 'voyager'}/{z}/{x}/{y}{r}.png`,
        { subdomains: 'abcd', maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(map);
      tiles.bringToBack();
    },
    invalidate() { map.invalidateSize(); },
    draw() {
      routeL.clearLayers(); pinL.clearLayers(); bedL.clearLayers(); missL.clearLayers();
      [...chips.children].forEach(b => b.setAttribute('aria-pressed',
        b.textContent.trim() === (state.day === 'all' ? 'All' : state.day)));
      const bounds = L.latLngBounds([]);
      const shown = state.day === 'all' ? v.days : v.days.filter(d => d.day === +state.day);
      v.days.slice().sort((a, b) => (a.day === +state.day) - (b.day === +state.day)).forEach(d => {
        if (!d.road || !d.road.length) return;
        const on = state.day === 'all' || d.day === +state.day;
        L.polyline(d.road, { color: dayCol(d.day), weight: on ? 4.5 : 2, opacity: on ? .95 : .28,
          lineCap: 'round', lineJoin: 'round' }).addTo(routeL);
        if (on) bounds.extend(d.road);
      });
      const single = state.day !== 'all', seen = new Set();
      shown.forEach(d => d.stops.forEach((s, i) => {
        const L_ = LOC[s.loc], key = `${d.day}:${s.loc}`;
        if (seen.has(key)) return; seen.add(key);
        const drop = s.optional;
        L.marker([L_.lat, L_.lng], {
          icon: L.divIcon({ className: '', iconSize: single ? [22, 22] : [13, 13],
            iconAnchor: single ? [11, 11] : [6.5, 6.5],
            html: `<span class="mk${drop ? ' drop' : ''}${single ? '' : ' small'}" style="--c:${dayCol(d.day)}">${single ? i + 1 : ''}</span>` }),
          riseOnHover: true
        }).bindPopup(`<h4>${L_.name}</h4><span class="t">${d.date}${s.arrive ? ' · ' + s.arrive : ''}` +
            `${drop ? ' · droppable' : ''}${L_.coffee === 'cafe' ? ' · café' : ''}</span>` +
            `<p>${s.activity}${s.note ? '<br><em>' + s.note + '</em>' : ''}</p>` +
            `<a href="${gmaps(s.loc)}" target="_blank" rel="noopener">Open in Google Maps →</a>`, { maxWidth: 265 })
          .bindTooltip(L_.name, { direction: 'top', offset: [0, -10] }).addTo(pinL);
        bounds.extend([L_.lat, L_.lng]);
      }));
      if (state.beds) v.beds_detail.forEach(b => {
        const L_ = LOC[b.loc];
        L.marker([L_.lat, L_.lng], { icon: L.divIcon({ className: '', iconSize: [24, 24],
          iconAnchor: [12, 12], html: `<span class="mk bed">${b.night}</span>` }), zIndexOffset: 800 })
          .bindPopup(`<h4>${b.town}</h4><span class="t">Night ${b.night} · ${b.date}</span>` +
            `<p>${isk(b.isk)} ISK / ${eur(b.isk)} for two rooms${b.est ? ' — my estimate, not in the source file' : ''}</p>`)
          .bindTooltip(`Night ${b.night}: ${b.town}`, { direction: 'top', offset: [0, -12] }).addTo(bedL);
        bounds.extend([L_.lat, L_.lng]);
      });
      if (state.missed) D.top.items.filter(i => i.lat && !v.top20.includes(i.rank)).forEach(i => {
        L.marker([i.lat, i.lng], { icon: L.divIcon({ className: '', iconSize: [15, 15],
          iconAnchor: [7.5, 7.5], html: '<span class="mk miss"></span>' }) })
          .bindPopup(`<h4>${i.name}</h4><span class="t">#${i.rank} · ${i.status.replace('_', ' ')}</span><p>${i.where}</p>`)
          .bindTooltip(i.name, { direction: 'top', offset: [0, -8] }).addTo(missL);
        bounds.extend([i.lat, i.lng]);
      });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });

      const km = shown.reduce((a, d) => a + d.km, 0), mn = shown.reduce((a, d) => a + d.min, 0);
      const dp = shown.reduce((a, d) => a + d.droppable_min, 0);
      pt.textContent = state.day === 'all' ? `${v.name} · all 8 days`
        : `${shown[0].date} · ${shown[0].title}`;
      ps.textContent = `${isk(km)} km · ${dur(mn)} driving · ${dp ? dur(dp) + ' droppable' : 'nothing droppable'}`;
      const url = gmapsDir(shown.flatMap(d => d.stops));
      gb.href = url || '#'; gb.style.display = url ? '' : 'none';
      gb.textContent = state.day === 'all' ? 'Open the whole trip in Google Maps' : 'Open this day in Google Maps';

      list.replaceChildren();
      shown.forEach(d => {
        if (state.day === 'all') list.append(el('li', { class: 'hd' },
          el('span', { class: 'eyebrow', style: `color:${dayCol(d.day)};font-weight:700`,
            text: `${d.date} — ${d.title}` })));
        d.stops.forEach(s => {
          const L_ = LOC[s.loc];
          const li = el('li');
          li.append(el('div', { class: 'when', text: s.arrive && s.depart ? `${s.arrive}\n${s.depart}` : (s.arrive || s.depart || '—') }));
          const body = el('div', {}, [el('div', { class: 'nm', text: L_.name }),
            el('div', { class: 'act', text: s.activity })]);
          const bs = el('div', { class: 'badges' });
          if (s.optional) bs.append(el('span', { class: 'b drop', text: `drop · ${s.duration_min}m` }));
          if (s.ticket) bs.append(el('span', { class: 'b tk', text: 'ticket' }));
          if (s.hike) bs.append(el('span', { class: 'b hk', text: 'on foot' }));
          if (L_.coffee === 'cafe') bs.append(el('span', { class: 'b cf', text: '☕ café' }));
          if (d.after_dark.includes(s.loc)) bs.append(el('span', { class: 'b dk', text: 'after dark' }));
          if (bs.children.length) body.append(bs);
          if (s.drive_to_next_min) body.append(el('div', { class: 'leg',
            text: `↓ ${s.drive_to_next_km} km · ${s.drive_to_next_min} min` }));
          li.append(body);
          li.onclick = () => { map.setView([L_.lat, L_.lng], Math.max(map.getZoom(), 10)); };
          list.append(li);
        });
      });
      legend.replaceChildren();
      if (state.day === 'all') {
        legend.append(el('span', { text: 'OCT 3' }));
        v.days.forEach(d => legend.append(el('span', {},
          el('span', { style: `width:17px;height:4px;border-radius:2px;background:${dayCol(d.day)}` }))));
        legend.append(el('span', { text: 'OCT 10' }));
      } else legend.append(el('span', {}, [el('span', {
        style: `width:18px;height:4px;border-radius:2px;background:${dayCol(+state.day)}` }),
        document.createTextNode(shown[0].date.toUpperCase())]));
      legend.append(el('span', {}, [el('span', { style: 'width:11px;height:11px;border-radius:50%;border:2px dashed var(--ink-3)' }),
        document.createTextNode('DROPPABLE / MISSED')]));
    }
  };
  MAPS[v.id] = api;
  api.setTiles();
  return api;
}

/* ---------------- variant panel ---------------- */
function variantPanel(v) {
  const root = el('div', { role: 'tabpanel', id: 'panel-' + v.id, hidden: true });
  const hero = el('section', { class: 'vhero' });
  hero.append(el('p', { class: 'eyebrow', text: `Variant ${v.id}` }),
    el('h2', { text: v.name }), el('p', { class: 'tag', text: v.tagline }));
  const worstD = v.days.find(d => d.min === v.worst);
  const stats = el('div', { class: 'hstats' });
  const st = (val, k, cls) => stats.append(el('div', { class: 'hstat ' + (cls || '') },
    [el('span', { class: 'v', text: val }), el('span', { class: 'k', text: k })]));
  st(isk(v.km) + ' km', 'driving, padded');
  st(v.hours + ' h', 'behind the wheel');
  st(dur(v.worst), 'worst day · ' + worstD.date, v.worst >= 330 ? 'bad' : v.worst <= 305 ? 'good' : '');
  st(v.stops_count, 'distinct places');
  st(v.top20.length + ' / 20', 'top-20 sights');
  st(eur(v.total_isk), 'all-in, 3 people');
  hero.append(stats);
  root.append(hero);

  const mapSec = el('section');
  mapSec.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'The route' }),
    el('p', { text: 'Real roads. Pick a day, click any marker or list row. Google Maps links use place names, so they open the actual place.' })]));
  root.append(mapSec);
  const mapHost = el('div'); mapSec.append(mapHost);

  const bedSec = el('section');
  bedSec.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'Where you sleep' }),
    el('p', { text: `${v.beds_detail.length} nights · ${isk(v.lodging_isk)} ISK / ${eur(v.lodging_isk)} for two rooms throughout.` })]));
  const beds = el('div', { class: 'beds' });
  v.beds_detail.forEach(b => beds.append(el('div', { class: 'bed' }, [
    el('div', { class: 'd', text: `N${b.night} · ${b.date}` }),
    el('div', { class: 't' }, [document.createTextNode(b.town),
      b.est ? el('span', { class: 'est', text: 'est' }) : null]),
    el('div', { class: 'p', text: `${eur(b.isk)} · ${isk(b.isk / 1000)}k ISK` })])));
  bedSec.append(beds);
  root.append(bedSec);

  const daySec = el('section');
  daySec.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'Day by day' }),
    el('p', { text: 'The bar is real daylight for that date. Red blocks are stops that begin after sunset.' })]));
  const days = el('div', { class: 'days' });
  v.days.forEach(d => {
    const card = el('div', { class: 'day', 'data-i': d.intensity });
    card.append(el('div', { class: 'sev' }));
    const inn = el('div', { class: 'day-in' });
    inn.append(el('div', { class: 'day-top' }, [
      el('span', { class: 'day-n', text: `${d.date.toUpperCase()} · DAY ${d.day}` }),
      el('h3', { text: d.title }),
      el('span', { class: 'ipill', 'data-i': d.intensity, text: d.intensity })]));
    inn.append(el('div', { class: 'day-meta' }, [
      document.createTextNode(`${d.from} → ${d.to}  ·  `),
      el('b', { text: `${d.km} km · ${dur(d.min)} driving` }),
      document.createTextNode(`  ·  ${d.start} – ${d.ends}`)]));
    if (d.after_dark.length) inn.append(el('div', { class: 'warnbox',
      text: `Sunset is ${d.sunset}. ${d.after_dark.map(l => LOC[l].name).join(' and ')} ` +
        `${d.after_dark.length > 1 ? 'begin' : 'begins'} after it — fine for a hotel check-in, ` +
        `not for a waterfall path. Trim a stop earlier in the day if you want the light.` }));
    if (!d.cafes.length) inn.append(el('div', { class: 'warnbox coffee',
      text: 'No sit-down café on this route. Fill a thermos before you leave — ' +
        (d.n1.length ? `the best you'll find is the N1 at ${d.n1.join(' or ')}.` : 'there is nothing but petrol-station coffee.') }));
    else inn.append(el('div', { class: 'warnbox info',
      text: '☕ Coffee: ' + d.cafes.join(', ') + '.' }));
    const wrap = el('div', { class: 'dl' });
    wrap.append(daylightBar(d));
    wrap.append(el('div', { class: 'dl-cap' }, [
      el('span', { text: `SUNRISE ${d.sunrise}` }),
      el('span', { text: `${((mins(d.sunset) - mins(d.sunrise)) / 60).toFixed(1)} H OF LIGHT` }),
      el('span', { text: `SUNSET ${d.sunset}` })]));
    inn.append(wrap);

    const tbl = el('table', { class: 'stops' });
    tbl.append(el('thead', {}, el('tr', {}, ['Time', 'Stop', 'What', 'Next leg']
      .map(h => el('th', { text: h, style: h === 'Next leg' ? 'text-align:right' : '' })))));
    const tb = el('tbody');
    d.stops.forEach(s => {
      const L_ = LOC[s.loc];
      const tr = el('tr', { class: (s.optional ? 'opt ' : '') + (d.after_dark.includes(s.loc) ? 'dark' : '') });
      tr.append(el('td', { class: 't', text: s.arrive && s.depart ? `${s.arrive}–${s.depart}` : (s.arrive || s.depart || '—') }));
      tr.append(el('td', {}, el('a', { href: gmaps(s.loc), target: '_blank', rel: 'noopener', text: L_.name })));
      const what = el('td'); what.append(document.createTextNode(s.activity));
      const bs = el('div', { class: 'badges' });
      if (s.optional) bs.append(el('span', { class: 'b drop', text: `droppable · ${s.duration_min} min` }));
      if (s.ticket) bs.append(el('span', { class: 'b tk', text: 'ticket' }));
      if (s.hike) bs.append(el('span', { class: 'b hk', text: 'on foot' }));
      if (L_.coffee === 'cafe') bs.append(el('span', { class: 'b cf', text: '☕ café' }));
      if (bs.children.length) what.append(bs);
      if (s.note) what.append(el('div', { class: 'note', style: 'font-size:12.5px;margin-top:4px', text: s.note }));
      tr.append(what);
      tr.append(el('td', { class: 'd', text: s.drive_to_next_km ? `${s.drive_to_next_km} km / ${s.drive_to_next_min} min` : '—' }));
      tb.append(tr);
    });
    tbl.append(tb); inn.append(el('div', { class: 'scroll stops-wrap' }, tbl));
    const dl = gmapsDir(d.stops);
    if (dl) inn.append(el('a', { class: 'gbtn', href: dl, target: '_blank', rel: 'noopener',
      style: 'margin-top:14px', text: `Open ${d.date} in Google Maps` }));
    card.append(inn); days.append(card);
  });
  daySec.append(days); root.append(daySec);

  const bud = el('section');
  bud.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'What it costs' }),
    el('p', { text: 'Three people, two rooms, eight nights, nine days of car. EUR at 145 ISK.' })]));
  const t = el('table', { class: 'grid' });
  t.append(el('thead', {}, el('tr', {}, [el('th', { text: 'Line' }),
    el('th', { text: 'EUR', style: 'text-align:right' }), el('th', { text: 'ISK', style: 'text-align:right' })])));
  const tb2 = el('tbody');
  v.budget.forEach(li => tb2.append(el('tr', {}, [
    el('td', {}, [el('div', { style: 'font-weight:600', text: li.item }),
      el('div', { class: 'note', style: 'font-size:12.5px', text: li.note })]),
    el('td', { class: 'n', style: 'font-weight:600', text: eur(li.isk) }),
    el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(li.isk) })])));
  t.append(tb2);
  t.append(el('tfoot', {}, [
    el('tr', {}, [el('td', { text: 'Total for three' }),
      el('td', { class: 'n', style: 'font-size:17px', text: eur(v.total_isk) }),
      el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(v.total_isk) })]),
    el('tr', {}, [el('td', { text: 'Per person', style: 'font-weight:500;color:var(--ink-2)' }),
      el('td', { class: 'n', style: 'font-weight:500', text: eur(v.pp_isk) }),
      el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(v.pp_isk) })])]));
  bud.append(el('div', { class: 'scroll' }, t));
  root.append(bud);
  return { root, mapHost };
}

/* ---------------- compare panel ---------------- */
const GAINMISS = {
  W: { gains: ['Kirkjufell #11 and Kirkjufellsfoss', 'Arnarstapi–Hellnar coast #18',
      'Djúpalónssandur, the 1948 trawler wreck', 'Búðakirkja, black church in a lava field',
      'Gerðuberg basalt columns · Lóndrangar · Ytri Tunga seals · Rauðfeldsgjá',
      'Hraunfossar and Deildartunguhver, with the Krauma baths',
      'A night on Snæfellsnes — Grundarfjörður is one of three aurora bases the file names',
      'Múlagljúfur and Kvernufoss, both quiet and both excellent'],
    misses: ['Vestrahorn at Stokksnes', 'Höfn and the east fjords', 'Djúpivogur'],
    verdict: 'Sees the most by a distance — 38 places — and no day exceeds 5 h 02. The safe, generous choice.' },
  E: { gains: ['Vestrahorn #14 at golden hour, from a bed fifteen minutes away',
      'Two nights in Höfn — you unpack once in the east',
      'Djúpivogur and the east-fjord road, the emptiest tarmac of the trip',
      'Múlagljúfur AND Stokksnes — the file’s "pick one" fork disappears',
      'A second, unhurried pass at Jökulsárlón on the way back',
      'A 2 h 37 day — the only genuine rest day in any variant'],
    misses: ['All of Snæfellsnes — eight sights, two of them top-20',
      'Kirkjufell #11 and Arnarstapi #18', 'Hraunfossar, Deildartunguhver and Krauma'],
    verdict: 'The calmest week: 3.5 h less driving than W, and the only one with a real day off. Buys Vestrahorn with Snæfellsnes.' },
  WE: { gains: ['Vestrahorn #14 and Kirkjufell #11 and Arnarstapi #18 — 12 of the top 20, the most',
      'Both geographic ends of the country in one trip', 'A night in Höfn and a night in Borgarnes'],
    misses: ['Múlagljúfur, Kvernufoss, Lóndrangar, Ytri Tunga, Rauðfeldsgjá — cut for time',
      'Hraunfossar, Deildartunguhver, Krauma', 'A night on Snæfellsnes — you drive it and leave',
      'Vestrahorn at golden hour — you arrive mid-afternoon'],
    verdict: 'Visits fewer places than W (32 vs 38) while driving more, and Oct 9 is 7 h 23 with Kirkjufell at dusk. One extra tick, paid for dearly.' },
};
function comparePanel() {
  const root = el('div', { role: 'tabpanel', id: 'panel-CMP', hidden: true });
  const s = el('section', { style: 'padding-top:34px' });
  s.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'All three, side by side' }),
    el('p', { text: 'Shaded cell wins the row. Every figure is routed and padded 15 % for October.' })]));
  const t = el('table', { class: 'cmp' });
  t.append(el('thead', {}, el('tr', {}, [el('th', { text: '' })].concat(
    V.map(v => el('th', {}, [document.createTextNode(v.name), el('span', { text: 'Variant ' + v.id })]))))));
  const rows = [
    ['Driving', v => v.km, v => `${isk(v.km)} km`, v => `${v.hours} h behind the wheel`, 'min'],
    ['Worst single day', v => v.worst, v => dur(v.worst), v => v.days.find(d => d.min === v.worst).date + ' — ' + v.days.find(d => d.min === v.worst).title, 'min'],
    ['Easiest day', v => -Math.min(...v.days.map(d => d.min)), v => dur(Math.min(...v.days.map(d => d.min))), v => v.days.find(d => d.min === Math.min(...v.days.map(x => x.min))).date, 'min'],
    ['Places visited', v => -v.stops_count, v => String(v.stops_count), v => 'distinct stops', 'min'],
    ['Top-20 sights', v => -v.top20.length, v => v.top20.length + ' / 20', v => '#' + v.top20.join(', #'), 'min'],
    ['Nights, cheapest bed', v => v.lodging_isk, v => eur(v.lodging_isk), v => [...new Set(v.beds_detail.map(b => b.town))].join(' · '), 'min'],
    ['Total, three people', v => v.total_isk, v => eur(v.total_isk), v => `${eur(v.pp_isk)} each · ${isk(v.total_isk)} ISK`, 'min'],
    ['Stops after dark', v => v.days.reduce((a, d) => a + d.after_dark.length, 0), v => String(v.days.reduce((a, d) => a + d.after_dark.length, 0)), v => 'across all eight days', 'min'],
  ];
  const tb = el('tbody');
  rows.forEach(([label, score, main, sub]) => {
    const vals = V.map(score), best = Math.min(...vals);
    const tr = el('tr', {}, el('th', { text: label }));
    V.forEach((v, i) => tr.append(el('td', { class: vals[i] === best ? 'win' : (label === 'Worst single day' && v.worst >= 330 ? 'bad' : '') },
      [el('span', { class: 'val', text: main(v) }), el('span', { class: 'sub', text: sub(v) })])));
    tb.append(tr);
  });
  t.append(tb);
  s.append(el('div', { class: 'scroll' }, t));

  s.append(el('p', { class: 'note', style: 'margin-top:18px;max-width:70ch',
    text: 'The three land within €31 of each other, so price is not a tiebreaker — the extra ' +
      'lodging in one variant is cancelled by the extra fuel in another. Choose on pace and content.' }));

  const gm = el('div', { class: 'gm' });
  V.forEach(v => {
    const g = GAINMISS[v.id];
    const c = el('div', { class: 'gmcard' });
    c.append(el('p', { class: 'sid', text: 'Variant ' + v.id }), el('h3', { text: v.name }));
    c.append(el('h4', { class: 'g', text: 'You gain' }),
      el('ul', { class: 'g' }, g.gains.map(x => el('li', { text: x }))));
    c.append(el('h4', { class: 'm', text: 'You give up' }),
      el('ul', { class: 'm' }, g.misses.map(x => el('li', { text: x }))));
    c.append(el('p', { class: 'verdict', text: g.verdict }));
    gm.append(c);
  });
  s.append(gm);

  const s2 = el('section');
  s2.append(el('div', { class: 'sec-head' }, [el('h2', { text: 'True of all three' }),
    el('p', { text: 'The spine of the trip, and the things that will actually go wrong.' })]));
  const two = el('div', { class: 'two' });
  const shared = el('div', { class: 'box' });
  shared.append(el('h3', { text: 'Every variant includes' }));
  shared.append(el('p', { class: 'note', style: 'margin:0',
    text: 'Þingvellir · Geysir · Gullfoss · Kerið · Seljalandsfoss · Skógafoss · Sólheimajökull ' +
      'glacier hike · Dyrhólaey · Reynisfjara · Katla ice cave · Fjaðrárgljúfur · Skaftafell · ' +
      'Fjallsárlón · Jökulsárlón with the boat · Diamond Beach · Reykjadalur hot river · ' +
      'Gunnuhver · Brimketill · Blue Lagoon. That is nine of the top twenty and every headline ' +
      'sight on the south coast.' }));
  shared.append(el('h3', { style: 'margin-top:16px', text: 'Fixed decisions' }));
  const dl2 = el('dl');
  [['Arrival, Oct 2', 'Land ~23:00, bags ~23:40, shuttle and paperwork ~1 h → car about 00:40. Sleep in Keflavík, ten minutes away, not Reykjavík.'],
   ['Golden Circle, trimmed', 'Brúarfoss and Secret Lagoon are cut from Oct 3. The full version needs twelve hours against eleven of daylight, on four hours of sleep. You get the hot soak at Reykjadalur later, free.'],
   ['Blue Lagoon, not Sky', 'Twenty minutes from KEF, so it is both the last act and on the way out — and 2,000 ISK cheaper each. It sits in the Sundhnúkur eruption zone; if Reykjanes closes, swap to Sky Lagoon in Kópavogur and run Oct 10 in reverse.'],
   ['Departure, Oct 10', 'Bag drop closes ~22:30. Depot shuttle 45 min, damage check 30, fuel 15 — leave the lagoon by 20:00.']]
    .forEach(([k, v]) => dl2.append(el('div', {}, [el('dt', { text: k }), el('dd', { text: v })])));
  shared.append(dl2);
  const risk = el('div', { class: 'box' });
  risk.append(el('h3', { text: 'Ground truth' }));
  const dl3 = el('dl');
  const P = D.practical;
  [['Wind, the real disruptor', P.daily_checks], ['Fuel cards', P.fuel_cards],
   ['Fuel stops', P.fuel_stops], ['Coffee, honestly', P.coffee_reality],
   ['Northern lights', P.northern_lights], ['Volcanic status', P.volcanic_status]]
    .forEach(([k, v]) => dl3.append(el('div', {}, [el('dt', { text: k }), el('dd', { text: v })])));
  risk.append(dl3);
  two.append(shared, risk); s2.append(two);

  const bk = el('div', { class: 'box', style: 'margin-top:14px' });
  bk.append(el('h3', { text: 'Book in this order, whichever you pick' }));
  const ol = el('ol');
  D.booking_order.forEach(x => ol.append(el('li', {}, [el('b', { text: x.what }), el('span', { text: x.why })])));
  bk.append(ol); s2.append(bk);
  root.append(s, s2);
  return root;
}

/* ---------------- assemble ---------------- */
const TABS = V.map(v => ({ id: v.id, label: v.name, sub: `${v.hours} h · ${v.stops_count} places` }))
  .concat([{ id: 'CMP', label: 'Compare', sub: 'all three, every aspect' }]);
const panels = $('#panels'), tabsHost = $('#tabs');
const built = {};
V.forEach(v => {
  const { root, mapHost } = variantPanel(v);
  panels.append(root); built[v.id] = { root, mapHost, v, made: false };
});
const cmp = comparePanel(); panels.append(cmp); built.CMP = { root: cmp };

TABS.forEach(t => {
  const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false',
    'aria-controls': 'panel-' + t.id });
  b.append(document.createTextNode(t.label), el('span', { class: 'sub', text: t.sub }));
  b.onclick = () => show(t.id);
  tabsHost.append(b);
});
function show(id) {
  TABS.forEach((t, i) => {
    tabsHost.children[i].setAttribute('aria-selected', String(t.id === id));
    built[t.id].root.hidden = t.id !== id;
  });
  const b = built[id];
  if (b.v && !b.made) { buildMap(b.v, b.mapHost); b.made = true; }
  if (b.v) { MAPS[id].draw(); requestAnimationFrame(() => MAPS[id].invalidate()); }
  location.hash = id;
  window.scrollTo({ top: 0 });
}
const footer = el('footer');
footer.append(el('b', { text: 'How these numbers were made, and where they are soft:' }));
footer.append(el('ul', {}, [
  el('li', { text: 'Every leg is routed on real roads (OSRM, OpenStreetMap data) between the actual stops, then padded 15 % for October wind, gravel spurs and single-lane bridges. The source planning file’s own figures were low by up to seven hours.' }),
  el('li', { text: 'Arrival and departure times come from your flights: out 21:00 on 2 October, back 23:30 on 10 October. Car collection and return are built into the first and last days.' }),
  el('li', { text: 'Sunrise and sunset are interpolated between the source file’s 1, 7 and 14 October reference points. Confirm on timeanddate.com before booking anything timed.' }),
  el('li', { text: 'Lodging for Höfn, Borgarnes and Keflavík is my estimate — those towns are not priced in the source file. They are marked EST wherever they appear.' }),
  el('li', { text: 'Prices are August 2026 research and will drift. No variant is recommended over another here; the comparison tab shades the winner of each row, not of the trip.' })]));
footer.append(el('div', { class: 'credits', html:
  'Map tiles &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> · ' +
  'Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · ' +
  'Routing by <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a> · ' +
  '<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a> 1.9.4, BSD-2-Clause' }));
panels.append(footer);

applyTheme();
show(TABS.some(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : 'W');
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (theme === 'auto') applyTheme(); });