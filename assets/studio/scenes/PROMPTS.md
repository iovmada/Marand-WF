# Fotografii pentru scenele Marand Studio

Folderul acesta ține fotografiile de interior folosite ca „Spații Marand".

Momentan e **gol** — scenele sunt desenate în `scenes.js`. Când pui fotografii
aici, renderer-ul le preferă automat față de desen.

---

## Ce trebuie să aibă o fotografie ca să funcționeze

Motorul are nevoie de un **perete vizibil, gol**, pe care să proiecteze printul.
Astea nu sunt preferințe estetice, sunt cerințe tehnice:

| Cerință | De ce |
|---|---|
| **Perete gol** — fără tablouri, postere, TV, semnalistică | printul se suprapune peste ce e deja acolo |
| **Cele 4 colțuri ale peretelui vizibile** (sau deductibile) | din ele se calculează homografia |
| **Fără obiecte mari în fața peretelui** la nivelul ochilor | nu avem încă occlusion mask — planta ar apărea *în spatele* printului |
| **Lumină uniformă, fără highlight-uri arse** | printul primi umbră proprie; peste un highlight ars arată fals |
| **Raport 16:10** (ex. 2000 × 1250 px) | raportul scenei; altfel se taie |
| **Un obiect de dimensiune cunoscută în cadru** (canapea, ușă, scaun) | ca să calibrezi corect `wallWidthCm` |

Format: **JPG**, latura lungă **1600–2400 px**, sub ~400 KB după compresie.

Două tipuri utile de cadru:
- **frontal** — perete drept, paralel cu camera. Iertător, bun ca implicit.
- **în unghi (3/4)** — peretele fuge în perspectivă. Aici se vede că motorul
  chiar pune printul *în planul peretelui*. Mai spectaculos, dar calibrarea
  cere mai multă atenție.

---

## Prompturi pentru generare

Câte unul per scenă, cu `<id>` = numele fișierului. Testate ca formulare pentru
generatoare de imagini (Firefly / Midjourney / Flux). **Partea negativă e cea
importantă** — fără ea vei primi camere cu tablouri pe pereți, adică inutilizabile.

Sufix comun, adaugă-l la fiecare prompt:

> photorealistic interior photography, architectural digest style, natural
> daylight, soft even lighting, no artwork or posters or frames on the walls,
> completely bare empty wall, no text, no signage, no TV, clean minimal styling,
> shot on 35mm lens, eye-level camera, 16:10 aspect ratio
>
> **negative:** picture frames, posters, wall art, canvas, paintings, TV screen,
> signage, text, watermark, clutter, people, harsh shadows, blown highlights,
> fisheye distortion

### `living.jpg` — frontal
> Modern Scandinavian living room, large bare cream wall behind a low linen
> sofa, oak herringbone floor, tall window on the left casting soft afternoon
> light across the floor, one plant in the right corner

### `dormitor.jpg` — frontal
> Calm minimal bedroom, wide empty warm-white wall above an upholstered bed with
> white linen, soft morning light from the right, light oak floor, one pendant
> lamp on the left

### `bucatarie.jpg` — în unghi (perete stâng)
> Contemporary kitchen seen at an angle, long bare light-grey side wall on the
> left running into the frame, matte stone counter and cabinets on the far wall,
> two pendant lamps, pale concrete floor

### `birou.jpg` — în unghi (perete stâng)
> Quiet modern office, large empty pale wall on the left in perspective, simple
> wooden desk with a monitor and a shelving unit against the far wall, grey
> carpet, cool neutral daylight

### `receptie.jpg` — frontal, perete lat
> Corporate reception lobby, very wide completely bare wall behind a dark
> reception counter, polished light stone floor with soft reflections, two large
> plants flanking the counter, bright even lighting

### `restaurant.jpg` — în unghi (perete drept)
> Warm neighbourhood café interior seen at an angle, bare plaster wall on the
> right running into the frame, small round wooden table with two chairs, dark
> oak floor, pendant lamp, warm low light

### `hotel.jpg` — frontal
> Elegant hotel room, wide empty warm beige wall above a made bed, walnut floor,
> window on the right with sheer curtains, soft warm lighting, restrained luxury

### `comercial.jpg` — în unghi (perete stâng)
> Bright modern retail interior seen at an angle, tall bare white wall on the
> left in perspective, minimal shelving on the far wall, polished pale floor
> with soft reflections, even shop lighting

---

## După ce ai fotografiile

Pentru fiecare, o singură dată:

1. pune fișierul aici ca `<id>.jpg` — **atât. Se vede imediat**, fără nicio
   modificare de cod: renderer-ul încearcă `scenes/<id>.jpg` pentru fiecare
   scenă și cade pe desen doar dacă fișierul lipsește
2. deschide **`/studio/?calibrate=1`** ca să calibrezi peretele
3. încarcă orice imagine la Pasul 01, apoi fotografia camerei la „Spațiul meu"
4. apasă **deschide** în panoul de calibrare
5. trage cele 4 colțuri verzi pe colțurile peretelui
6. scrie lățimea reală a peretelui în cm — printul se redimensionează live,
   deci compară-l cu canapeaua/ușa din cadru până pare corect
7. **Copiază pentru scenes.js** și înlocuiește scena existentă cu acel obiect

Durează ~30 de secunde per fotografie. Nu trebuie atins alt cod.

---

## Licențiere

Dacă fotografiile nu sunt ale Marand:

- **generate AI** — Adobe Firefly e antrenat pe stoc licențiat și e sigur pentru
  uz comercial. Midjourney/Flux: verifică termenii planului.
- **stoc** — Unsplash și Pexels permit uz comercial fără atribuire; Adobe Stock
  și Getty cer licență plătită.
- **fotografii proprii ale unor lucrări Marand** sunt varianta cea mai bună:
  licența e a voastră și devin și material de portofoliu.
