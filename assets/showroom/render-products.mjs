import {escape,picture} from './render.mjs';
import {quoteHref} from './catalog.mjs';

// Retain existing Products links while taking textile content from the shared catalogue.
const legacyIds={tricouri:'tricou',hanorace:'hanorac','echipamente-tehnice':'vesta',sacose:'sacosa'};
export function productCard(p){
  const photo=picture(p.image,p.image.alt).replace(
    'sizes="(max-width:600px) calc(100vw - 32px), (max-width:960px) calc((100vw - 82px) / 2), 440px"',
    'sizes="(max-width:640px) calc(100vw - 56px), (max-width:960px) calc((100vw - 88px) / 2), 440px"'
  );
  const specs=[['Tehnologie','Transfer DTF'],['Mărimi',p.sizes],['Culori',p.colors],['Material',p.material]];
  return `<article class="product-detail-card" id="${legacyIds[p.id]||`textile-${p.id}`}" data-showroom-product="${p.id}">
  <a class="product-detail-media" href="../showroom/#showroom-${p.id}" aria-label="Explorează ${escape(p.name)}">${photo}</a>
  <div class="product-detail-content">
    <div class="product-detail-main">
      <div class="product-copy-group"><h3 class="product-detail-title">${escape(p.name)}</h3><p class="product-detail-description">${escape(p.copy)}</p></div>
      <dl class="product-specs">${specs.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    </div>
    <p class="product-detail-note">${escape(p.ownTextiles)}${p.technical?` ${escape(p.compatibility)}`:''}</p>
    <div class="product-card-actions"><a class="cta cta-secondary" href="${escape(quoteHref(p))}">Cere ofertă</a></div>
  </div>
</article>`;
}
