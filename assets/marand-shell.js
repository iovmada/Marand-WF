(() => {
  const isNestedPage = /\/(produse|produse-test|oferta|echipamente|contact|productie|materiale|comunicat-de-presa)(\/|index\.html$)/.test(window.location.pathname);
  const routeRoot = isNestedPage ? ".." : ".";
  const toRoute = (path) => `${routeRoot}${path}`;
  const whatsappHref = "https://wa.me/40725894569?text=Buna%2C%20vreau%20o%20oferta%20pentru%20un%20proiect%20de%20print.";

  // The header and footer are baked into the HTML by scripts/build-shell.mjs so
  // that crawlers see the internal links without running JS. Edit the nav or
  // footer there, not here — this file only wires up behaviour.
  const headerTarget = document.querySelector("[data-marand-shell-header]");

  if (headerTarget) {
    const burger = headerTarget.querySelector(".nav-burger");
    const mobileNav = headerTarget.querySelector(".mobile-nav");
    const mobileClose = headerTarget.querySelector(".mobile-nav-close");
    const mobileNavLinks = headerTarget.querySelectorAll(".mobile-nav a");

    if (burger && mobileNav) {
      const closeMenu = () => {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Deschide meniul");
        mobileNav.hidden = true;
        document.body.classList.remove("nav-open");
      };

      const openMenu = () => {
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "Închide meniul");
        mobileNav.hidden = false;
        document.body.classList.add("nav-open");
      };

      burger.addEventListener("click", () => {
        const isOpen = burger.getAttribute("aria-expanded") === "true";
        if (isOpen) closeMenu();
        else openMenu();
      });

      mobileNav.addEventListener("click", (event) => {
        if (event.target === mobileNav) closeMenu();
      });

      if (mobileClose) {
        mobileClose.addEventListener("click", closeMenu);
      }

      mobileNavLinks.forEach((link) => link.addEventListener("click", closeMenu));

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 960) closeMenu();
      }, { passive: true });
    }
  }

  if (!document.querySelector(".whatsapp-float")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <a
          class="whatsapp-float"
          href="${whatsappHref}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Scrie-ne pe WhatsApp"
        >
          <span class="whatsapp-float-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.52 3.48A11.87 11.87 0 0 0 12.04 0C5.51 0 .2 5.3.2 11.82c0 2.08.54 4.1 1.56 5.89L0 24l6.49-1.7a11.78 11.78 0 0 0 5.55 1.41h.01c6.53 0 11.84-5.3 11.84-11.82 0-3.16-1.23-6.12-3.37-8.41Z" fill="currentColor"/>
              <path d="M17.02 14.35c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.64.14-.19.28-.73.91-.9 1.09-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.26-1.38-.84-.74-1.4-1.66-1.57-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.5-.07-.14-.64-1.53-.88-2.09-.23-.56-.47-.48-.64-.49-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.35-.26.28-1 1-.99 2.43.01 1.43 1.03 2.81 1.17 3 .14.19 2.03 3.11 4.91 4.36.69.3 1.22.48 1.64.61.69.22 1.31.19 1.81.12.55-.08 1.66-.68 1.89-1.34.23-.66.23-1.22.16-1.34-.07-.12-.26-.19-.54-.33Z" fill="#25D366"/>
              <path d="M12.04 21.64h-.01a9.8 9.8 0 0 1-4.99-1.36l-.36-.21-3.85 1.01 1.03-3.75-.23-.38a9.73 9.73 0 0 1-1.49-5.13C2.14 6.43 6.47 2.1 11.85 2.1c2.6 0 5.05 1.01 6.89 2.84a9.64 9.64 0 0 1 2.84 6.88c0 5.38-4.33 9.81-9.54 9.82Z" fill="#fff"/>
            </svg>
          </span>
        </a>
      `
    );
  }

  const openingDate = new Date(2026, 7, 3);
  const shouldShowOpeningNotice = Date.now() < openingDate.getTime();
  const isMobileNoticeViewport = window.matchMedia("(max-width: 760px)").matches;
  const openingNoticeKey = `marand-opening-notice-dismissed-august-3-${isMobileNoticeViewport ? "mobile" : "desktop"}`;
  let openingNoticeDismissed = false;

  try {
    openingNoticeDismissed = sessionStorage.getItem(openingNoticeKey) === "1";
  } catch (_) {}

  if (shouldShowOpeningNotice && !openingNoticeDismissed && !document.querySelector(".opening-notice")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <aside class="opening-notice" aria-label="Anunt deschidere Marand">
          <button class="opening-notice-close" type="button" aria-label="Inchide anuntul">×</button>
          <p class="opening-notice-kicker">Deschidere print shop</p>
          <p class="opening-notice-title">Ne vedem din 03 August.</p>
          <p class="opening-notice-copy">Pana atunci, ne poti trimite detaliile proiectului si revenim cu o oferta.</p>
          <a class="opening-notice-link" href="${toRoute("/oferta/")}">Cere oferta</a>
        </aside>
      `
    );

    const notice = document.querySelector(".opening-notice");
    const closeNotice = notice?.querySelector(".opening-notice-close");

    const dismissNotice = () => {
      notice?.classList.add("is-hidden");
      try {
        sessionStorage.setItem(openingNoticeKey, "1");
      } catch (_) {}
      window.setTimeout(() => notice?.remove(), 220);
    };

    closeNotice?.addEventListener("click", dismissNotice);
    window.requestAnimationFrame(() => notice?.classList.add("is-visible"));
  }

  const assetFallbackSrc = new URL(`${routeRoot}/assets/social/marand-print-shop-print-digital-servicii-de-printate.jpg`, window.location.href).href;
  document.querySelectorAll('img[src*="figma.com/api/mcp/asset"]').forEach((img) => {
    const handleBrokenAsset = () => {
      if (img.dataset.assetFallbackApplied === "1") {
        return;
      }

      const partner = img.closest(".partner-logo");
      if (partner) {
        img.dataset.assetFallbackApplied = "1";
        partner.innerHTML = `<span class="partner-logo-text">${img.alt || "Marand"}</span>`;
        return;
      }

      if (
        img.closest(".bg-blob-site") ||
        img.closest(".process-card-icon") ||
        img.closest(".equip-stat-icon") ||
        img.closest(".site-footer-lockup") ||
        img.closest(".logo")
      ) {
        img.dataset.assetFallbackApplied = "1";
        img.style.display = "none";
        return;
      }

      img.dataset.assetFallbackApplied = "1";
      img.classList.add("asset-fallback-image");
      img.src = assetFallbackSrc;
    };

    img.addEventListener("error", handleBrokenAsset);

    if (img.complete && img.naturalWidth === 0) {
      handleBrokenAsset();
    }
  });
})();
