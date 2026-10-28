import {productDefinitions} from './data/product-definitions.mjs?v=retail-seo-18';
const positionNames={fata:'Față',spate:'Spate','fata-spate':'Față și spate',maneca:'Mânecă',pantalon:'Pantalon'};
export const products=productDefinitions.map(p=>({...p,quoteCategory:'textile',gallery:p.gallery||[p.image],
  availableColors:[],availableSizes:[],sizes:'De stabilit ulterior.',colors:'De stabilit ulterior.',
  material:'Compoziția, gramajul și calitatea materialului se stabilesc împreună, în funcție de proiect.',
  ownTextiles:'Poți veni cu textilele tale. Verificăm materialul și compatibilitatea DTF înainte de personalizare.',
  positions:p.positions.map(id=>({id,name:positionNames[id]})),
  quantity:'Cantitatea și termenul se confirmă în ofertă.',availability:'Articolele și disponibilitatea se confirmă în ofertă.',
  compatibility:p.compatibility||(p.technical?'Aplicarea DTF pe materiale tehnice, softshell, poliester special, textile tratate sau articole cu marcaje de siguranță se confirmă în atelier. Poate fi necesară o probă.':'Verificăm articolul, materialul și pozițiile de print înainte de producție.'),
  photoNote:p.photoNote||((p.gallery?.length>1)?'Exemple de personalizare: două fotografii, față și spate.':'Exemplu de personalizare: fața și spatele sunt prezentate în aceeași fotografie.')+(p.fictionalBrand?` ${p.fictionalBrand} este un brand fictiv, nu un client confirmat Marand.`:'')
}));
// Legacy quote IDs resolve only where the V1 collection has a relevant entry.
const aliases={
 sorturi:'horeca','sort-bej':'horeca','jacheta-chef-alba':'horeca',
 hanorac:'hanorace','hanorac-verde':'hanorace','hanorac-crem':'hanorace',
 tote:'sacose','tote-accesoriu':'sacose','tote-eveniment':'sacose','sacosa-textila':'sacose',
 'tricou-clasic':'tricouri','tricou-halftone':'tricouri','tricou-negru-halftone':'tricouri','tricou-alb':'tricouri','tricou-rosu':'tricouri','tricou-roz':'tricouri',
 'tricou-lucru-negru':'echipamente-lucru',workwear:'echipamente-lucru',jachete:'echipamente-lucru','jacheta-reflectorizanta':'echipamente-lucru',
 'echipament-sport':'sport-fitness','echipamente-sport':'sport-fitness','tricou-echipa-negru':'sport-fitness','maiou-lavanda':'sport-fitness',maiouri:'sport-fitness',
 vesta:'echipamente-tehnice',veste:'echipamente-tehnice','vesta-softshell':'echipamente-tehnice',
 polo:'evenimente-corporate','polo-negru':'evenimente-corporate','polo-sport':'evenimente-corporate',uniforme:'evenimente-corporate',
 'tricou-eveniment-alb':'evenimente-corporate','kit-eveniment':'evenimente-corporate','tricou-nunta-crem':'evenimente-personale','tricou-absolvire-gri':'evenimente-personale'
};
export const getProduct=id=>products.find(p=>p.id===(aliases[id]||id));
export function readConfiguration(p,params){
  const clean=(key,max)=>String(params.get(key)||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const quantity=clean('cantitate',8),position=clean('pozitie',30);
  return {quantity:/^[1-9]\d{0,6}$/.test(quantity)?quantity:'',position:p.positions.some(x=>x.id===position)?position:'',sizes:clean('marimi',80),color:clean('culoare',50),ownTextiles:params.get('textile')==='client'};
}
export function quoteHref(p,config={}){
  const raw=new URLSearchParams();for(const [k,v]of[['cantitate',config.quantity],['pozitie',config.position],['marimi',config.sizes],['culoare',config.color],['textile',config.ownTextiles?'client':'']])if(v)raw.set(k,v);
  const safe=readConfiguration(p,raw),params=new URLSearchParams({showroom:p.id});
  for(const[k,v]of[['cantitate',safe.quantity],['pozitie',safe.position],['marimi',safe.sizes],['culoare',safe.color],['textile',safe.ownTextiles?'client':'']])if(v)params.set(k,v);
  return `../oferta/?${params}`;
}
