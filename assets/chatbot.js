(function () {
  const locale = document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith("ro") ? "ro" : "en";

  const copy = {
    en: {
      openLabel: "Open chat assistant",
      title: "Andra",
      subtitle: "Marand assistant for products and quotes",
      status: "Assistant available",
      statusThinking: "Writing a reply...",
      statusFallback: "Opening soon",
      closeLabel: "Close chat",
      inputPlaceholder: "Ask about products, materials, or quotes",
      send: "Send",
      intro:
        "Hi. I’m Andra, Marand's virtual assistant.\nI can help you choose a product, explain materials, or guide you to the quote page.",
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
      },
      greeting: "Hi, I'm Andra, your virtual assistant.",
      greetingClose: "Dismiss greeting"
    },
    ro: {
      openLabel: "Deschide asistentul",
      title: "Andra",
      subtitle: "Asistent Marand pentru produse si oferte",
      status: "Asistent disponibil",
      statusThinking: "Scriu un raspuns...",
      statusFallback: "Deschidem in curand",
      closeLabel: "Închide chatul",
      inputPlaceholder: "Întreabă despre produse, materiale sau oferte",
      send: "Trimite",
      intro:
        "Salut. Sunt Andra, asistenta virtuala Marand.\nTe pot ajuta sa alegi un produs, sa intelegi materialele sau sa ajungi mai repede la pagina de oferta.",
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
      },
      greeting: "Salut, sunt Andra, asistentul tau virtual.",
      greetingClose: "Inchide salutul"
    }
  };

  const isNestedPage = /\/(produse|produse-test|oferta|echipamente|contact|productie|materiale|comunicat-de-presa)(\/|index\.html$)/.test(window.location.pathname);
  const API_BASE = "/api";

  const routes = locale === "ro"
    ? {
        home: isNestedPage ? "../" : "./",
        products: isNestedPage ? "../produse/" : "./produse/",
        gallery: isNestedPage ? "../#galerie" : "./#galerie",
        quote: isNestedPage ? "../oferta/" : "./oferta/"
      }
    : {
        home: "marand-wireframes.html",
        products: "marand-products.html",
        gallery: "marand-gallery.html",
        quote: "marand-quote.html"
      };

  const t = copy[locale];
  const assetBase = isNestedPage ? "../assets/" : "./assets/";
  const assistantIcon = `
    <img class="marand-chat-icon-img" src="${assetBase}andra-chatbot-avatar.png" alt="${t.title}" />
  `;

  function createWidget() {
    const host = document.createElement("div");
    host.className = "marand-chat";
    host.innerHTML = `
      <div class="marand-chat-panel" aria-live="polite">
        <div class="marand-chat-header">
          <div class="marand-chat-header-top">
            <div class="marand-chat-title">
              <div class="marand-chat-avatar">${assistantIcon}</div>
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
      <div class="marand-chat-teaser" role="button" tabindex="0" aria-label="${t.greeting}">
        <button class="marand-chat-teaser-close" type="button" aria-label="${t.greetingClose}">×</button>
        <span class="marand-chat-teaser-text">${t.greeting}</span>
      </div>
      <button class="marand-chat-button" type="button" aria-label="${t.openLabel}">${assistantIcon}</button>
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
    return bubble;
  }

  function resolveLink(href) {
    if (!href) return "";
    if (/^https?:\/\//i.test(href)) return href;
    if (href === "/" || href === "/#galerie" || href === "/galerie") return routes.home + (href.includes("#galerie") ? "#galerie" : "");
    if (href === "/produse/") return routes.products;
    if (href === "/materiale/") return isNestedPage ? "../materiale/" : "./materiale/";
    if (href === "/oferta/") return routes.quote;
    if (href === "/contact/") return isNestedPage ? "../contact/" : "./contact/";
    return href;
  }

  function mount() {
    const root = createWidget();
    const openBtn = root.querySelector(".marand-chat-button");
    const closeBtn = root.querySelector(".marand-chat-close");
    const messages = root.querySelector(".marand-chat-messages");
    const quick = root.querySelector(".marand-chat-quick");
    const form = root.querySelector(".marand-chat-form");
    const input = root.querySelector(".marand-chat-input");
    const send = root.querySelector(".marand-chat-send");
    const status = root.querySelector(".marand-chat-status");
    const media = window.matchMedia("(max-width: 760px)");
    const touchOverlay = window.matchMedia("(pointer: coarse)");
    const page = document.documentElement;
    const body = document.body;
    const originalPageOverflow = page.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const history = [];
    let isPending = false;

    function setStatus(label) {
      status.textContent = label;
    }

    function setPending(next) {
      isPending = next;
      input.disabled = next;
      send.disabled = next;
      send.textContent = next ? "..." : t.send;
      setStatus(next ? t.statusThinking : t.status);
    }

    function shouldUseOverlayMode() {
      return media.matches && touchOverlay.matches;
    }

    function syncPageLock() {
      const shouldLock = root.classList.contains("is-open") && shouldUseOverlayMode();
      page.style.overflow = shouldLock ? "hidden" : originalPageOverflow;
      body.style.overflow = shouldLock ? "hidden" : originalBodyOverflow;
      body.classList.toggle("marand-chat-open", shouldLock);
    }

    function syncViewport() {
      if (!media.matches) {
        root.style.removeProperty("--marand-chat-mobile-top");
        root.style.removeProperty("--marand-chat-mobile-left");
        root.style.removeProperty("--marand-chat-mobile-width");
        root.style.removeProperty("--marand-chat-mobile-height");
        return;
      }

      const viewport = window.visualViewport;
      const top = viewport ? viewport.offsetTop : 0;
      const left = viewport ? viewport.offsetLeft : 0;
      const width = viewport ? viewport.width : window.innerWidth;
      const height = viewport ? viewport.height : window.innerHeight;
      root.style.setProperty("--marand-chat-mobile-top", `${Math.max(0, top)}px`);
      root.style.setProperty("--marand-chat-mobile-left", `${Math.max(0, left)}px`);
      root.style.setProperty("--marand-chat-mobile-width", `${Math.max(280, width)}px`);
      root.style.setProperty("--marand-chat-mobile-height", `${Math.max(320, height)}px`);
      messages.scrollTop = messages.scrollHeight;
    }

    function setOpen(next) {
      root.classList.toggle("is-open", next);
      openBtn.setAttribute("aria-expanded", next ? "true" : "false");
      syncPageLock();
      if (next) {
        syncViewport();
        messages.scrollTop = messages.scrollHeight;
        if (!shouldUseOverlayMode()) {
          input.focus();
        }
      } else if (document.activeElement === input) {
        input.blur();
      }
    }

    async function requestReply(message) {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          message,
          pageTitle: document.title,
          pathname: window.location.pathname,
          history
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Chat request failed.");
      }

      return {
        reply: String(payload?.reply || "").trim(),
        links: Array.isArray(payload?.links)
          ? payload.links.map((item) => ({
              href: resolveLink(item?.href),
              label: String(item?.label || "").trim()
            })).filter((item) => item.href && item.label)
          : [],
        fallback: Boolean(payload?.fallback)
      };
    }

    async function submitMessage(text) {
      const cleaned = text.trim();
      if (!cleaned || isPending) return;
      addMessage(messages, "user", cleaned);
      history.push({ role: "user", content: cleaned });

      const loadingBubble = addMessage(messages, "bot", locale === "ro" ? "..." : "...");
      setPending(true);

      try {
        const reply = await requestReply(cleaned);
        loadingBubble.remove();
        addMessage(messages, "bot", reply.reply.split("\n"), reply.links);
        history.push({ role: "assistant", content: reply.reply });
        if (reply.fallback) {
          setStatus(t.statusFallback);
          window.setTimeout(() => setStatus(t.status), 2400);
        }
      } catch (_error) {
        loadingBubble.remove();
        const fallbackText = locale === "ro"
          ? "Print shop-ul nostru se va deschide pe 03 august. Pana atunci, ne poti trimite o cerere de oferta si revenim cu detalii."
          : "Our print shop opens on July 25. Until then, you can send us a quote request and we will follow up with details.";
        addMessage(messages, "bot", fallbackText.split("\n"), [
          { href: routes.quote, label: t.links.quote },
          { href: routes.home + "#contact", label: locale === "ro" ? "Vezi contact" : "See contact" }
        ]);
        history.push({ role: "assistant", content: fallbackText });
        setStatus(t.statusFallback);
        window.setTimeout(() => setStatus(t.status), 2400);
      } finally {
        setPending(false);
      }
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

    const teaser = root.querySelector(".marand-chat-teaser");
    const teaserClose = root.querySelector(".marand-chat-teaser-close");
    const teaserKey = "marand-chat-greeting-dismissed";
    let teaserDismissed = false;
    try { teaserDismissed = sessionStorage.getItem(teaserKey) === "1"; } catch (_) {}

    function hideTeaser(persist) {
      teaser.classList.remove("is-visible");
      teaser.classList.add("is-hidden");
      if (persist) {
        try { sessionStorage.setItem(teaserKey, "1"); } catch (_) {}
      }
    }

    if (!teaserDismissed) {
      window.setTimeout(() => {
        if (!root.classList.contains("is-open")) teaser.classList.add("is-visible");
      }, 1200);
    } else {
      teaser.classList.add("is-hidden");
    }

    teaserClose.addEventListener("click", (event) => {
      event.stopPropagation();
      hideTeaser(true);
    });

    teaser.addEventListener("click", () => {
      hideTeaser(true);
      setOpen(true);
    });

    teaser.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        hideTeaser(true);
        setOpen(true);
      }
    });

    openBtn.addEventListener("click", () => {
      hideTeaser(true);
      setOpen(!root.classList.contains("is-open"));
    });
    closeBtn.addEventListener("click", () => setOpen(false));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input.value;
      input.value = "";
      await submitMessage(value);
      if (!shouldUseOverlayMode()) {
        input.focus();
      }
    });

    input.addEventListener("focus", () => {
      window.setTimeout(syncViewport, 50);
      window.setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 120);
    });

    const onViewportModeChange = () => {
      syncViewport();
      syncPageLock();
    };

    media.addEventListener("change", onViewportModeChange);
    touchOverlay.addEventListener("change", onViewportModeChange);
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
