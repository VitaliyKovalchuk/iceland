const D = JSON.parse(document.getElementById('trip').textContent);
const POI = D.poi, KEYS = D.keys, FIX = D.fixed, PAD = 1.15;
const IDX = {}; KEYS.forEach((k, i) => IDX[k] = i);
const GEO = { ...D.geo };
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
const S_ = (t, a = {}, k = []) => el(t, { ...a, ns: 'http://www.w3.org/2000/svg' }, k);
const isk = n => Math.round(n).toLocaleString('en-US');
const eur = n => '€' + Math.round(n / D.isk_eur).toLocaleString('en-US');
const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' +
  String(Math.round(m) % 60).padStart(2, '0') + (m >= 1440 ? ' +1' : '');
const mins = t => t ? (+t.slice(0, 2) * 60 + +t.slice(3, 5)) : 0;
const dur = m => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m / 60} h`) : `${m} min`;
const q = s => encodeURIComponent(s);
const gmaps = k => `https://www.google.com/maps/search/?api=1&query=${q(POI[k].search)}`;
const mx = k => IDX[POI[k].mx || k];
const legMin = (a, b) => a === b ? 0 : Math.round(D.dur[mx(a)][mx(b)] * PAD);
const legKm = (a, b) => a === b ? 0 : D.dist[mx(a)][mx(b)];
/* Sunrise/sunset at a point and date (NOAA). Iceland is UTC year-round, so this IS local
   time. One Reykjavík column was up to 16 min optimistic in the southeast and 16 min
   conservative on Snæfellsnes — the sign flips with longitude, so no single column is safe.
   Computed per stop, so it stays correct when you add one. */
const SUN_CACHE = {};
function sunTimes(lat, lng, dayOfMonth) {
  const ck = `${lat}|${lng}|${dayOfMonth}`;
  if (SUN_CACHE[ck]) return SUN_CACHE[ck];
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  let y = 2026, m = 10, d = dayOfMonth;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M * rad) * (1.914602 - t * (0.004817 + 0.000014 * t))
          + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * t)
          + Math.sin(3 * M * rad) * 0.000289;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * rad);
  const eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
            + 0.00256 * Math.cos((125.04 - 1934.136 * t) * rad);
  const dec = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)) * deg;
  const yy = Math.tan(eps / 2 * rad) ** 2;
  const eot = 4 * deg * (yy * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad)
            + 4 * e * yy * Math.sin(M * rad) * Math.cos(2 * L0 * rad)
            - 0.5 * yy * yy * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dec * rad))
             - Math.tan(lat * rad) * Math.tan(dec * rad);
  if (Math.abs(cosH) > 1) return (SUN_CACHE[ck] = { rise: 0, set: 1440 });
  const H = Math.acos(cosH) * deg, noon = 720 - 4 * lng - eot;
  return (SUN_CACHE[ck] = { rise: Math.round(noon - 4 * H), set: Math.round(noon + 4 * H) });
}
const dayNum = d => +d.date.split(' ')[1];
const sunAt = (loc, d) => sunTimes(POI[loc].lat, POI[loc].lng, dayNum(d));

const CATS = { waterfall: 'Waterfall', glacier: 'Glacier & ice', coast: 'Coast & beach',
  geothermal: 'Geothermal', canyon: 'Canyon', town: 'Town', spa: 'Pool & spa',
  viewpoint: 'Viewpoint', culture: 'Culture', hike: 'Hike', airport: 'Airport' };

/* ---------- state ---------- */
/* Bumped to v3 to orphan every copy saved before the plan was corrected. The version stamp
   below handles future updates gracefully; this key bump is the one-time hard reset. */
const PLAN_ID = D.planId || 'south';
const KEY = `iceland-${PLAN_ID}-v4`;
['iceland-planner', 'iceland-planner-v2', 'iceland-planner-v3', 'iceland-planner-v4'].forEach(k => {
  try { localStorage.removeItem(k); } catch (e) {}
});
const fresh = () => JSON.parse(JSON.stringify(D.days));
const BASE = JSON.stringify(D.days);          // the plan this build ships with
let ST = { days: fresh(), day: 0, basemap: 'streets', tab: 'plan',
           cat: 'all', showOther: true, showOff: false };
let staleBase = false;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved && Array.isArray(saved.days) && saved.days.length === D.days.length) {
    /* A saved copy must never silently outrank a newer shipped plan. If the base this copy
       was started from is gone, either the user never edited (take the update) or they did
       (keep their work, but say so — do not pretend nothing changed). */
    const untouched = saved.base && saved.base === JSON.stringify(saved.days);
    if (saved.base && saved.base !== BASE && untouched) {
      ST = { ...ST, ...saved, days: fresh() };        // clean copy of an old plan -> update it
    } else {
      ST = { ...ST, ...saved };
      staleBase = !!saved.base && saved.base !== BASE;
      if (!saved.base) staleBase = JSON.stringify(saved.days) !== BASE;  // pre-versioning save
    }
  }
} catch (e) { /* corrupt store — fall back to the shipped plan */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...ST, base: BASE })); } catch (e) {} };
const dirty = () => JSON.stringify(ST.days) !== BASE;

/* ---------- schedule ---------- */
function sched(d) {
  let t = mins(d.start), km = 0, mn = 0;
  const rows = d.stops.map((s, i) => {
    const arrive = t; t += (s.dwell || 0); const depart = t;
    let lm = 0, lk = 0;
    if (i < d.stops.length - 1) {
      lm = legMin(s.loc, d.stops[i + 1].loc); lk = legKm(s.loc, d.stops[i + 1].loc);
      t += lm; mn += lm; km += lk;
    }
    return { ...s, i, arrive, depart, legMin: lm, legKm: lk };
  });
  rows.forEach(r => {
    const su = sunAt(r.loc, d);
    r.rise = su.rise; r.set = su.set;
    r.dark = r.depart > su.set || r.arrive < su.rise;
  });
  // the band is drawn for where the day ENDS — that is the sunset that decides "did we make it"
  const endSun = sunAt(d.stops[d.stops.length - 1].loc, d);
  const set = endSun.set, rise = endSun.rise;
  return { rows, end: t, km, min: mn, rise, set,
    dark: rows.filter(r => r.dark),
    cafes: rows.filter(r => POI[r.loc].coffee === 'cafe').map(r => POI[r.loc].name),
    intensity: mn >= 330 ? 'hard' : mn >= 270 ? 'full' : mn < 210 ? 'relaxed' : 'tight' };
}
const allSched = () => ST.days.map(sched);
function bestSlot(d, loc) {
  if (!d.stops.length) return 0;
  let best = d.stops.length, cost = Infinity;
  for (let i = 1; i < d.stops.length; i++) {   // never past the last stop — that is the bed
    const prev = d.stops[i - 1].loc, next = i < d.stops.length ? d.stops[i].loc : null;
    const c = next ? legMin(prev, loc) + legMin(loc, next) - legMin(prev, next) : legMin(prev, loc);
    if (c < cost) { cost = c; best = i; }
  }
  return best;
}
function addStop(dayIdx, loc) {
  const d = ST.days[dayIdx], at = bestSlot(d, loc);
  const before = sched(d).min;
  d.stops.splice(at, 0, { loc, dwell: POI[loc].dwell });
  const added = sched(d).min - before;
  save(); render();
  toast(`${POI[loc].name} added to ${d.date} — ${added > 0 ? '+' + dur(added) + ' driving' : 'no extra driving'}`);
}
let toastT;
function toast(msg) {
  const n = $('#toast'); n.textContent = msg; n.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => n.classList.remove('on'), 3600);
}

/* ---------- live routing for legs we did not pre-bake ---------- */
const pending = new Set();
function geoFor(a, b) { return GEO[a + '|' + b] || null; }
async function fetchGeo(a, b) {
  const k = a + '|' + b;
  if (GEO[k] || pending.has(k)) return;
  pending.add(k);
  const A = POI[a], B = POI[b];
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/` +
      `${A.lng},${A.lat};${B.lng},${B.lat}?overview=full&geometries=geojson`);
    const j = await r.json();
    if (j.code === 'Ok') {
      GEO[k] = j.routes[0].geometry.coordinates.map(([ln, la]) => [+la.toFixed(4), +ln.toFixed(4)]);
      drawMap();
    }
  } catch (e) { /* offline — the dashed straight line stands in */ }
  finally { pending.delete(k); }
}

/* ---------- basemaps ---------- */
const BASEMAPS = {
  streets:   { label: 'Streets',   url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19,
               attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  satellite: { label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 18,
               attr: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' },
  terrain:   { label: 'Terrain',   url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', max: 17, sub: 'abc',
               attr: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), &copy; OpenStreetMap contributors' },
  voyager:   { label: 'Muted',     url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', max: 19, sub: 'abcd',
               attr: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
  dark:      { label: 'Dark',      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', max: 19, sub: 'abcd',
               attr: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
};
let map, tiles, routeL, pinL;
function setTiles() {
  const b = BASEMAPS[ST.basemap] || BASEMAPS.streets;
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer(b.url, { maxZoom: b.max, subdomains: b.sub || 'abc', attribution: b.attr }).addTo(map);
  tiles.bringToBack();
}
const dayCol = i => ['#2E929F', '#C4622D', '#4E9E5F', '#7B5EA7', '#B5730B', '#1F7A8C', '#A63D57', '#3F6F3F'][i % 8];

/* ---------- map ---------- */
function drawMap() {
  if (!map) return;
  routeL.clearLayers(); pinL.clearLayers();
  const bounds = L.latLngBounds([]);
  const scheds = allSched();
  const draw = (di, faint) => {
    const d = ST.days[di], col = dayCol(di);
    d.stops.forEach((s, i) => {
      if (i === d.stops.length - 1) return;
      const a = s.loc, b = d.stops[i + 1].loc;
      if (a === b) return;
      const g = geoFor(a, b);
      if (g) L.polyline(g, { color: col, weight: faint ? 2 : 5, opacity: faint ? .25 : .95,
        lineCap: 'round', lineJoin: 'round' }).addTo(routeL);
      else {
        L.polyline([[POI[a].lat, POI[a].lng], [POI[b].lat, POI[b].lng]],
          { color: col, weight: faint ? 2 : 4, opacity: faint ? .2 : .7, dashArray: '6 7' }).addTo(routeL);
        fetchGeo(a, b);
      }
      if (!faint) { bounds.extend([POI[a].lat, POI[a].lng]); bounds.extend([POI[b].lat, POI[b].lng]); }
    });
  };
  if (ST.showOther) ST.days.forEach((_, i) => { if (i !== ST.day) draw(i, true); });
  draw(ST.day, false);

  const sc = scheds[ST.day];
  sc.rows.forEach((r, i) => {
    const p = POI[r.loc], last = i === sc.rows.length - 1;
    const cls = last ? 'mk bed' : (p.off ? 'mk off' : 'mk');
    L.marker([p.lat, p.lng], { riseOnHover: true, icon: L.divIcon({ className: '',
      iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<span class="${cls}" style="--c:${dayCol(ST.day)}">${last ? '⌂' : i + 1}</span>` }) })
      .bindPopup(`<h4>${p.name}</h4><span class="t">${hhmm(r.arrive)}–${hhmm(r.depart)} · ${dur(r.dwell || 0)}` +
        `${p.coffee === 'cafe' ? ' · café' : ''}${p.ticket ? ' · ticket' : ''}</span>` +
        `<p>${p.activity || CATS[p.cat] || ''}${p.note ? '<br><em>' + p.note + '</em>' : ''}</p>` +
        `<a href="${gmaps(r.loc)}" target="_blank" rel="noopener">Open in Google Maps →</a>`, { maxWidth: 270 })
      .bindTooltip(p.name, { direction: 'top', offset: [0, -12] }).addTo(pinL);
    bounds.extend([p.lat, p.lng]);
  });
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 11 });
}

/* ---------- daylight bar ---------- */
function bar(d, sc) {
  const W = 1000, H = 50, T0 = 300, T1 = 1350, x = m => (m - T0) / (T1 - T0) * W;
  const svg = S_('svg', { viewBox: `-26 0 ${W + 52} ${H}`, role: 'img',
    'aria-label': `${d.date}: ${d.start} to ${hhmm(sc.end)}. Sunrise ${d.sunrise}, sunset ${d.sunset}.` +
      (sc.dark.length ? ` ${sc.dark.length} stop(s) in darkness.` : '') });
  const band = (a, b, f) => svg.append(S_('rect', { x: x(a), y: 0, width: Math.max(0, x(b) - x(a)), height: 28, fill: f }));
  band(T0, sc.rise - 45, 'var(--night)'); band(sc.rise - 45, sc.rise, 'var(--twilight)');
  band(sc.rise, sc.set, 'var(--accent-soft)');
  band(sc.set, sc.set + 40, 'var(--twilight)'); band(sc.set + 40, T1, 'var(--night)');
  [sc.rise, sc.set].forEach(m => svg.append(S_('line', { x1: x(m), y1: 0, x2: x(m), y2: 28,
    stroke: 'var(--ink-3)', 'stroke-width': 1 })));
  for (let t = 360; t <= 1320; t += 180) svg.append(S_('text', { x: x(t), y: 45, 'text-anchor': 'middle',
    fill: 'var(--ink-3)', 'font-size': 11, 'font-family': 'var(--mono)', text: hhmm(t) }));
  const clamp = v => Math.min(Math.max(v, T0), T1);
  sc.rows.forEach(r => {
    const dark = r.dark;
    const x0 = x(clamp(r.arrive)), x1 = x(clamp(r.depart));
    svg.append(S_('rect', { x: x0, y: 4, width: Math.max(3, x1 - x0), height: 20, rx: 3,
      fill: dark ? 'var(--bad)' : dayCol(ST.day), stroke: 'var(--surface)', 'stroke-width': 2 }));
  });
  if (sc.end > T1) svg.append(S_('text', { x: W + 4, y: 19, fill: 'var(--bad)', 'font-size': 12,
    'font-weight': 700, 'font-family': 'var(--mono)', text: '»' }));
  return svg;
}

/* ---------- plan tab ---------- */
function renderPlan() {
  const host = $('#planEditor'); host.replaceChildren();
  const d = ST.days[ST.day], sc = sched(d);

  const head = el('div', { class: 'ed-head' });
  head.append(el('div', {}, [el('span', { class: 'eyebrow', text: `${d.date} · day ${ST.day + 1} of 8` }),
    el('h3', { text: d.title })]));
  const st = el('input', { type: 'time', value: d.start, class: 'tin', 'aria-label': 'Day start time' });
  st.onchange = () => { d.start = st.value || '08:00'; save(); render(); };
  head.append(el('label', { class: 'startlab' }, [el('span', { text: 'Leave at' }), st]));
  host.append(head);

  const sum = el('div', { class: 'ed-sum' });
  [[`${sc.km} km`, 'driving'], [dur(sc.min), 'behind the wheel'],
   [hhmm(sc.end), 'day ends', sc.end > sc.set ? 'bad' : ''],
   [`${sc.rows.length}`, 'stops']]
    .forEach(([v, k, c]) => sum.append(el('div', { class: 'ed-stat ' + (c || '') },
      [el('span', { class: 'v', text: v }), el('span', { class: 'k', text: k })])));
  host.append(sum);
  host.append(el('div', { class: 'ipill', 'data-i': sc.intensity, text: sc.intensity + ' day' }));

  if (sc.dark.length) host.append(el('div', { class: 'warnbox',
    text: sc.dark.map(r => `${POI[r.loc].name} ${hhmm(r.arrive)}–${hhmm(r.depart)}, sunset there ` +
      `${hhmm(r.set)}`).join('; ') + `. A hotel check-in in the dark is fine; a waterfall path ` +
      `on wet basalt is not. Trim a dwell above, or drop a stop.` }));
  if (!sc.cafes.length) host.append(el('div', { class: 'warnbox coffee',
    text: 'No sit-down café on this route — fill a thermos before you go.' }));
  else host.append(el('div', { class: 'warnbox info', text: '☕ Coffee: ' + sc.cafes.join(', ') }));
  const dlw = el('div', { class: 'dl' });
  dlw.append(bar(d, sc));
  dlw.append(el('div', { class: 'dl-cap' }, [
    el('span', { text: `SUNRISE ${hhmm(sc.rise)}` }),
    el('span', { text: `${((sc.set - sc.rise) / 60).toFixed(1)} H OF LIGHT` }),
    el('span', { text: `SUNSET ${hhmm(sc.set)} · ${POI[d.stops[d.stops.length - 1].loc].name}` })]));
  host.append(dlw);

  const list = el('ol', { class: 'edlist' });
  sc.rows.forEach((r, i) => {
    const p = POI[r.loc], last = i === sc.rows.length - 1;
    const li = el('li', { class: (r.dark ? 'dark ' : '') + (last ? 'bed' : '') });
    li.append(el('div', { class: 'ix', text: last ? '⌂' : String(i + 1) }));
    const body = el('div', { class: 'bd' });
    body.append(el('div', { class: 'nm' }, [
      el('a', { href: gmaps(r.loc), target: '_blank', rel: 'noopener', text: p.name }),
      el('span', { class: 'clk', text: `${hhmm(r.arrive)}–${hhmm(r.depart)}` })]));
    body.append(el('div', { class: 'act', text: p.activity || CATS[p.cat] }));
    const bs = el('div', { class: 'badges' });
    if (last) bs.append(el('span', { class: 'b bd2', text: 'you sleep here' }));
    if (p.ticket) bs.append(el('span', { class: 'b tk', text: p.price ? `ticket · ${eur(p.price)} pp` : 'ticket' }));
    if (p.hike) bs.append(el('span', { class: 'b hk', text: 'on foot' }));
    if (p.coffee === 'cafe') bs.append(el('span', { class: 'b cf', text: '☕' }));
    if (bs.children.length) body.append(bs);
    li.append(body);

    const ctl = el('div', { class: 'ctl' });
    const inp = el('input', { type: 'number', min: '0', max: '600', step: '5', value: String(r.dwell || 0),
      class: 'dw', 'aria-label': `Minutes at ${p.name}` });
    const bump = n => { d.stops[i].dwell = Math.max(0, (d.stops[i].dwell || 0) + n); save(); render(); };
    inp.onchange = () => { d.stops[i].dwell = Math.max(0, Math.min(600, +inp.value || 0)); save(); render(); };
    ctl.append(el('div', { class: 'dwrap' }, [
      mkbtn('−', 'Less time here', () => bump(-15)), inp,
      el('span', { class: 'unit', text: 'min' }), mkbtn('+', 'More time here', () => bump(15))]));
    const mv = el('div', { class: 'mv' });
    mv.append(mkbtn('↑', 'Move earlier', () => { if (i > 0) { const a = d.stops; [a[i - 1], a[i]] = [a[i], a[i - 1]]; save(); render(); } }, i === 0));
    mv.append(mkbtn('↓', 'Move later', () => { const a = d.stops; if (i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; save(); render(); } }, i === sc.rows.length - 1));
    mv.append(mkbtn('×', 'Remove this stop', () => {
      if (d.stops.length <= 1) { toast('A day needs at least one stop — add another first'); return; }
      d.stops.splice(i, 1); save(); render(); toast(`${p.name} removed`);
    }, false, 'del'));
    ctl.append(mv);
    li.append(ctl);
    if (r.legMin) li.append(el('div', { class: 'leg', text: `↓  ${r.legKm} km · ${dur(r.legMin)} to the next stop` }));
    list.append(li);
  });
  host.append(list);

  const add = el('div', { class: 'addrow' });
  const inp = el('input', { list: 'poilist', placeholder: 'Add a stop — type a name…', class: 'addin' });
  const go = () => {
    const hit = KEYS.concat(['katla_cave']).find(k => POI[k] && POI[k].name.toLowerCase() === inp.value.trim().toLowerCase());
    if (!hit) { toast('No place by that name — pick one from the list'); return; }
    inp.value = ''; addStop(ST.day, hit);
  };
  inp.onchange = go;
  add.append(inp, mkbtn('Add', 'Add this stop', go, false, 'primary'));
  host.append(add);
  host.append(el('p', { class: 'hint', text: 'New stops slot in wherever they add the least driving. Nudge with ↑ ↓ if you disagree.' }));
}
function mkbtn(label, title, fn, disabled, cls) {
  const b = el('button', { type: 'button', text: label, title, 'aria-label': title,
    class: 'mini ' + (cls || ''), disabled: disabled ? '' : null });
  b.onclick = fn; return b;
}

/* ---------- attractions tab ---------- */
let amap, apinL, atiles;
function renderAttractions() {
  const inPlan = new Set(ST.days.flatMap(d => d.stops.map(s => s.loc)));
  const cats = ['all', ...Object.keys(CATS).filter(c => KEYS.some(k => POI[k].cat === c))];
  const chips = $('#catChips'); chips.replaceChildren();
  cats.forEach(c => {
    const b = el('button', { class: 'daychip', type: 'button', 'aria-pressed': String(ST.cat === c),
      text: c === 'all' ? 'Everything' : CATS[c] });
    b.onclick = () => { ST.cat = c; save(); renderAttractions(); };
    chips.append(b);
  });
  const list = Object.keys(POI)
    .filter(k => POI[k].cat !== 'airport')
    .filter(k => ST.showOff || !POI[k].off)
    .filter(k => ST.cat === 'all' || POI[k].cat === ST.cat)
    .sort((a, b) => (inPlan.has(b) - inPlan.has(a)) || POI[a].name.localeCompare(POI[b].name));

  $('#attrCount').textContent = `${list.length} places · ${list.filter(k => inPlan.has(k)).length} already in the plan`;

  if (amap) {
    apinL.clearLayers();
    if (atiles) amap.removeLayer(atiles);
    const b = BASEMAPS[ST.basemap] || BASEMAPS.streets;
    atiles = L.tileLayer(b.url, { maxZoom: b.max, subdomains: b.sub || 'abc', attribution: b.attr }).addTo(amap);
    atiles.bringToBack();
    const bd = L.latLngBounds([]);
    list.forEach(k => {
      const p = POI[k], on = inPlan.has(k);
      L.marker([p.lat, p.lng], { riseOnHover: true, icon: L.divIcon({ className: '',
        iconSize: [16, 16], iconAnchor: [8, 8],
        html: `<span class="pd ${on ? 'on' : ''} ${p.off ? 'off' : ''}"></span>` }) })
        .bindPopup(() => popupFor(k, on), { maxWidth: 280 })
        .bindTooltip(p.name, { direction: 'top', offset: [0, -8] }).addTo(apinL);
      bd.extend([p.lat, p.lng]);
    });
    if (bd.isValid()) amap.fitBounds(bd, { padding: [30, 30], maxZoom: 10 });
  }

  const grid = $('#attrGrid'); grid.replaceChildren();
  list.forEach(k => {
    const p = POI[k], on = inPlan.has(k);
    const c = el('div', { class: 'ac' + (on ? ' on' : '') + (p.off ? ' off' : '') });
    c.append(el('div', { class: 'ac-h' }, [
      el('h4', {}, el('a', { href: gmaps(k), target: '_blank', rel: 'noopener', text: p.name })),
      el('span', { class: 'cat', text: CATS[p.cat] || p.cat })]));
    if (p.note || p.activity) c.append(el('p', { class: 'ac-n', text: p.note || p.activity }));
    const meta = el('div', { class: 'badges' });
    meta.append(el('span', { class: 'b', text: `~${dur(p.dwell)}` }));
    if (p.ticket && p.price) meta.append(el('span', { class: 'b tk', text: `${eur(p.price)} pp` }));
    if (p.hike) meta.append(el('span', { class: 'b hk', text: 'on foot' }));
    if (p.coffee === 'cafe') meta.append(el('span', { class: 'b cf', text: '☕' }));
    if (on) meta.append(el('span', { class: 'b in', text: 'in the plan' }));
    if (p.off) meta.append(el('span', { class: 'b dk', text: 'unreachable on this route' }));
    c.append(meta);
    c.append(dayPicker(k));
    grid.append(c);
  });
}
function popupFor(k, on) {
  const p = POI[k];
  const w = el('div');
  w.append(el('h4', { text: p.name }), el('span', { class: 't', text: `${CATS[p.cat] || p.cat} · ~${dur(p.dwell)}${on ? ' · in the plan' : ''}` }));
  if (p.note || p.activity) w.append(el('p', { text: p.note || p.activity }));
  w.append(dayPicker(k));
  w.append(el('a', { href: gmaps(k), target: '_blank', rel: 'noopener', text: 'Open in Google Maps →' }));
  return w;
}
function dayPicker(k) {
  const wrap = el('div', { class: 'dpick' });
  wrap.append(el('span', { class: 'dpl', text: 'Add to' }));
  if (POI[k].off) { wrap.replaceChildren(el('span', { class: 'dpl',
    text: 'Not reachable on this route — shown for reference' })); return wrap; }
  ST.days.forEach((d, i) => {
    const b = el('button', { class: 'mini day', type: 'button', text: d.date.replace('Oct ', ''),
      title: `Add ${POI[k].name} to ${d.date} — ${d.title}` });
    b.onclick = () => addStop(i, k);
    wrap.append(b);
  });
  return wrap;
}

/* ---------- stays tab: for booking, not for driving ---------- */
let smap, spinL, stiles;
function bedChain() {
  const locs = ['keflavik_town', ...ST.days.slice(0, -1).map(d => d.stops[d.stops.length - 1].loc)];
  const out = [];
  locs.forEach((loc, i) => {
    const last = out[out.length - 1];
    if (last && last.loc === loc) { last.nights++; last.to = 2 + i; }
    else out.push({ loc, nights: 1, from: 2 + i, to: 2 + i, n: out.length + 1 });
  });
  return out;
}
const iso = d => `2026-10-${String(d).padStart(2, '0')}`;
const bookingUrl = s => 'https://www.booking.com/searchresults.html?' +
  `ss=${q(POI[s.loc].name)}%2C+Iceland&checkin=${iso(s.from)}&checkout=${iso(s.to + 1)}` +
  '&group_adults=3&no_rooms=2&group_children=0';

function renderStays() {
  const chain = bedChain();
  const total = chain.reduce((a, s) => a + (POI[s.loc].bed || 0) * s.nights, 0);
  const est = chain.filter(s => POI[s.loc].bed_est).length;
  $('#stayTotals').replaceChildren(...[
    [String(chain.length), 'separate bookings'],
    [String(chain.reduce((a, s) => a + s.nights, 0)), 'nights'],
    [eur(total), `${isk(total)} ISK, two rooms`],
    [String(est), 'rates still estimates']
  ].map(([v, k]) => el('div', { class: 'hstat' },
    [el('span', { class: 'v', text: v }), el('span', { class: 'k', text: k })])));

  if (smap) {
    spinL.clearLayers();
    if (stiles) smap.removeLayer(stiles);
    const b = BASEMAPS[ST.basemap] || BASEMAPS.streets;
    stiles = L.tileLayer(b.url, { maxZoom: b.max, subdomains: b.sub || 'abc', attribution: b.attr }).addTo(smap);
    stiles.bringToBack();
    const bd = L.latLngBounds([]);
    L.polyline(chain.map(s => [POI[s.loc].lat, POI[s.loc].lng]),
      { color: dayCol(0), weight: 3, opacity: .55, dashArray: '7 6' }).addTo(spinL);
    chain.forEach(s => {
      const p = POI[s.loc];
      L.marker([p.lat, p.lng], { riseOnHover: true, icon: L.divIcon({ className: '',
        iconSize: [30, 30], iconAnchor: [15, 15],
        html: `<span class="mk bed${s.nights > 1 ? ' two' : ''}" style="--c:${dayCol(0)}">${s.n}</span>` }) })
        .bindPopup(`<h4>${p.name}</h4><span class="t">Night${s.nights > 1 ? 's' : ''} ` +
          `${s.from}${s.nights > 1 ? '–' + s.to : ''} October · ${s.nights} night${s.nights > 1 ? 's' : ''}` +
          `${p.bed_est ? ' · rate estimated' : ''}</span>` +
          `<p>${isk((p.bed || 0) * s.nights)} ISK for two rooms</p>` +
          `<a href="${bookingUrl(s)}" target="_blank" rel="noopener">Search rooms for these dates →</a>`)
        .bindTooltip(`${s.n}. ${p.name}`, { direction: 'top', offset: [0, -14] }).addTo(spinL);
      bd.extend([p.lat, p.lng]);
    });
    if (bd.isValid()) smap.fitBounds(bd, { padding: [40, 40], maxZoom: 9 });
  }

  const host = $('#stayList'); host.replaceChildren();
  chain.forEach(s => {
    const p = POI[s.loc], first = s.loc === 'klaustur';
    const c = el('div', { class: 'stay' + (s.nights > 1 ? ' two' : '') + (first ? ' first' : '') });
    c.append(el('div', { class: 'stay-n', text: String(s.n) }));
    const body = el('div');
    body.append(el('div', { class: 'stay-h' }, [
      el('h4', { text: p.name }),
      el('span', { class: 'stay-d', text: s.nights > 1
        ? `${s.nights} nights · in ${s.from} Oct, out ${s.to + 1} Oct`
        : `1 night · in ${s.from} Oct, out ${s.to + 1} Oct` })]));
    const bs = el('div', { class: 'badges' });
    if (s.nights > 1) bs.append(el('span', { class: 'b in', text: 'two-night base' }));
    if (p.bed_est) bs.append(el('span', { class: 'b tk', text: 'rate estimated' }));
    if (first) bs.append(el('span', { class: 'b dk', text: 'book this first' }));
    body.append(bs);
    body.append(el('div', { class: 'stay-links' }, [
      el('a', { class: 'gbtn', href: bookingUrl(s), target: '_blank', rel: 'noopener',
        text: 'Search rooms' }),
      el('a', { class: 'gbtn', href: gmaps(s.loc), target: '_blank', rel: 'noopener',
        text: 'Map' })]));
    c.append(body);
    c.append(el('div', { class: 'stay-p' }, [
      el('span', { class: 'v', text: eur((p.bed || 0) * s.nights) }),
      el('span', { class: 'k', text: `${isk((p.bed || 0) * s.nights)} ISK` })]));
    host.append(c);
  });
}

/* ---------- overview tab ---------- */
function renderOverview() {
  const scs = allSched();
  const host = $('#ovDays'); host.replaceChildren();
  scs.forEach((sc, i) => {
    const d = ST.days[i];
    const row = el('div', { class: 'ovd', 'data-i': sc.intensity });
    row.append(el('div', { class: 'sev' }));
    const inn = el('div', { class: 'ovd-in' });
    inn.append(el('div', { class: 'ovd-h' }, [
      el('span', { class: 'day-n', text: d.date.toUpperCase() }),
      el('h4', { text: d.title }),
      el('span', { class: 'ipill', 'data-i': sc.intensity, text: sc.intensity })]));
    inn.append(el('div', { class: 'ovd-m',
      text: `${POI[d.stops[0].loc].name} → ${POI[d.stops[d.stops.length - 1].loc].name}  ·  ` +
        `${sc.km} km · ${dur(sc.min)} driving  ·  ${d.start}–${hhmm(sc.end)}  ·  ${sc.rows.length} stops` +
        (sc.dark.length ? `  ·  ${sc.dark.length} after dark` : '') }));
    inn.append(el('div', { class: 'dl' }, bar(d, sc)));
    const b = el('button', { class: 'mini', type: 'button', text: 'Edit this day' });
    b.onclick = () => { ST.day = i; show('plan'); };
    inn.append(b);
    row.append(inn); host.append(row);
  });

  const km = scs.reduce((a, s) => a + s.km, 0), mn = scs.reduce((a, s) => a + s.min, 0);
  const worst = Math.max(...scs.map(s => s.min));
  const places = new Set(ST.days.flatMap(d => d.stops.map(s => s.loc))).size;
  const totals = $('#ovTotals'); totals.replaceChildren();
  [[`${isk(km)} km`, 'distance'], [`${(mn / 60).toFixed(1)} h`, 'behind the wheel'],
   [dur(worst), 'worst single day', worst >= 330 ? 'bad' : ''],
   [String(places), 'distinct places'],
   [String(scs.reduce((a, s) => a + s.dark.length, 0)), 'stops after dark']]
    .forEach(([v, k, c]) => totals.append(el('div', { class: 'hstat ' + (c || '') },
      [el('span', { class: 'v', text: v }), el('span', { class: 'k', text: k })])));

  /* Beds: night 1 is the arrival night (Oct 2 — you land at 23:00 and sleep by the airport),
     and nights 2..8 are where days 1..7 END. The final day ends at KEF and is not a night.
     Deriving from every day's last stop both dropped the arrival night and counted the airport. */
  const beds = ['keflavik_town', ...ST.days.slice(0, -1).map(d => d.stops[d.stops.length - 1].loc)];
  let lodging = 0; const bedRows = [], unknown = [];
  beds.forEach((b, i) => {
    const p = POI[b], date = `Oct ${2 + i}`;
    if (p.bed) { lodging += p.bed; bedRows.push({ n: i + 1, date, town: p.name, isk: p.bed, est: !!p.bed_est }); }
    else { unknown.push(`${date} (${p.name})`); bedRows.push({ n: i + 1, date, town: p.name, isk: null }); }
  });
  const tickets = {};
  ST.days.forEach(d => d.stops.forEach(s => { if (POI[s.loc].price) tickets[s.loc] = POI[s.loc].price; }));
  const tourTotal = Object.values(tickets).reduce((a, b) => a + b, 0) * FIX.people;
  const items = [
    ['Rental car, 9 days', FIX.car], ['Insurance bundle', FIX.insurance],
    ['Fuel', Math.round(km * FIX.isk_per_km_fuel)], ['Kilometre road tax', Math.round(km * FIX.isk_per_km_tax)],
    ['Accommodation, 2 rooms', lodging], ['Food', FIX.food],
    ['Tickets and tours (' + Object.keys(tickets).length + ')', tourTotal],
    ['Parking and entry', FIX.parking]];
  const tot = items.reduce((a, [, v]) => a + v, 0);
  const bt = $('#ovBudget'); bt.replaceChildren();
  const tbl = el('table', { class: 'grid' });
  tbl.append(el('thead', {}, el('tr', {}, [el('th', { text: 'Line' }),
    el('th', { text: 'EUR', style: 'text-align:right' }), el('th', { text: 'ISK', style: 'text-align:right' })])));
  const tb = el('tbody');
  items.forEach(([k, v]) => tb.append(el('tr', {}, [el('td', { text: k }),
    el('td', { class: 'n', style: 'font-weight:600', text: eur(v) }),
    el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(v) })])));
  tbl.append(tb);
  tbl.append(el('tfoot', {}, [
    el('tr', {}, [el('td', { text: 'Total for three' }),
      el('td', { class: 'n', style: 'font-size:17px', text: eur(tot) }),
      el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(tot) })]),
    el('tr', {}, [el('td', { text: 'Per person', style: 'font-weight:500;color:var(--ink-2)' }),
      el('td', { class: 'n', text: eur(tot / FIX.people) }),
      el('td', { class: 'n', style: 'color:var(--ink-3)', text: isk(tot / FIX.people) })])]));
  bt.append(el('div', { class: 'scroll' }, tbl));
  if (unknown.length) bt.append(el('div', { class: 'warnbox coffee',
    text: `No room rate on file for ${unknown.join(', ')} — those nights are missing from the total. ` +
      `Nights 2-8 are wherever that day ends — make the last stop a town and the price comes back.` }));
  const bedsEl = el('div', { class: 'beds' });
  bedRows.forEach(b => bedsEl.append(el('div', { class: 'bed' }, [
    el('div', { class: 'd', text: `NIGHT ${b.n} · ${b.date}` }),
    el('div', { class: 't' }, [document.createTextNode(b.town),
      b.est ? el('span', { class: 'est', text: 'est' }) : null]),
    el('div', { class: 'p', text: b.isk ? eur(b.isk) : '—' })])));
  bt.append(el('h3', { style: 'margin:18px 0 8px', text: 'Where you sleep' }), bedsEl);
}

/* ---------- chrome ---------- */
function renderChips() {
  const c = $('#dayChips'); c.replaceChildren();
  const scs = allSched();
  ST.days.forEach((d, i) => {
    const b = el('button', { class: 'daychip', type: 'button', 'aria-pressed': String(i === ST.day) },
      [el('span', { class: 'sw', style: `background:${dayCol(i)}` })]);
    b.append(document.createTextNode(d.date.replace('Oct ', 'Oct ')));
    b.append(el('span', { class: 'ch', text: dur(scs[i].min) }));
    b.onclick = () => { ST.day = i; save(); render(); };
    c.append(b);
  });
}
function renderBasemaps() {
  ['#bmap', '#bmap2', '#bmap3'].forEach(sel => {
    const host = $(sel); if (!host) return;
    host.replaceChildren();
    Object.entries(BASEMAPS).forEach(([k, b]) => {
      const btn = el('button', { type: 'button', text: b.label, 'aria-pressed': String(ST.basemap === k) });
      btn.onclick = () => { ST.basemap = k; save(); setTiles(); renderBasemaps();
        if (ST.tab === 'attr') renderAttractions(); if (ST.tab === 'stays') renderStays(); };
      host.append(btn);
    });
  });
}
function render() {
  renderChips(); renderBasemaps();
  if (ST.tab === 'plan') { renderPlan(); drawMap(); }
  if (ST.tab === 'attr') renderAttractions();
  if (ST.tab === 'stays') renderStays();
  if (ST.tab === 'over') renderOverview();
  $('#resetBtn').style.display = dirty() ? '' : 'none';
  $('#dirtyDot').style.display = dirty() ? '' : 'none';
}
const TABS = [['plan', 'Plan the days'], ['attr', 'Attractions'], ['stays', 'Stays'], ['over', 'Overview']];
function show(t) {
  ST.tab = t; save();
  TABS.forEach(([k]) => { $('#panel-' + k).hidden = k !== t;
    $('#tab-' + k).setAttribute('aria-selected', String(k === t)); });
  if (t === 'plan' && map) requestAnimationFrame(() => { map.invalidateSize(); drawMap(); });
  if (t === 'attr' && amap) requestAnimationFrame(() => amap.invalidateSize());
  if (t === 'stays' && smap) requestAnimationFrame(() => { smap.invalidateSize(); renderStays(); });
  render();
}

/* boot */
(function () {
  if (D.title)   $('#mastTitle').innerHTML   = D.title;
  if (D.eyebrow) $('#mastEyebrow').textContent = D.eyebrow;
  if (D.lede)    $('#mastLede').textContent    = D.lede;
  const dl = $('#poilist');
  Object.keys(POI).filter(k => POI[k].cat !== 'airport' || k === 'kef_airport')
    .forEach(k => dl.append(el('option', { value: POI[k].name })));
  map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([64.6, -19], 6);
  routeL = L.layerGroup().addTo(map); pinL = L.layerGroup().addTo(map);
  setTiles();
  map.on('click', () => { map.scrollWheelZoom.enable(); $('#zoomhint').classList.add('off'); });
  map.getContainer().addEventListener('mouseleave', () => {
    map.scrollWheelZoom.disable(); $('#zoomhint').classList.remove('off'); });
  smap = L.map('smap', { zoomControl: true, scrollWheelZoom: false }).setView([64.4, -19.5], 6);
  spinL = L.layerGroup().addTo(smap);
  smap.on('click', () => smap.scrollWheelZoom.enable());
  smap.getContainer().addEventListener('mouseleave', () => smap.scrollWheelZoom.disable());
  amap = L.map('amap', { zoomControl: true, scrollWheelZoom: false }).setView([64.8, -19], 6);
  apinL = L.layerGroup().addTo(amap);
  amap.on('click', () => amap.scrollWheelZoom.enable());
  amap.getContainer().addEventListener('mouseleave', () => amap.scrollWheelZoom.disable());

  TABS.forEach(([k, label]) => {
    const b = el('button', { type: 'button', role: 'tab', id: 'tab-' + k, 'aria-controls': 'panel-' + k, text: label });
    if (k === 'plan') b.append(el('span', { class: 'dot', id: 'dirtyDot', title: 'You have unsaved-from-original edits' }));
    b.onclick = () => show(k);
    $('#tabs').append(b);
  });
  const oth = $('#showOther'); oth.checked = ST.showOther;
  oth.onchange = () => { ST.showOther = oth.checked; save(); drawMap(); };
  const off = $('#showOff'); off.checked = ST.showOff;
  off.onchange = () => { ST.showOff = off.checked; save(); renderAttractions(); };
  $('#resetBtn').onclick = () => {
    if (!confirm('Replace what you are looking at with the current shipped plan?')) return;
    ST.days = fresh(); staleBase = false; save(); render();
    $('#staleBar').style.display = 'none';
    toast('Loaded the current plan');
  };
  if (staleBase) {
    const bar = $('#staleBar');
    bar.style.display = '';
    bar.replaceChildren(
      el('strong', { text: 'This is your saved copy, and the plan has been updated since. ' }),
      document.createTextNode('What you see below is not the current itinerary. '),
      (() => { const b = el('button', { class: 'mini', type: 'button', text: 'Load the current plan' });
               b.onclick = () => $('#resetBtn').onclick(); return b; })());
  }
  /* Exports, so the planner can be the source of truth and the organising happens elsewhere.
     Iceland is UTC year-round, so calendar times need no timezone gymnastics. */
  const download = (name, mime, text) => {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
    document.body.append(a); a.click(); a.remove();
  };
  const pad2 = v => String(v).padStart(2, '0');
  const stamp = (day, m) => `2026100${''}${pad2(day)}T${pad2(Math.floor(m / 60) % 24)}${pad2(m % 60)}00Z`
    .replace(/^2026100(\d\d)/, (_, dd) => '202610' + dd);
  const icsEsc = t => String(t).replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
  $('#icsBtn').onclick = () => {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Iceland planner//EN',
      'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Iceland 2-10 October'];
    allSched().forEach((sc, di) => {
      const d = ST.days[di], dn = dayNum(d);
      sc.rows.forEach((r, i) => {
        const p = POI[r.loc];
        const endM = Math.max(r.depart, r.arrive + 15);
        const next = sc.rows[i + 1];
        const desc = [p.activity, p.note,
          r.legMin ? `Then ${r.legKm} km / ${dur(r.legMin)} to ${POI[next.loc].name}.` : null,
          r.dark ? `Runs past sunset here (${hhmm(r.set)}).` : null,
          gmaps(r.loc)].filter(Boolean).join('\n');
        L.push('BEGIN:VEVENT',
          `UID:${di}-${i}-${r.loc}@iceland.plan`,
          'DTSTAMP:20260812T000000Z',
          `DTSTART:${stamp(dn, r.arrive)}`, `DTEND:${stamp(dn, endM)}`,
          `SUMMARY:${icsEsc((i === sc.rows.length - 1 ? '🛏 ' : '') + p.name)}`,
          `LOCATION:${icsEsc(p.search)}`,
          `DESCRIPTION:${icsEsc(desc)}`, 'END:VEVENT');
      });
    });
    L.push('END:VCALENDAR');
    download('iceland-itinerary.ics', 'text/calendar', L.join('\r\n'));
    toast('Calendar downloaded — import once, then share it with the other two');
  };
  const xml = t => String(t).replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  $('#kmlBtn').onclick = () => {
    const L = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
      '<name>Iceland 2-10 October</name>'];
    allSched().forEach((sc, di) => {
      const d = ST.days[di];
      L.push(`<Folder><name>${xml(d.date + ' — ' + d.title)}</name>`);
      sc.rows.forEach((r, i) => {
        const p = POI[r.loc];
        L.push('<Placemark>',
          `<name>${xml((i + 1) + '. ' + p.name)}</name>`,
          `<description>${xml(`${hhmm(r.arrive)}–${hhmm(r.depart)} · ${p.activity || ''}` +
            (r.legMin ? ` · then ${r.legKm} km / ${dur(r.legMin)}` : ''))}</description>`,
          `<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>`, '</Placemark>');
      });
      L.push('</Folder>');
    });
    L.push('</Document></kml>');
    download('iceland-itinerary.kml', 'application/vnd.google-earth.kml+xml', L.join('\n'));
    toast('KML downloaded — import as a layer in Google My Maps');
  };
  $('#exportBtn').onclick = () => {
    download('iceland-plan.json', 'application/json', JSON.stringify({ days: ST.days }, null, 2));
    toast('Downloaded iceland-plan.json — send it to the others to load here');
  };
  $('#importFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        if (!Array.isArray(j.days) || j.days.length !== D.days.length) throw new Error('shape');
        const T = /^([01]\d|2[0-3]):[0-5]\d$/;
        j.days.forEach((d, i) => {
          if (!Array.isArray(d.stops) || !d.stops.length) throw new Error('empty day');
          if (!T.test(d.start || '')) d.start = D.days[i].start;
          d.sunrise = D.days[i].sunrise; d.sunset = D.days[i].sunset;
          d.date = D.days[i].date; d.title = d.title || D.days[i].title;
          d.stops.forEach(s => {
            if (!POI[s.loc]) throw new Error('unknown place ' + s.loc);
            s.dwell = Math.max(0, Math.min(600, Math.round(+s.dwell) || 0));
          });
        });
        ST.days = j.days; save(); render(); toast('Plan loaded');
      } catch (err) { toast('That file is not a plan for this trip'); }
      e.target.value = '';
    };
    r.readAsText(f);
  };
  show(ST.tab || 'plan');
})();

// test hook: `module` is undefined in a browser, so this is a no-op there
if (typeof module !== "undefined") module.exports = { ST, POI, sched, allSched, addStop, render, show, bestSlot, legMin };
