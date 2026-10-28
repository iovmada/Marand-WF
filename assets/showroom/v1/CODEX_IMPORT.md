# Marand Print — DTF Showroom, asset pack V1

Acest pachet contine **6 fotografii originale selectate** din conversatie, in format PNG, inclusiv exemplul initial **Good Days**. Sunt fisierele originale ale imaginilor, nu fragmente decupate din colaje de tip contact sheet. Nu s-a efectuat upscale, decupare, comprimare lossy sau reconstructie.

## Instructiuni pentru Codex

Lucreaza in repository-ul existent Marand Print. Inainte de orice modificare:
1. Inspecteaza stack-ul, routing-ul, componentele UI, tipografia, paleta cromatica si sistemul de assets deja folosit.
2. Verifica daca exista deja o ruta `/showroom/`; completeaz-o pe aceea, fara sa recreezi paginile existente. Daca nu exista, adauga doar noua pagina si elementul de meniu **Showroom**.
3. Importa fisierele din `assets/` intr-un folder adecvat proiectului (de exemplu `public/images/showroom/dtf/`, daca acesta este compatibil cu stack-ul).
4. Foloseste `catalog.json` ca mapare pentru cele 6 categorii/produse. Primul produs al colectiei trebuie sa fie **Tricouri personalizate / Good Days**, imaginea `01-tricouri-good-days-front-back.png`.
5. Afiseaza toate fotografiile **integral**, fara `object-fit: cover` care ar taia un model sau jumatate din prezentarea fata/spate. Foloseste `object-fit: contain`, dimensiunile intrinseci, `aspect-ratio` si fundal consistent. Pentru carduri se poate utiliza un `object-fit: contain` in containerul imaginii; NU decupa arbitrar cele doua perspective.
6. Nu trata imaginile din stanga/dreapta ca fotografii separate deja disponibile; fiecare PNG este un singur master compozit cu un separator central. Daca sunt necesare imagini independente de galerie, marcheaza ca pending si cere/supune o sesiune de generare individuala de front/back la rezolutie mare. Nu crea variante de 150–300 px taind colaje.
7. Construieste categorii si subcategorii bazate pe date (fara duplicate de produse intre colectii), iar pentru cele sase carduri foloseste titlurile, textele si tagurile din JSON. Asigura UX responsive pentru desktop si mobil. Nu modifica celelalte pagini.
8. Pastreaza CTA-ul existent de solicitare oferta. Fara preturi, cos de cumparaturi, checkout sau comenzi online.
9. **Nu importa imaginile din pachetele ZIP mai vechi**, care erau crop-uri foarte mici. Foloseste doar acest set V1.
10. Pentru categorii ramase in lucru, precum HoReCa si tote bags, nu adauga fotografii generate vechi ca inlocuitori: lasa catalogul pregatit pentru completarea ulterioara cu imagini aprobate.
11. Afiseaza un disclaimer scurt unde este potrivit: imaginile reprezinta exemple de personalizare. Brandurile NEXORA ENERGY / AURELIA EVENTS sunt fictive, nu clienti confirmati ai Marand.
12. Inainte de lansare verifica limitari de productie: DTF pe materiale tehnice, softshell, poliester special, echipamente cu marcaje de siguranta sau alte materiale tratate se confirma in atelier.
13. Verifica lint, build, responsive si legaturile catre formularul de oferta. Raporteaza fisierele modificate si nu declara implementarea finalizata fara verificare.

## Fotografiile incluse

| Ordine | Categorie | Fisier | Vedere |
|---|---|---|---|
| 01 | Tricouri personalizate | `01-tricouri-good-days-front-back.png` | Model feminin, fata/spate |
| 02 | Sport & Fitness | `02-sport-fitness-cuplu-front-back.png` | Barbat + femeie, fata/spate |
| 03 | Echipamente de lucru | `03-workwear-nexora-tricou-pantaloni.png` | Barbat, fata/spate, print pe pantalon |
| 04 | Echipamente tehnice | `04-echipamente-tehnice-nexora-iarna.png` | Barbat, fata/spate, vesta/geaca/caciula |
| 05 | Evenimente corporate | `05-corporate-aurelia-business-front-back.png` | Barbat + femeie, office/business |
| 06 | Evenimente personale | `06-evenimente-personale-burlacite-front-back.png` | Grup femei, petrecere burlacite |

## Limite si QA

- Originalul Good Days: 1121 x 1403 px; sport: 1121 x 1403 px; celelalte compozitii: 1312 x 1199 px.
- Aceste dimensiuni sunt potrivite pentru prezentarea compozitiilor in carduri si pagini in dimensiuni moderate, nu promit full-screen retina la orice rezolutie.
- Textele si siglele vizibile sunt generate in imagine; nu sunt fisiere vectoriale de branding sau grafica pregatita pentru DTF.
- Nu oferi aceste grafici drept print-ready; pregatirea fisierelor de productie este un flux separat.
- `asset-audit.csv` contine dimensiunile si SHA-256 pentru verificarea integritatii.
