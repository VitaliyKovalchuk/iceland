function mk(t){const n={tagName:(t||'div').toUpperCase(),children:[],attrs:{},_text:'',
 setAttribute(k,v){this.attrs[k]=String(v)},appendChild(c){if(c==null)throw new Error('null');this.children.push(c);return c},
 append(...cs){cs.forEach(c=>{if(c==null)return;this.children.push(typeof c==='object'?c:{_text:String(c),children:[],get textContent(){return this._text}})})},
 get textContent(){return this._text||this.children.map(c=>c.textContent||'').join('')},
 set textContent(v){this._text=String(v);this.children=[]},
 set innerHTML(v){this._html=String(v)},set onclick(f){this._onclick=f}};return n}
const DATA=require('fs').readFileSync('./diff-data.json','utf8');
const ids={}; global.__ids=ids;
global.document={documentElement:{setAttribute(){},removeAttribute(){}},createElement:mk,
 getElementById:id=>id==='d'?{get textContent(){return DATA}}:(ids[id]||(ids[id]=mk('div'))),
 querySelector:s=>{const id=s.replace('#','');return id==='d'?{get textContent(){return DATA}}:(ids[id]||(ids[id]=mk('div')))}};
global.localStorage={getItem(){return null},setItem(){}};
