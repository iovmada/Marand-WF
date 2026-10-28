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
test('eleven single-level showroom selections in documented order, personalised T-shirts first',()=>{
  assert.deepEqual(products.map(p=>p.id),['tricouri','hanorace','sport-fitness','echipamente-lucru','echipamente-tehnice','horeca','evenimente-corporate','retail-francize','evenimente-personale','petreceri-copii','sacose']);
  assert.equal(products[0].name,'Tricouri personalizate');assert.equal(new Set(products.map(p=>p.id)).size,11);
  assert(products.every(p=>p.quoteCategory==='textile'));assert(products.some(p=>p.id==='sacose'));
});
test('supplied original PNGs match recorded hashes and intrinsic dimensions',()=>{
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
  assert.equal(getProduct('tricou-halftone').id,'tricouri');assert.equal(getProduct('polo').id,'evenimente-corporate');
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
  const child=offerHarness();child.fill('petreceri-copii');assert.equal(child.fields['#produs'].value,'Petreceri & evenimente pentru copii');assert.equal(child.fields['#categorie'].value,'textile');
  const tote=offerHarness();tote.fill('sacose');assert.equal(tote.fields['#produs'].value,'Plase tote din bumbac & accesorii');assert.equal(tote.fields['#categorie'].value,'textile');
  const hoodie=offerHarness();hoodie.fill('hanorace');assert.equal(hoodie.fields['#produs'].value,'Hanorace');assert.equal(hoodie.fields['#categorie'].value,'textile');
  const horeca=offerHarness();horeca.fill('horeca');assert.equal(horeca.fields['#produs'].value,'HoReCa');assert.equal(horeca.fields['#categorie'].value,'textile');
});
test('offer adapter never overwrites user edits or unsupported product requests',()=>{
  for(const existing of [{product:'Produs deja scris'},{category:'canvas'}]){const h=offerHarness(existing),before=JSON.stringify(h.fields);h.fill('tricouri');assert.equal(JSON.stringify(h.fields),before);}
  const edited=offerHarness({details:'Textul clientului',quantity:'12'});edited.fill('tricouri');assert.equal(edited.fields['#detalii'].value,'Textul clientului');assert.equal(edited.fields['#cantitate'].value,'12');
  const unknown=offerHarness(),before=JSON.stringify(unknown.fields);unknown.fill('not-a-product');assert.equal(JSON.stringify(unknown.fields),before);
});
test('static showroom has one listing, approved photos, future specs and no commerce',()=>{
  const html=read('showroom/index.html'),main=html.split('<main id="showroom-main">')[1].split('</main>')[0];
  for(const p of products)assert.equal((main.match(new RegExp(`data-product="${p.id}"`,'g'))||[]).length,1,p.id);
  assert(!/data-discovery|data-mode|sr-category|sr-subcategory|data-card-view|showroom\/lookbook/.test(html));
  assert.equal((main.match(/Calitatea materialului/g)||[]).length,11);
  assert(!/canvas|bannere|semnalistică|stickere|mugs|socks|checkout|add-to-cart|rating|discount/i.test(main));
  assert(!/sr-result|sr-example-note|showroom-filters|sr-search|sr-editorial-label|colecția DTF/.test(main));
  const script=read('assets/showroom/showroom.mjs');assert(!/sr-result|showroom-filters|sr-search|sr-empty/.test(script));
  for(const match of script.matchAll(/\$\('#([^']+)'\)/g))assert(html.includes(`id="${match[1]}"`),`Missing detail element ${match[1]}`);assert(html.includes('id="sr-config-own"'));assert(!html.includes('id="sr-config-sizes"'));
  assert(read('assets/showroom/showroom.css').includes('object-fit:contain'));
  const tote=main.match(/<article class="sr-product" data-product="sacose">[\s\S]*?<\/article>/)[0];assert(!tote.includes('sr-card-alternate'));assert(!tote.includes('Față / spate'));assert.equal(getProduct('sacose').gallery.length,1);assert.match(getProduct('sacose').photoNote,/singură vedere/);
  const personal=main.match(/<article class="sr-product" data-product="evenimente-personale">[\s\S]*?<\/article>/)[0];assert(!personal.includes('sr-card-alternate'));assert(!personal.includes('Față / spate'));assert.equal(getProduct('evenimente-personale').gallery.length,1);assert.match(getProduct('evenimente-personale').photoNote,/singură vedere/);
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
  const faq=html.split('<section class="sr-guidance')[1].split('</section>')[0];assert.equal((faq.match(/<summary>/g)||[]).length,5);
  assert(faq.includes('compatibilitatea cu DTF'));assert(faq.includes('retail și francize'));assert(faq.includes('înainte de producție'));
  const title=html.match(/<title>(.*?)<\/title>/)[1];assert(html.includes(`property="og:title" content="${title}"`));assert(html.includes(`name="twitter:title" content="${title}"`));
});
