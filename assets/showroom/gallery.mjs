import {imageSources} from './media.mjs?v=categories-19';
// Independent views exist only when explicitly supplied and mapped in the data.
export function showImage(image,product,view){
  const item=product.gallery.find(item=>item.view===view)||product.gallery[0];
  const sources=imageSources(item);
  image.srcset=sources.srcset;
  image.src=sources.src;
  image.sizes='(max-width:600px) calc(100vw - 88px), 520px';
  image.width=item.width;image.height=item.height;
  image.style.setProperty('--native-width',`${item.width}px`);
  image.alt=item.alt;
  return item.view;
}
export function viewButtons(product,selected,onSelect,doc=document){
  if(product.gallery.length<2)return [];
  return product.gallery.map(item=>{const button=doc.createElement('button');button.type='button';button.textContent=item.label;button.setAttribute('aria-pressed',String(item.view===selected));button.addEventListener('click',()=>onSelect(item.view));return button;});
}
