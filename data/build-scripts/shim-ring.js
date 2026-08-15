function mk(t,ns){const n={tagName:(t||'div').toUpperCase(),ns,children:[],attrs:{},_text:'',style:{},
 setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]??null},
 appendChild(c){if(c==null)throw new Error('appendChild(null)');this.children.push(c);return c},
 append(...cs){cs.forEach(c=>{if(c==null)return;this.children.push(typeof c==='object'?c:{_text:String(c),children:[],get textContent(){return this._text}})})},
 replaceChildren(...cs){this.children=[];this.append(...cs)},addEventListener(){},
 get textContent(){return this._text||this.children.map(c=>c.textContent||'').join('')},
 set textContent(v){this._text=String(v);this.children=[]},
 set innerHTML(v){this._html=String(v)},get innerHTML(){return this._html||''},
 set onclick(f){this._onclick=f},get onclick(){return this._onclick}};return n}
const DATA=require('fs').readFileSync('./ring-data.json','utf8');
const ids={}; global.__ids=ids;
global.document={documentElement:{setAttribute(){},removeAttribute(){}},
 createElementNS:(ns,t)=>mk(t,ns),createTextNode:t=>({_text:String(t),children:[],get textContent(){return this._text}}),
 getElementById:id=>id==='d'?{get textContent(){return DATA}}:(ids[id]||(ids[id]=mk('div'))),
 querySelector:s=>{const id=s.replace('#','');return id==='d'?{get textContent(){return DATA}}:(ids[id]||(ids[id]=mk('div')))},
 body:mk('body')};
global.localStorage={getItem(){return null},setItem(){}};
