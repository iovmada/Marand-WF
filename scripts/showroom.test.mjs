import {bindCardSwipe} from '../assets/showroom/swipe.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {showImage,viewButtons} from '../assets/showroom/gallery.mjs';
import {imageSources} from '../assets/showroom/media.mjs';
import {imageVariants} from '../assets/showroom/data/image-variants.mjs';
import {products,getProduct,quoteHref,readConfiguration} from '../assets/showroom/catalog.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('Products textile selections share catalogue images, quote IDs and resolvable detail links',()=>{
  const html=read('produse/index.html'),showroom=read('showroom/index.html');
  const textile=html.split('<!-- showroom:product-catalog -->')[1].split('<!-- /showroom:product-catalog -->')[0];
  const cards=[...textile.matchAll(/<article\b[^>]*data-showroom-product="([^"]+)"[^>]*>[\s\S]*?<\/article>/g)];
  assert.deepEqual(cards.map(c=>c[1]),products.map(p=>p.id));
  for(const [card,id]of cards){
    const p=getProduct(id),photo=imageSources(p.image);
    assert(card.includes(`src="${photo.src}"`));
    assert(card.includes(`href="../oferta/?showroom=${id}"`));
    assert(card.includes(`href="../showroom/#showroom-${id}"`));
    assert(showroom.includes(`id="showroom-${id}"`));
    assert(card.includes('Poți veni cu textilele tale.'));
    assert(card.includes(p.sizes));assert(card.includes(p.colors));assert(card.includes(p.material));
    if(p.technical)assert(card.includes(p.compatibility));
  }
  for(const id of ['textile','textiles','tricou','hanorac','vesta','sacosa'])assert(html.includes(`id="${id}"`));
  assert(!/S · M · L|38×42|șepci|sapca|checkout|add-to-cart/.test(textile));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('descriptive textile navigation preserves the indexed showroom route on every shared shell',()=>{
  const pages=['index.html','produse/index.html','showroom/index.html','materiale/index.html','studio/index.html','echipamente/index.html','productie/index.html','oferta/index.html','contact/index.html','comunicat-de-presa/index.html','produse-test/index.html','despre/index.html','confidentialitate/index.html','about/index.html','privacy/index.html','404.html'];
  for(const page of pages){
    const html=read(page);
    assert.equal([...html.matchAll(/href="(?:\.\/|\.\.\/|\/)showroom\/">Textile personalizate<\/a>/g)].length,2,page);
    assert(!/href="[^"]*showroom\/">Showroom<\/a>/.test(html),page);
  }
  assert.match(read('showroom/index.html'),/rel="canonical" href="https:\/\/marand-print.ro\/showroom\/"/);
});
test('thirteen single-level showroom selections in documented order, personalised T-shirts first',()=>{
  assert.deepEqual(products.map(p=>p.id),['tricouri','hanorace','branduri-creatori','sport-fitness','echipamente-lucru','echipamente-tehnice','horeca','evenimente-corporate','retail-francize','scoli-facultati-absolventi','evenimente-personale','petreceri-copii','sacose']);
  assert.equal(products[0].name,'Tricouri personalizate');assert.equal(new Set(products.map(p=>p.id)).size,13);
  assert(products.every(p=>p.quoteCategory==='textile'));assert(products.some(p=>p.id==='sacose'));
});
test('image masters match recorded hashes and intrinsic dimensions',()=>{
  const source=JSON.parse(read('assets/showroom/v1/catalog.json'));
  assert.match(source.metadataSource,/No catalog.json was supplied/);assert.deepEqual(source.pending,[]);
  for(const p of products){
    for(const image of p.gallery){
    const path=new URL(`../assets/${image.src}`,import.meta.url);assert(existsSync(path));const b=readFileSync(path);
    assert.equal(createHash('sha256').update(b).digest('hex'),image.sha256);
    assert.equal(b.readUInt32BE(16),image.width);assert.equal(b.readUInt32BE(20),image.height);
    assert(image.width>0&&image.height>0);}
    assert.equal(p.gallery.length,['echipamente-lucru','sport-fitness','petreceri-copii','evenimente-corporate','hanorace','echipamente-tehnice','horeca','retail-francize'].includes(p.id)?2:1);if(!['sacose','evenimente-personale'].includes(p.id)&&!['echipamente-lucru','sport-fitness','petreceri-copii','evenimente-corporate','hanorace','echipamente-tehnice','horeca','retail-francize'].includes(p.id))assert.equal(p.image.view,'composition');
  }
});
test('future sizes, colors and material quality stay unconfirmed; own textiles require verification',()=>{
  for(const p of products){assert.deepEqual(p.availableSizes,[]);assert.deepEqual(p.availableColors,[]);assert.match(p.sizes,/stabilit ulterior/);assert.match(p.colors,/stabilit ulterior/);assert.match(p.material,/calitatea materialului se stabilesc/);assert.match(p.ownTextiles,/textilele tale/);assert.match(p.ownTextiles,/compatibilitatea DTF/);if(p.technical)assert.match(p.compatibility,/confirmă în atelier/);}
  assert(products.filter(p=>p.technical).length===4);assert.match(getProduct('echipamente-tehnice').compatibility,/hardshell/);assert.match(getProduct('horeca').compatibility,/Materialul șorțului/);assert.match(getProduct('echipamente-tehnice').photoNote,/Fiecare fotografie prezintă integral fața și spatele/);
});
test('relevant legacy quote IDs resolve; unsupported items remain unavailable',()=>{
  assert.equal(getProduct('tricou-halftone').id,'branduri-creatori');assert.equal(getProduct('polo').id,'evenimente-corporate');
  assert.equal(getProduct('echipamente-sport').id,'sport-fitness');assert.equal(getProduct('vesta').id,'echipamente-tehnice');
  assert.equal(getProduct('sacose').id,'sacose');assert.equal(getProduct('tote').id,'sacose');assert.equal(getProduct('not-a-product'),undefined);assert.equal(getProduct('hanorac').id,'hanorace');
});
test('quotation parameters are bounded and preserve own-textile intent',()=>{
  const p=getProduct('tricouri'),url=new URL(quoteHref(p,{quantity:'25',position:'fata-spate',ownTextiles:true}),'https://marand-print.ro/showroom/');
  assert.equal(url.pathname,'/oferta/');assert.equal(url.searchParams.get('showroom'),'tricouri');assert.equal(url.searchParams.get('cantitate'),'25');assert.equal(url.searchParams.get('textile'),'client');
  assert.deepEqual(readConfiguration(p,new URLSearchParams({cantitate:'-1',pozitie:'invented',marimi:'a'.repeat(200),culoare:'verde\ntext',textile:'invented'})),{quantity:'',position:'',sizes:'a'.repeat(80),color:'verde text',ownTextiles:false});
  assert.equal(readConfiguration(getProduct('echipamente-lucru'),new URLSearchParams({pozitie:'pantalon'})).position,'pantalon');
});
function offerHarness({product='',category='',details='',quantity=''}={}){
  const fields={'#produs':{value:product,dispatchEvent(){}},'#categorie':{value:category},'#detalii':{value:details},'#cantitate':{value:quantity},'#email':{value:'existing@example.test'}};
  const choice={dataset:{value:'textile'},click(){fields['#categorie'].value='textile';}};
  fields['#categorie'].closest=()=>({querySelectorAll:()=>[choice]});
  const context={getProduct,readConfiguration,URLSearchParams,Event:class{},location:{search:'?cantitate=25&pozitie=fata-spate&textile=client'},document:{querySelector:s=>fields[s]}};
  vm.createContext(context);vm.runInContext(read('assets/showroom/quote-prefill.mjs').replace(/^import[^\n]+\n/,'').replace('export function','function'),context);
  return {fields,fill:id=>context.prefillShowroomQuote(id)};
}
test('existing offer workflow receives product, position, quantity and client textiles',()=>{
  const h=offerHarness();h.fill('tricouri');assert.equal(h.fields['#categorie'].value,'textile');assert.equal(h.fields['#produs'].value,'Tricouri personalizate');assert.equal(h.fields['#cantitate'].value,'25');assert.match(h.fields['#detalii'].value,/Clientul vine cu textilele proprii/);assert.match(h.fields['#detalii'].value,/Față și spate/);assert.equal(h.fields['#email'].value,'existing@example.test');
  const retail=offerHarness();retail.fill('retail-francize');assert.equal(retail.fields['#produs'].value,'Retail & francize');assert.equal(retail.fields['#categorie'].value,'textile');assert.match(retail.fields['#detalii'].value,/Clientul vine cu textilele proprii/);
  for(const id of ['branduri-creatori','scoli-facultati-absolventi']){const next=offerHarness();next.fill(id);assert.equal(next.fields['#produs'].value,getProduct(id).name);assert.equal(next.fields['#categorie'].value,'textile');assert.match(next.fields['#detalii'].value,/Clientul vine cu textilele proprii/);}
  const child=offerHarness();child.fill('petreceri-copii');assert.equal(child.fields['#produs'].value,'Petreceri & evenimente pentru copii');assert.equal(child.fields['#categorie'].value,'textile');
  const tote=offerHarness();tote.fill('sacose');assert.equal(tote.fields['#produs'].value,'Sacoșe din bumbac & accesorii textile');assert.equal(tote.fields['#categorie'].value,'textile');
  const hoodie=offerHarness();hoodie.fill('hanorace');assert.equal(hoodie.fields['#produs'].value,'Hanorace personalizate');assert.equal(hoodie.fields['#categorie'].value,'textile');
  const horeca=offerHarness();horeca.fill('horeca');assert.equal(horeca.fields['#produs'].value,'HoReCa');assert.equal(horeca.fields['#categorie'].value,'textile');
});
test('offer adapter never overwrites user edits or unsupported product requests',()=>{
  for(const existing of [{product:'Produs deja scris'},{category:'canvas'}]){const h=offerHarness(existing),before=JSON.stringify(h.fields);h.fill('tricouri');assert.equal(JSON.stringify(h.fields),before);}
  const edited=offerHarness({details:'Textul clientului',quantity:'12'});edited.fill('tricouri');assert.equal(edited.fields['#detalii'].value,'Textul clientului');assert.equal(edited.fields['#cantitate'].value,'12');
  const unknown=offerHarness(),before=JSON.stringify(unknown.fields);unknown.fill('not-a-product');assert.equal(JSON.stringify(unknown.fields),before);
});
test('static showroom has one listing, documented images, future specs and no commerce',()=>{
  const html=read('showroom/index.html'),main=html.split('<main id="showroom-main">')[1].split('</main>')[0];
  for(const p of products)assert.equal((main.match(new RegExp(`data-product="${p.id}"`,'g'))||[]).length,1,p.id);
  assert(!/data-discovery|data-mode|sr-category|sr-subcategory|data-card-view|showroom\/lookbook/.test(html));
  assert.equal((main.match(/Calitatea materialului/g)||[]).length,13);
  assert(!/canvas|bannere|semnalistică|stickere|mugs|socks|checkout|add-to-cart|rating|discount/i.test(main));
  assert(!/sr-result|sr-example-note|showroom-filters|sr-search|sr-editorial-label|colecția DTF/.test(main));
  const script=read('assets/showroom/showroom.mjs');assert(!/sr-result|showroom-filters|sr-search|sr-empty/.test(script));
  for(const match of script.matchAll(/\$\('#([^']+)'\)/g))assert(html.includes(`id="${match[1]}"`),`Missing detail element ${match[1]}`);assert(html.includes('id="sr-config-own"'));assert(!html.includes('id="sr-config-sizes"'));
  assert(read('assets/showroom/showroom.css').includes('object-fit:contain'));
  const tote=main.match(/<article class="sr-product"[^>]*data-product="sacose"[^>]*>[\s\S]*?<\/article>/)[0];assert(!tote.includes('sr-card-alternate'));assert(!tote.includes('Față / spate'));assert.equal(getProduct('sacose').gallery.length,1);assert.match(getProduct('sacose').photoNote,/singură vedere/);
  const personal=main.match(/<article class="sr-product"[^>]*data-product="evenimente-personale"[^>]*>[\s\S]*?<\/article>/)[0];assert(!personal.includes('sr-card-alternate'));assert(!personal.includes('Față / spate'));assert.equal(getProduct('evenimente-personale').gallery.length,1);assert.match(getProduct('evenimente-personale').photoNote,/singură vedere/);
});

test('galleries switch supplied views or intact composite variants in details',()=>{
  for(const id of ['echipamente-lucru','sport-fitness','petreceri-copii','evenimente-corporate','hanorace','echipamente-tehnice','horeca','retail-francize']){
  const p=getProduct(id),variant=id==='echipamente-tehnice',first=variant?'variant-1':'front',second=variant?'variant-2':'back';assert.deepEqual(p.gallery.map(x=>x.view),[first,second]);
  const image={style:{setProperty(){}}};assert.equal(showImage(image,p),first);assert.equal(image.src,imageSources(p.gallery[0]).src);
  assert.equal(showImage(image,p,second),second);assert.equal(image.src,imageSources(p.gallery[1]).src);assert.equal(image.srcset,imageSources(p.gallery[1]).srcset);assert.equal(image.alt,p.gallery[1].alt);
  const doc={createElement:()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(event,callback){this.click=callback;}})};
  let selected;const buttons=viewButtons(p,first,view=>{selected=view;},doc);
  assert.deepEqual(buttons.map(b=>b.textContent),variant?['Varianta 1','Varianta 2']:['Față','Spate']);assert.equal(buttons[0].attributes['aria-pressed'],'true');buttons[1].click();assert.equal(selected,second);
  assert.deepEqual(viewButtons(getProduct('tricouri'),'composition',()=>{},doc),[]);
  }
  const html=read('showroom/index.html');assert.equal((html.match(/class="sr-card-image sr-card-alternate"/g)||[]).length,8);assert.equal((html.match(/sr-card-has-alternate/g)||[]).length,8);
});


test('responsive assets exist, preserve master bounds and are used in HTML and gallery',()=>{
  for(const p of products){for(const image of p.gallery){
    const variants=imageVariants[image.src];assert(variants.length>=2);assert.equal(variants[0].width,480);
    for(const v of variants){assert(v.width<=image.width);assert(Math.abs(v.height/v.width-image.height/image.width)<0.003);assert(existsSync(new URL(`../assets/${v.src}`,import.meta.url)));}
    const sources=imageSources(image);assert(sources.src.endsWith('.webp'));assert(sources.srcset.includes('480w'));assert(sources.srcset.includes('800w'));
  }}
  const html=read('showroom/index.html');assert(!/<img[^>]+src="[^"]+\.png"/.test(html.split('<main id="showroom-main">')[1].split('</main>')[0]));
  assert.match(html,/<img[^>]+class="sr-hero-image"[^>]+loading="eager"[^>]+fetchpriority="high"/);
  const legacy={src:'unmapped.png',width:320,height:480};assert.equal(imageSources(legacy).src,'../assets/unmapped.png');
});

test('showroom SEO has one service H1, coherent metadata, useful HTML answers and canonical indexability',()=>{
  const html=read('showroom/index.html');assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/<h1[^>]*>Personalizare<br>textile prin DTF<\/h1>/);
  assert.match(html,/<title>Personalizare textile DTF și tricouri personalizate \| Marand<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/marand-print.ro\/showroom\/"/);
  assert(!/noindex|nofollow/i.test(html));assert(!read('robots.txt').includes('Disallow: /showroom'));
  assert.equal((read('sitemap.xml').match(/https:\/\/marand-print.ro\/showroom\//g)||[]).length,1);
  assert.match(html,/class="sr-slogan">Ideea ta. Pe piesa potrivită./);
  const faq=html.split('<section class="sr-guidance')[1].split('</section>')[0];assert.equal((faq.match(/<summary>/g)||[]).length,6);
  assert(faq.includes('compatibilitatea cu DTF'));assert(faq.includes('retail și francize'));assert(faq.includes('înainte de producție'));
  const title=html.match(/<title>(.*?)<\/title>/)[1];assert(html.includes(`property="og:title" content="${title}"`));assert(html.includes(`name="twitter:title" content="${title}"`));
});


test('new categories have distinct uses, documented concepts and one halftone example; caps stay excluded',()=>{
  const brand=getProduct('branduri-creatori'),school=getProduct('scoli-facultati-absolventi');
  assert(brand.applications.includes('Colecții'));assert(school.applications.includes('Promoții'));assert(getProduct('retail-francize').applications.includes('Magazine'));
  assert.equal(getProduct('tricou-absolvire-gri').id,school.id);
  assert.deepEqual(products.filter(p=>p.halftoneExample).map(p=>p.id),[brand.id]);
  for(const p of [brand,school]){assert.match(p.photoNote,/Concept vizual generat/);assert.equal(p.gallery.length,1);assert(p.projectNotes.length>=2);}
  const html=read('showroom/index.html').split('<main id="showroom-main">')[1].split('</main>')[0];
  assert(!/șepci|sepci|șapcă|sapca|caps|headwear/i.test(html));assert.equal(getProduct('sapca'),undefined);
});

test('detail dialog opens new categories, clears previous notes, and carries the selected quote configuration',()=>{
  const nodes=new Map();
  const makeNode=()=>({value:'',checked:false,hidden:true,children:[],attributes:{},listeners:{},style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},replaceChildren(...children){this.children=children;},querySelectorAll(){return this.children;},reset(){},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},focus(){this.focused=true;},isConnected:true});
  const select=s=>{if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s);};
  const triggers=['branduri-creatori','scoli-facultati-absolventi','tricouri'].map(id=>Object.assign(makeNode(),{dataset:{preview:id}}));
  const doc={querySelector:select,querySelectorAll:selector=>selector==='[data-preview]'?triggers:[],createElement:makeNode,body:makeNode()};
  const context={document:doc,getProduct,quoteHref,showImage,bindCardSwipe,viewButtons:(...args)=>viewButtons(...args,doc),Option:class{constructor(text,value){this.textContent=text;this.value=value;}}};
  vm.createContext(context);vm.runInContext(read('assets/showroom/showroom.mjs').replace(/^import[^\n]+\n/gm,''),context);
  triggers[0].listeners.click();assert.equal(select('#sr-dialog-title').textContent,'Branduri & creatori');assert.equal(select('#sr-dialog-project').hidden,false);assert.equal(select('#sr-dialog-project-notes').children.length,3);assert.equal(select('#sr-dialog').open,true);
  select('#sr-config-quantity').value='30';select('#sr-config-position').value='fata-spate';select('#sr-config-own').checked=true;select('#sr-config').listeners.input();
  const quote=new URL(select('#sr-dialog-quote').href,'https://marand-print.ro/showroom/');assert.equal(quote.searchParams.get('showroom'),'branduri-creatori');assert.equal(quote.searchParams.get('cantitate'),'30');assert.equal(quote.searchParams.get('textile'),'client');
  triggers[2].listeners.click();assert.equal(select('#sr-dialog-project').hidden,true);assert.equal(select('#sr-dialog-project-notes').children.length,0);
  triggers[1].listeners.click();assert.equal(select('#sr-dialog-title').textContent,'Școli, facultăți & absolvenți');assert.equal(select('#sr-dialog-project').hidden,false);assert(select('#sr-dialog-project-notes').children[0].textContent.includes('promoția'));
  select('#sr-dialog').close();assert.equal(triggers[1].focused,true);
  const retail=Object.assign(makeNode(),{dataset:{preview:'retail-francize'},closest:()=>({dataset:{cardView:'1'}})});
  // Reuse the actual click handler installed on a preview button with the selected card's ID.
  triggers[0].dataset.preview='retail-francize';triggers[0].closest=retail.closest;triggers[0].listeners.click();
  assert.equal(select('#sr-dialog-image').alt,getProduct('retail-francize').gallery[1].alt);assert.equal(select('#sr-dialog-views').children[1].attributes['aria-pressed'],'true');
});


function swipeHarness(id='retail-francize'){
  const product=getProduct(id),listeners={},classes=new Set(),primary={alt:product.image.alt};
  const dots=[0,1].map(()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(type,fn){this[type]=fn;}}));
  const pagination={hidden:true,querySelectorAll:()=>dots};
  const gallery={dataset:{},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},querySelector:s=>s==='.sr-card-image'?primary:pagination,addEventListener(type,fn,options){(listeners[type]||=[]).push({fn,options});}};
  let clock=1000;const enabled=bindCardSwipe(gallery,product,{now:()=>clock});
  function fire(type,values={}){const event={pointerType:'touch',pointerId:1,isPrimary:true,clientX:100,clientY:100,target:{closest:()=>null},detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...values};for(const listener of listeners[type]||[]){listener.fn(event);if(event.stopped)break;}return event;}
  function swipe(dx,dy=0){fire('pointerdown');fire('pointermove',{clientX:100+dx,clientY:100+dy});fire('pointerup',{clientX:100+dx,clientY:100+dy});}
  return {product,gallery,dots,primary,pagination,classes,listeners,enabled,fire,swipe,advance:ms=>{clock+=ms;}};
}

test('touch swipe switches actual photos both ways, stays bounded, and suppresses only the gesture click',()=>{
  const h=swipeHarness();assert.equal(h.enabled,true);assert.equal(h.pagination.hidden,false);
  h.swipe(-80,4);assert.equal(h.gallery.dataset.cardView,'1');assert.equal(h.primary.alt,h.product.gallery[1].alt);assert.equal(h.dots[1].attributes['aria-pressed'],'true');
  const afterSwipe=h.fire('click');assert.equal(afterSwipe.prevented,true);assert.equal(afterSwipe.stopped,true);
  assert(!h.fire('click',{detail:0}).prevented,'keyboard activation remains available');
  h.fire('pointerdown');h.fire('pointerup',{clientX:102,clientY:101});assert(!h.fire('click').prevented,'fresh tap opens details');
  h.swipe(-90);assert.equal(h.gallery.dataset.cardView,'1');assert(h.fire('click').prevented,'edge swipe must not open details');
  h.swipe(90);assert.equal(h.gallery.dataset.cardView,'0');h.swipe(90);assert.equal(h.gallery.dataset.cardView,'0');
  h.advance(601);assert(!h.fire('click').prevented);
});

test('vertical scroll, diagonal motion, cancellation, multitouch and mouse do not advance touch photos',()=>{
  const h=swipeHarness();
  h.fire('pointerdown');h.fire('pointermove',{clientX:105,clientY:160});h.fire('pointerup',{clientX:10,clientY:100});assert.equal(h.gallery.dataset.cardView,'0','vertical-first gesture cannot turn into a photo swipe');
  h.swipe(-45,40);assert.equal(h.gallery.dataset.cardView,'0');
  h.fire('pointerdown');h.fire('pointercancel');h.fire('pointerup',{clientX:10});assert.equal(h.gallery.dataset.cardView,'0');
  h.fire('pointerdown');h.fire('pointerdown',{pointerId:2,isPrimary:false});h.fire('pointerup',{clientX:10});assert.equal(h.gallery.dataset.cardView,'0');
  h.swipe(-15);assert.equal(h.gallery.dataset.cardView,'0');assert(h.fire('click').prevented,'small horizontal drag must not open details');
  h.swipe(-80);h.fire('pointerenter',{pointerType:'mouse'});assert.equal(h.gallery.dataset.cardView,'0');assert(!h.classes.has('sr-card-touch'));
  h.fire('pointerdown',{pointerType:'mouse'});h.fire('pointerup',{pointerType:'mouse',clientX:10});assert.equal(h.gallery.dataset.cardView,'0');
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])assert(h.listeners[type].every(listener=>listener.options.passive),'native page scrolling is not cancelled');
});

test('dot buttons select photos accessibly; single-image composites receive no swipe controls',()=>{
  const h=swipeHarness();h.dots[1].click();assert.equal(h.gallery.dataset.cardView,'1');assert.equal(h.dots[0].attributes['aria-pressed'],'false');
  h.dots[0].click();assert.equal(h.gallery.dataset.cardView,'0');assert.equal(h.dots[0].attributes['aria-pressed'],'true');
  const single=swipeHarness('branduri-creatori');assert.equal(single.enabled,false);assert.deepEqual(single.listeners,{});
  const html=read('showroom/index.html');assert.equal((html.match(/class="sr-card-pagination"/g)||[]).length,8);assert.equal((html.match(/data-card-image="/g)||[]).length,16);
  const css=read('assets/showroom/showroom.css');assert(css.includes('touch-action:pan-y pinch-zoom'));assert(css.includes('.sr-card-has-alternate:hover .sr-card-alternate'));assert(css.includes('.sr-card-has-alternate.sr-swipe-ready[data-card-view="1"]'));
});
