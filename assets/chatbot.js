(function () {
  const locale = document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith("ro") ? "ro" : "en";

  const copy = {
    en: {
      openLabel: "Open chat assistant",
      title: "Marand Assistant",
      subtitle: "Scripted product and quote helper",
      status: "Online demo assistant",
      closeLabel: "Close chat",
      inputPlaceholder: "Ask about products, materials, or quotes",
      send: "Send",
      intro:
        "Hi. I’m the Marand site assistant.\nI can help you choose a product, explain materials, or guide you to the quote page.",
      quick: [
        "Help me choose a product",
        "Which material should I use?",
        "I need a quote",
        "Talk to a human"
      ],
      links: {
        products: "Browse products",
        gallery: "See gallery",
        quote: "Open quote page",
        home: "Back to homepage"
      }
    },
    ro: {
      openLabel: "Deschide asistentul",
      title: "Asistent Marand",
      subtitle: "Asistent demonstrativ pentru produse și oferte",
      status: "Asistent demo online",
      closeLabel: "Închide chatul",
      inputPlaceholder: "Întreabă despre produse, materiale sau oferte",
      send: "Trimite",
      intro:
        "Salut. Sunt asistentul site-ului Marand.\nTe pot ajuta să alegi un produs, să înțelegi materialele sau să ajungi mai repede la pagina de ofertă.",
      quick: [
        "Ajută-mă să aleg un produs",
        "Ce material mi se potrivește?",
        "Am nevoie de ofertă",
        "Vreau să vorbesc cu un om"
      ],
      links: {
        products: "Vezi produsele",
        gallery: "Vezi galeria",
        quote: "Deschide pagina de ofertă",
        home: "Înapoi la homepage"
      }
    }
  };

  const routes = locale === "ro"
    ? {
        home: "marand-wireframes-ro.html",
        products: "marand-products-ro.html",
        gallery: "marand-gallery-ro.html",
        quote: "marand-quote-ro.html"
      }
    : {
        home: "marand-wireframes.html",
        products: "marand-products.html",
        gallery: "marand-gallery.html",
        quote: "marand-quote.html"
      };

  const t = copy[locale];

  const responses = [
    {
      match: /(choose|product|need print|banner|sticker|canvas|shirt|tricou|produs|aleg|alege|banner|canvas|sticker|textil)/i,
      get: () => ({
        text: locale === "ro"
          ? "Pentru alegerea produsului, regula simplă este:\n- banner sau mesh pentru exterior\n- vinyl autocolant pentru vitrine și stickere\n- canvas pentru decor și art print\n- textile pentru tricouri și merch\n- print mic pentru cărți de vizită, flyere și meniuri"
          : "A simple way to choose the right product is:\n- banner or mesh for outdoor display\n- adhesive vinyl for windows and stickers\n- canvas for decor and art prints\n- textile printing for shirts and merch\n- small-format print for cards, flyers, and menus",
        links: [
          { href: routes.products, label: t.links.products },
          { href: routes.gallery, label: t.links.gallery }
        ]
      })
    },
    {
      match: /(material|vinyl|mesh|canvas|paper|hartie|hârtie|materiale|material)/i,
      get: () => ({
        text: locale === "ro"
          ? "Pe scurt:\n- PVC banner: rezistent și bun pentru exterior\n- Mesh: potrivit când bate vântul sau pentru fațade mari\n- Vinyl autoadeziv: pentru vitrine, wall graphics și etichete\n- Canvas: pentru look premium de interior\n- Hârtie/carton: pentru printuri promoționale și corporate"
          : "Quick material guide:\n- PVC banner: durable and good for outdoor use\n- mesh: better for windy areas and large facade coverage\n- adhesive vinyl: for windows, wall graphics, and labels\n- canvas: for premium indoor presentation\n- paper/card stock: for promo and corporate print",
        links: [{ href: routes.products, label: t.links.products }]
      })
    },
    {
      match: /(quote|offer|oferta|ofertă|price|pret|preț|cost|buget)/i,
      get: () => ({
        text: locale === "ro"
          ? "Ca să primești o ofertă bună mai repede, pregătește: dimensiuni, cantitate, termen, material dorit și dacă ai deja grafica pregătită. Pagina de ofertă de pe site este gândită exact pentru asta."
          : "To get a solid quote faster, prepare: dimensions, quantity, deadline, preferred material, and whether the artwork is ready. The quote page is set up exactly for that flow.",
        links: [{ href: routes.quote, label: t.links.quote }]
      })
    },
    {
      match: /(human|phone|email|contact|om|telefon|mail|email|contact)/i,
      get: () => ({
        text: locale === "ro"
          ? "Pentru contact direct, cel mai bun pas este pagina de ofertă sau secțiunea de contact. Acolo poți lăsa toate detaliile proiectului într-un singur loc."
          : "For direct contact, the best next step is the quote page or contact section, where you can leave all project details in one place.",
        links: [
          { href: routes.quote, label: t.links.quote },
          { href: routes.home + "#contact", label: locale === "ro" ? "Vezi contact" : "See contact" }
        ]
      })
    }
  ];

  function createWidget() {
    const host = document.createElement("div");
    host.className = "marand-chat";
    host.innerHTML = `
      <div class="marand-chat-panel" aria-live="polite">
        <div class="marand-chat-header">
          <div class="marand-chat-header-top">
            <div class="marand-chat-title">
              <div class="marand-chat-avatar">M</div>
              <div>
                <span class="marand-chat-label">${t.title}</span>
                <span class="marand-chat-subtitle">${t.subtitle}</span>
              </div>
            </div>
            <button class="marand-chat-close" type="button" aria-label="${t.closeLabel}">×</button>
          </div>
          <div class="marand-chat-status">${t.status}</div>
        </div>
        <div class="marand-chat-messages"></div>
        <div class="marand-chat-quick"></div>
        <form class="marand-chat-form">
          <input class="marand-chat-input" type="text" placeholder="${t.inputPlaceholder}" />
          <button class="marand-chat-send" type="submit">${t.send}</button>
        </form>
      </div>
      <button class="marand-chat-button" type="button" aria-label="${t.openLabel}">?</button>
    `;
    document.body.appendChild(host);
    return host;
  }

  function addMessage(messages, who, content, links) {
    const bubble = document.createElement("div");
    bubble.className = `marand-chat-bubble ${who}`;

    if (Array.isArray(content)) {
      content.forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        bubble.appendChild(p);
      });
    } else {
      bubble.textContent = content;
    }

    if (links && links.length) {
      const linkWrap = document.createElement("div");
      linkWrap.className = "marand-chat-links";
      links.forEach((item) => {
        const a = document.createElement("a");
        a.href = item.href;
        a.textContent = item.label;
        linkWrap.appendChild(a);
      });
      bubble.appendChild(linkWrap);
    }

    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function findResponse(message) {
    const hit = responses.find((entry) => entry.match.test(message));
    if (hit) return hit.get();

    return {
      text: locale === "ro"
        ? "Pot să te ajut cel mai bine cu alegerea produsului, materialele, timpul de execuție sau pregătirea unei cereri de ofertă."
        : "I can help best with product choice, materials, turnaround guidance, or preparing a quote request.",
      links: [
        { href: routes.products, label: t.links.products },
        { href: routes.quote, label: t.links.quote }
      ]
    };
  }

  function mount() {
    const root = createWidget();
    const panel = root.querySelector(".marand-chat-panel");
    const openBtn = root.querySelector(".marand-chat-button");
    const closeBtn = root.querySelector(".marand-chat-close");
    const messages = root.querySelector(".marand-chat-messages");
    const quick = root.querySelector(".marand-chat-quick");
    const form = root.querySelector(".marand-chat-form");
    const input = root.querySelector(".marand-chat-input");
    const media = window.matchMedia("(max-width: 760px)");

    function syncViewport() {
      if (!media.matches) {
        root.style.removeProperty("--marand-chat-mobile-top");
        root.style.removeProperty("--marand-chat-mobile-height");
        return;
      }

      const viewport = window.visualViewport;
      const top = viewport ? viewport.offsetTop : 0;
      const height = viewport ? viewport.height : window.innerHeight;
      root.style.setProperty("--marand-chat-mobile-top", `${Math.max(0, top)}px`);
      root.style.setProperty("--marand-chat-mobile-height", `${Math.max(320, height)}px`);
      messages.scrollTop = messages.scrollHeight;
    }

    function setOpen(next) {
      root.classList.toggle("is-open", next);
      openBtn.setAttribute("aria-expanded", next ? "true" : "false");
      if (next) {
        syncViewport();
        input.focus();
        messages.scrollTop = messages.scrollHeight;
      }
    }

    function submitMessage(text) {
      const cleaned = text.trim();
      if (!cleaned) return;
      addMessage(messages, "user", cleaned);
      const reply = findResponse(cleaned);
      window.setTimeout(() => addMessage(messages, "bot", reply.text.split("\n"), reply.links), 220);
    }

    addMessage(messages, "bot", t.intro.split("\n"), [
      { href: routes.products, label: t.links.products },
      { href: routes.quote, label: t.links.quote }
    ]);

    t.quick.forEach((label) => {
      const chip = document.createElement("button");
      chip.className = "marand-chat-chip";
      chip.type = "button";
      chip.textContent = label;
      chip.addEventListener("click", () => submitMessage(label));
      quick.appendChild(chip);
    });

    openBtn.addEventListener("click", () => setOpen(!root.classList.contains("is-open")));
    closeBtn.addEventListener("click", () => setOpen(false));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitMessage(input.value);
      input.value = "";
      input.focus();
    });

    input.addEventListener("focus", () => {
      window.setTimeout(syncViewport, 50);
      window.setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 120);
    });

    media.addEventListener("change", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    syncViewport();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
