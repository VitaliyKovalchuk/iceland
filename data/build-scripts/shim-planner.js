const store = {};
function mk(tag, ns) {
  const n = {
    tagName:(tag||'div').toUpperCase(), ns, children:[], attrs:{}, _text:'', style:{},
    value:'', checked:false, files:[], disabled:false, hidden:false,
    classList:{ _s:new Set(), add(...c){c.forEach(x=>this._s.add(x))},
                remove(...c){c.forEach(x=>this._s.delete(x))}, contains(c){return this._s.has(c)} },
    setAttribute(k,v){ this.attrs[k]=String(v); }, getAttribute(k){ return this.attrs[k] ?? null; },
    removeAttribute(k){ delete this.attrs[k]; },
    appendChild(c){ if(c==null) throw new Error('appendChild(null)'); this.children.push(c); return c; },
    append(...cs){ cs.forEach(c=>{ if(c==null) return;
      this.children.push(typeof c==='object'?c:{nodeType:3,_text:String(c),children:[],get textContent(){return this._text}}); }); },
    replaceChildren(...cs){ this.children=[]; this.append(...cs); },
    addEventListener(){}, dispatchEvent(){}, remove(){}, click(){ this._onclick && this._onclick(); },
    getBoundingClientRect:()=>({width:400,height:300,right:400,bottom:300,top:0,left:0}),
    querySelector:()=>null, querySelectorAll:()=>[], scrollIntoView(){}, focus(){},
    get textContent(){ return this._text || this.children.map(c=>c.textContent||'').join(''); },
    set textContent(v){ this._text=String(v); this.children=[]; },
    set innerHTML(v){ this._html=String(v); }, get innerHTML(){ return this._html||''; },
    set onclick(f){ this._onclick=f; }, get onclick(){ return this._onclick; },
    set onchange(f){ this._onchange=f; }, get onchange(){ return this._onchange; },
    set href(v){ this.attrs.href=v; }, get href(){ return this.attrs.href||''; },
    set download(v){}, set src(v){}, set type(v){ this.attrs.type=v; },
  };
  return n;
}
const DATA = require('fs').readFileSync(process.env.PLANNER_DATA,'utf8');
const ids = {};
function byId(id){
  if(id==='trip') return { get textContent(){ return DATA; } };
  return ids[id] || (ids[id]=mk('div'));
}
global.__ids = ids;
global.document = {
  documentElement:{ setAttribute(){}, removeAttribute(){}, style:{} },
  createElementNS:(ns,tag)=>mk(tag,ns),
  createTextNode:t=>({nodeType:3,_text:String(t),children:[],get textContent(){return this._text}}),
  getElementById: byId,
  querySelector: s => byId(s.replace('#','')),
  querySelectorAll: () => [],
  body: mk('body'),
};
global.window = { scrollTo(){}, addEventListener(){} };
global.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=v}, removeItem(k){delete this._d[k]} };
global.matchMedia = () => ({ matches:false, addEventListener(){} });
global.getComputedStyle = () => ({ getPropertyValue: () => '#000' });
global.requestAnimationFrame = f => f();
global.confirm = () => true;
global.fetch = () => Promise.reject(new Error('offline in test'));
global.setTimeout = (f,ms)=>0; global.clearTimeout = ()=>{};
global.Blob = class {}; global.URL = { createObjectURL:()=> 'blob:x' };
global.FileReader = class { readAsText(){} };
const lg = () => ({ addTo(){return this}, clearLayers(){}, bringToBack(){} });
global.L = {
  map: () => ({ setView(){return this}, on(){}, fitBounds(){}, getZoom:()=>7, invalidateSize(){},
                removeLayer(){}, scrollWheelZoom:{enable(){},disable(){}},
                getContainer:()=>({ addEventListener(){} }) }),
  layerGroup: lg, tileLayer: () => lg(), polyline: () => lg(),
  marker: () => ({ addTo(){return this}, bindPopup(){return this}, bindTooltip(){return this} }),
  divIcon: o=>o, latLngBounds: () => ({ extend(){}, isValid:()=>true }),
};
