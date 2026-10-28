import {imageVariants} from './data/image-variants.mjs?v=retail-seo-18';
// One shared source selection for static cards, the hero and the detail gallery.
export function imageSources(image){
  const variants=imageVariants[image.src]||[image];
  const fallback=variants.find(item=>item.width>=800)||variants.at(-1);
  return {src:`../assets/${fallback.src}`,srcset:variants.map(item=>`../assets/${item.src} ${item.width}w`).join(', ')};
}
