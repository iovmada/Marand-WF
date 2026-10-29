# DTF showroom — V1 originals

Buildless static HTML and native ES modules at `/showroom/`, reusing Marand's
navigation/footer, Acrom/Roboto typography, colors, rounded cards and CTAs.
Only the showroom and its existing route-specific quote adapter are affected.

## Source and data

`assets/showroom/v1/` contains six original, byte-identical PNGs from
`Marand_DTF_6_Imagini.zip`, the supplied CODEX_IMPORT.md, an authored catalog.json
and an asset-audit.csv recording dimensions, byte lengths and SHA-256 hashes.
The ZIP did not include catalog.json or an audit: titles/order come from the
supplied instructions; Romanian descriptions, tags and applications were authored
for this integration. No fabric, size, color or stock claims were inferred.

One level, thirteen selections: Tricouri personalizate, Hanorace personalizate,
Branduri & creatori, Sport & Fitness, Echipamente de lucru, Jachete & echipamente
de exterior, HoReCa, Evenimente corporate & promoționale, Retail & francize,
Școli, facultăți & absolvenți, Evenimente personale, Petreceri & evenimente pentru
copii and Sacoșe din bumbac & accesorii textile. The eleven original selections retain user-supplied imagery. Branduri & creatori and Școli, facultăți & absolvenți use newly generated presentation concepts, with provenance recorded alongside each PNG.

The original V1 PNGs are intact composites. Per the latest user request, catalogue
images fill the card frame with object-fit:cover, including hover alternatives,
on desktop and mobile. The detail gallery retains object-fit:contain so the whole
original can be inspected. Source photographs are not modified or cropped. The originals are 1121x1403 or 1312x1199 pixels and use native
dimensions, responsive sizing, async decode and lazy loading outside the hero.
No old lookbook assets are referenced by the page or active data modules.
The supplied Good Days design remains the first selection. The new Branduri & creatori concept contains the only halftone T-shirt example; no old crop is reused.

`v1/catalog.json` is the source of truth. `scripts/build-showroom.mjs` generates
`data/product-definitions.mjs` plus the marked hero and card blocks in index.html.
`catalog.mjs` assembles fields, quote configuration and relevant legacy IDs.
`render.mjs` renders static cards, `gallery.mjs` displays an intact master, and
`showroom.mjs` handles the accessible detail dialog and quote controls.

## Details and quotation

Sizes and colors are “De stabilit ulterior”. Composition, weight and material
quality are discussed per project. Customers may bring their own textiles, with
compatibility checked before personalisation. Technical, treated, softshell,
special polyester and safety-marked garments require workshop confirmation.
The own-textiles checkbox, quantity and print position pass to the existing
quotation workflow. It never submits or overwrites user edits/contact details.
Unavailable old type IDs fall back to the normal unfilled offer form.

Photos are illustrative; NEXORA ENERGY and AURELIA EVENTS are fictitious brands.
Artwork visible in photos is not a print-ready or vector deliverable.

## Verification

```sh
node scripts/build-showroom.mjs
node scripts/build-agent-files.mjs
NODE=/path/to/compatible/node bash scripts/test.sh
```

The endpoint suite needs the local static server on 8080 and forms API on 4000.
Do not submit a real email request for UI checks. No deploy or new dependency.

## Workwear photographs update

The Echipamente de lucru entry now uses two independent 1796x2403 PNG originals
supplied by the user. `assets/showroom/workwear/asset-audit.csv` records source
filenames, dimensions and hashes. The first numbered original is the default front
view; the second is the back view on pointer hover and keyboard focus. Both remain
available through the detail dialog's Față/Spate buttons on touch devices.
The other five selections keep their intact V1 composites. No crop was inferred.
The current source mapping is still `v1/catalog.json`.

## Sport & Fitness photographs update

Sport & Fitness now uses two user-supplied original photographs of the orange
POWER UP sportswear. Front is the default, back appears on hover, and both are
selectable in the existing detail dialog. Native dimensions are 1796x2403 px;
original bytes and audit data are retained in assets/showroom/sport-fitness/.
The same card/gallery behavior as workwear is reused without new styling.

## Children’s parties and events

Petreceri & evenimente pentru copii is an additional single-level card, using
two user-supplied 1796x2403 originals from the third reference folder. The front
view is shown initially, the back on hover, and both in the detail gallery.
Originals and their audit are in assets/showroom/petreceri-copii/. Sizes, colors
and material quality remain unconfirmed. The existing quote workflow accepts
the new petreceri-copii ID and the client's own-textile request.

## Corporate event photographs update

Evenimente corporate now uses two independent, unmodified 1796x2403 originals
from the fourth reference folder. Source -2 is front (default); -1 is back
(hover). Both remain available in the detail gallery. Original filenames and
hashes are recorded in assets/showroom/corporate/asset-audit.csv. The other
six cards and the existing quotation workflow are unchanged.

## Cotton tote bags and textile accessories

Plase tote din bumbac & accesorii is an additional single-level card using the
user's 1792x2290 Good Vibes Only original, preserved in assets/showroom/accesorii/
with its audit. It has one photograph: no artificial back view or hover swap.
The card/detail text describes a single presentation image. Textile accessories
remain DTF-only; size, color, weight and material quality are discussed per project.
The sacose quote ID and legacy tote aliases use the existing quotation workflow.

## Hoodies

Hanorace is placed immediately after the T-shirts entry, using two unmodified
1796x2403 PNG originals from reference folder 5. Front is the default and back
appears on hover; both can be selected in details on mobile. Originals and hashes
are in assets/showroom/hanorace/. Size, color, material quality and own-textile
requests follow the existing quote workflow. Legacy hanorac IDs resolve here.

## Thick technical equipment / hardshell

The existing echipamente-tehnice entry now uses two 1796x2403 original composites
from reference folder 6, stored with their audit in assets/showroom/hardshell/.
Each photograph contains both front and back and is displayed intact. Hover
shows the other full variant; detail buttons are Varianta 1 / Varianta 2, not
misleading front/back controls. Hardshell and thick/treated materials require
workshop confirmation before production. The quote ID remains unchanged.

## HoReCa

HoReCa uses two unmodified 1796x2403 originals from reference folder 7. The front
presentation with apron is source -2; the T-shirt back is source -1 (hover).
Both are accessible in details. Files and hashes live in assets/showroom/horeca/.
The material of the illustrated apron is not inferred from its appearance:
material and DTF compatibility must be confirmed in the workshop. Sizes, colors
and material quality remain undecided, and own-textile quote requests use the
existing workflow. Legacy apron quotation IDs now resolve to this collection.

## Personal events photograph update

Evenimente personale now displays the single 864x1184 original supplied by
the user, stored with its audit in assets/showroom/evenimente-personale/.
The image is displayed intact, without a hover alternate or misleading
front/back caption. Existing descriptions, quote IDs and other cards are retained.

## Showroom UI cleanup

The requested catalogue count, search/reset form, search empty state, global
example disclaimer, image captions on every card, and catalogue DTF chip have
been removed. The unused search code/styles were removed too. All ten entries
remain visible, including when an older URL contains a search parameter. Hover
images, touch-accessible detail galleries, material/own-textile information and
quotation controls remain intact. Photo notes inside details are retained.

## Retail and showroom SEO, 28 October 2026

Retail & francize uses two supplied FRESH MARKET originals (front/back) from
reference folder 8. Original hashes and source paths are recorded in retail/asset-audit.csv.
Showroom metadata and H1 describe textile personalisation through DTF. The original
slogan remains visible. An HTML questions section covers own textiles, compatibility,
materials, repeat uniforms and quotation requirements. No price or stock is inferred.

Run scripts/build-showroom-images.py with Pillow before build-showroom.mjs after
changing source photographs. It produces responsive WebP files and image-variants.mjs;
PNG masters remain byte-identical. Cards still cover their frames; details contain the
full image. Robots/canonical are retained; only this route's sitemap date changes.
Search Console inspection must follow publishing; local changes alone cannot be indexed.

## Category proposals applied locally, 29 October 2026

Two new single-level entries: Branduri & creatori and Școli, facultăți & absolvenți.
The front/back concepts are separate new PNG masters, not crops from old packs.
Their generation prompts and hashes are stored in their folders. Only the brand
T-shirt is a halftone example. Detail notes identify both images as generated
presentation concepts; neither depicts a real customer or completed production.

Existing cards have clearer names, uses and project-specific detail notes. Size,
colour and material remain to be agreed. Caps are not offered. Deferred research
ideas (medical, beauty, transfer-only sales) are not added. Existing card fill,
responsive WebP, original photographs and no-commerce quotation flow remain.
No new search, filters, category tree or tracking scripts are introduced.

## Mobile two-image swipe

The eight cards with two independently supplied images support left/right touch
swipes and two accessible dot buttons. Vertical scrolling and pinch zoom remain
native. A completed horizontal gesture suppresses its synthetic click so it does
not open details. A fresh tap still opens the selected photo in the detail dialog.
One-image composites remain intact. Desktop hover behavior remains available.
The static no-JavaScript quotation links and existing form workflow are retained.

## CTA alignment

Showroom quotation buttons reuse .cta/.cta-secondary from the shared
shell, with card sizing only. Primary hero/dialog/banner actions retain the shared
.cta-primary style. The own-textiles button no longer overrides colours. The
closing banner follows the existing .tpl-cta-heading/copy/btn pattern and spacing.
Shared site styles and other pages are not edited by this adjustment.

Card details open from the image; the separate “Vezi detalii” button below each card is removed. Quotation actions remain available.
