import {imageSources} from './media.mjs?v=categories-19';
export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function picture(image,alt,className='',eager=false){
  const {src,srcset}=imageSources(image);
  return `<img class="${className}" src="${src}" srcset="${srcset}" sizes="(max-width:600px) calc(100vw - 32px), (max-width:960px) calc((100vw - 82px) / 2), 440px" alt="${escape(alt)}" width="${image.width}" height="${image.height}" style="--native-width:${image.width}px;--image-ratio:${image.width}/${image.height}" loading="${eager?'eager':'lazy'}"${eager?' fetchpriority="high"':''} decoding="async" />`;
}
export function card(p){
  const alternate=p.gallery[1];
  const secondImage=alternate?picture(alternate,'','sr-card-image sr-card-alternate').replace('<img ','<img aria-hidden="true" '):'';
  const pagination=alternate?`<div class="sr-card-pagination" role="group" aria-label="Fotografii: ${escape(p.name)}" hidden>${p.gallery.map((image,i)=>`<button type="button" data-card-image="${i}" aria-label="${escape(image.label)}: ${escape(p.name)}" aria-pressed="${i===0}"><span aria-hidden="true"></span></button>`).join('')}</div>`:'';
  return `<article class="sr-product" id="showroom-${p.id}" data-product="${p.id}"><div class="sr-card-gallery${alternate?' sr-card-has-alternate':''}">${picture(p.image,p.image.alt,'sr-card-image')}${secondImage}<button class="sr-photo-action" data-preview="${p.id}" type="button" aria-label="Vezi detalii: ${escape(p.name)}" hidden><span>Vezi detalii</span></button><a class="sr-fallback-image" href="../oferta/?showroom=${p.id}" aria-label="Solicită ofertă: ${escape(p.name)}"></a>${pagination}</div><h3>${escape(p.name)}</h3><p class="sr-card-copy">${escape(p.copy)}</p><ul class="sr-tags" aria-label="Utilizări">${p.tags.map(t=>`<li>${escape(t)}</li>`).join('')}</ul><dl class="sr-card-specs"><div><dt>Mărimi</dt><dd>${escape(p.sizes)}</dd></div><div><dt>Culori</dt><dd>${escape(p.colors)}</dd></div><div><dt>Calitatea materialului</dt><dd>De stabilit împreună.</dd></div></dl><p class="sr-own-label">Poți veni cu textilele tale.</p><div class="sr-product-actions"><a class="cta cta-secondary sr-quote" href="../oferta/?showroom=${p.id}">Cere ofertă<span class="sr-only"> pentru ${escape(p.name)}</span></a></div></article>`;
}
