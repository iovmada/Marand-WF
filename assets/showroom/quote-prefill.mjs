import {getProduct,readConfiguration} from './catalog.mjs?v=categories-19';
// Preserve the existing form and never overwrite contact data or user edits.
export function prefillShowroomQuote(id){
  const p=getProduct(id),product=document.querySelector('#produs'),category=document.querySelector('#categorie');
  if(!p||!product||!category||product.value||category.value)return;
  const choice=[...(category.closest('[data-offer-dropdown]')?.querySelectorAll('[data-value]')||[])].find(x=>x.dataset.value===p.quoteCategory);
  if(!choice)return;choice.click();product.value=p.name;product.dispatchEvent(new Event('input',{bubbles:true}));
  const config=readConfiguration(p,new URLSearchParams(location.search)),quantity=document.querySelector('#cantitate'),details=document.querySelector('#detalii');
  if(quantity&&!quantity.value&&config.quantity)quantity.value=config.quantity;
  const lines=[];
  if(config.ownTextiles)lines.push('Clientul vine cu textilele proprii. Materialul și compatibilitatea DTF se verifică înainte de personalizare.');
  if(config.position)lines.push(`Poziție dorită: ${p.positions.find(x=>x.id===config.position).name}`);
  if(config.sizes)lines.push(`Mărimi dorite: ${config.sizes}`);
  if(config.color)lines.push(`Culoare dorită: ${config.color}`);
  if(details&&!details.value&&lines.length)details.value=[`Produs showroom: ${p.name}`,...lines,'Configurația, articolul și compatibilitatea se confirmă în ofertă.'].join('\n');
}
