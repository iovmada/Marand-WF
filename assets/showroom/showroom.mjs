import {bindCardSwipe} from './swipe.mjs?v=mobile-swipe-20';
import {getProduct,quoteHref} from './catalog.mjs?v=categories-19';
import {showImage,viewButtons} from './gallery.mjs?v=categories-19';
const $=s=>document.querySelector(s);
const dialog=$('#sr-dialog'),config=$('#sr-config');
let opener,currentProduct;
const option=(value,text)=>new Option(text,value);
function modalView(view){
  const selected=showImage($('#sr-dialog-image'),currentProduct,view);
  $('#sr-dialog-views').querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(currentProduct.gallery[index].view===selected)));
}
function updateQuote(){
  if(!currentProduct)return;
  $('#sr-dialog-quote').href=quoteHref(currentProduct,{quantity:$('#sr-config-quantity').value,position:$('#sr-config-position').value,ownTextiles:$('#sr-config-own').checked});
}
function openProduct(id,trigger){
  const p=getProduct(id);if(!p)return;currentProduct=p;opener=trigger;
  $('#sr-dialog-title').textContent=p.name;$('#sr-dialog-copy').textContent=p.copy;
  $('#sr-dialog-availability').textContent=p.availability;
  $('#sr-dialog-material').textContent=p.material;
  $('#sr-dialog-sizes').textContent=p.sizes;$('#sr-dialog-colors').textContent=p.colors;$('#sr-dialog-own').textContent=p.ownTextiles;
  $('#sr-dialog-applications').textContent=p.applications;
  $('#sr-dialog-quantity').textContent=p.quantity;$('#sr-dialog-compatibility').textContent=p.compatibility;
  $('#sr-dialog-photo-note').textContent=p.photoNote;
  const notes=p.projectNotes||[];
  $('#sr-dialog-project').hidden=notes.length===0;
  $('#sr-dialog-project-notes').replaceChildren(...notes.map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
  config.reset();$('#sr-config-position').replaceChildren(option('','Alegem împreună'),...p.positions.map(x=>option(x.id,x.name)));
  const selectedIndex=Number(trigger.closest?.('.sr-card-gallery')?.dataset.cardView||0);
  const initialView=(p.gallery[selectedIndex]||p.gallery[0]).view;
  const controls=$('#sr-dialog-views');controls.replaceChildren(...viewButtons(p,initialView,modalView));controls.hidden=p.gallery.length<2;
  modalView(initialView);updateQuote();dialog.showModal();document.body.classList.add('sr-preview-open');
}
document.querySelectorAll('[data-preview]').forEach(b=>{b.hidden=false;b.addEventListener('click',()=>openProduct(b.dataset.preview,b));});
config.addEventListener('input',updateQuote);config.addEventListener('change',updateQuote);config.addEventListener('submit',e=>e.preventDefault());
$('#sr-dialog-quote').addEventListener('click',e=>{if(!config.checkValidity()){e.preventDefault();config.reportValidity();}});
$('.sr-dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
dialog.addEventListener('close',()=>{document.body.classList.remove('sr-preview-open');if(opener?.isConnected)opener.focus();});
document.querySelectorAll('.sr-product[data-product]').forEach(card=>{
  const product=getProduct(card.dataset.product);
  if(product?.gallery.length===2)bindCardSwipe(card.querySelector('.sr-card-gallery'),product);
});
document.body.classList.add('sr-enhanced');
