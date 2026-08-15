// minimal DOM + Leaflet stubs, enough to execute the page's real render path
const nodes = [];
function mk(tag, ns) {
  const n = {
    tagName: (tag||'').toUpperCase(), ns, children: [], attrs: {}, _text: '', style: {},
    classList: { add(){}, remove(){}, contains(){return false} },
    setAttribute(k,v){ this.attrs[k]=String(v); }, getAttribute(k){ return this.attrs[k] ?? null; },
    removeAttribute(k){ delete this.attrs[k]; },
    appendChild(c){ if(c==null) throw new Error('appendChild(null)'); this.children.push(c); return c; },
    append(...cs){ cs.forEach(c=>{ if(c==null) return; this.children.push(typeof c==='object'?c:mkText(c)); }); },
    replaceChildren(...cs){ this.children=[]; this.append(...cs); },
    addEventListener(){}, dispatchEvent(){}, getBoundingClientRect(){return {width:400,height:300,right:400,bottom:300,top:0,left:0}},
    querySelector(){ return null }, querySelectorAll(){ return [] },
    get textContent(){ return this._text || this.children.map(c=>c.textContent||'').join(''); },
    set textContent(v){ this._text=String(v); this.children=[]; },
    set innerHTML(v){ this._html=String(v); }, get innerHTML(){ return this._html||''; },
    set hidden(v){ this.attrs.hidden=v?'':undefined; }, get hidden(){ return 'hidden' in this.attrs; },
    set href(v){ this.attrs.href=v; }, get href(){ return this.attrs.href||''; },
    set onclick(f){ this._onclick=f; }, get onclick(){ return this._onclick; },
    set onchange(f){ this._onchange=f; },
    set src(v){}, set type(v){ this.attrs.type=v; },
    scrollIntoView(){}, focus(){},
  };
  nodes.push(n); return n;
}
function mkText(t){ return { nodeType:3, _text:String(t), get textContent(){return this._text}, children:[] }; }
const DATA = require('fs').readFileSync(process.env.SITE_DATA,'utf8');
const byId = {
  trip: { get textContent(){ return DATA; } },
  themeBtn: mk('button'), facts: mk('dl'), tabs: mk('nav'), panels: mk('div'),
};
global.document = {
  documentElement: { setAttribute(){}, removeAttribute(){}, style:{} },
  createElementNS: (ns, tag) => mk(tag, ns),
  createTextNode: t => mkText(t),
  getElementById: id => byId[id] || mk('div'),
  querySelector: s => byId[s.replace('#','')] || mk('div'),
  querySelectorAll: () => [],
  body: mk('body'),
};
global.window = { scrollTo(){}, addEventListener(){} };
global.localStorage = { getItem(){return null}, setItem(){} };
global.matchMedia = () => ({ matches:false, addEventListener(){} });
global.getComputedStyle = () => ({ getPropertyValue: k => ({'--d1':'#62B9C3','--d2':'#47A6B1','--d3':'#2E929F','--d4':'#167D8B','--d5':'#0B6874','--d6':'#08535D','--d7':'#063F47','--d8':'#0A2E34'}[k] || '#000') });
global.requestAnimationFrame = f => f();
global.location = { hash:'', };
const layer = () => ({ addTo(){return this}, clearLayers(){}, bringToBack(){} });
const marker = () => ({ addTo(){return this}, bindPopup(){return this}, bindTooltip(){return this},
                        getLatLng(){return {lat:64,lng:-19}} });
global.L = {
  map: () => ({ setView(){return this}, on(){}, fitBounds(){}, getZoom:()=>7,
                invalidateSize(){}, removeLayer(){}, scrollWheelZoom:{enable(){},disable(){}},
                getContainer:()=>mk('div') }),
  layerGroup: layer, tileLayer: () => layer(), polyline: () => layer(),
  marker, divIcon: o => o, latLngBounds: () => ({ extend(){}, isValid:()=>true }),
};
