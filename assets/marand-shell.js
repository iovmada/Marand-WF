(() => {
  const page = document.body.dataset.marandPage || "home";
  const navActive = document.body.dataset.marandNavActive || page;
  const isNestedPage = /\/(produse|produse-test|oferta|echipamente|contact|productie|materiale|comunicat-de-presa)(\/|index\.html$)/.test(window.location.pathname);
  const routeRoot = isNestedPage ? ".." : ".";
  const toRoute = (path) => `${routeRoot}${path}`;
  const whatsappHref = "https://wa.me/40725894569?text=Buna%2C%20vreau%20o%20oferta%20pentru%20un%20proiect%20de%20print.";
  const brandLogo = toRoute("/assets/brand/logo.svg");

  const navItems = [
    { key: "products", label: "Produse", href: toRoute("/produse/") },
    { key: "materials", label: "Materiale", href: toRoute("/materiale/") },
    { key: "process", label: "Cum Lucram", href: toRoute("/#cum-functioneaza") },
    { key: "equipment", label: "Echipamente", href: toRoute("/echipamente/") },
    { key: "contact", label: "Contact", href: toRoute("/contact/") }
  ];

  const socialLinks = [
    {
      label: "Instagram",
      href: "https://www.instagram.com/marandprint",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>`
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61588679174224",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.4c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0 0 22 12z"/></svg>`
    },
    {
      label: "TikTok",
      href: "#",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.6 6.3a4.6 4.6 0 0 1-3.2-1.4 4.6 4.6 0 0 1-1.3-2.6V2h-3.4v13a2.6 2.6 0 1 1-1.9-2.5V9a6 6 0 1 0 5.3 5.9V8.5a8 8 0 0 0 4.7 1.5V6.6a4.7 4.7 0 0 1-.2-.3z"/></svg>`
    }
  ];

  const footerGroups = [
    {
      title: "Produse",
      links: [
        { label: "Large format", href: toRoute("/produse/#large-format") },
        { label: "Bannere și mesh", href: toRoute("/produse/#banners") },
        { label: "Printuri pe canvas", href: toRoute("/produse/#canvas") },
        { label: "Stickere și vinyl", href: toRoute("/produse/#stickers") },
        { label: "Tricouri și textile", href: toRoute("/produse/#textiles") },
        { label: "Small Format", href: toRoute("/produse/#small-format") },
        { label: "Materiale", href: toRoute("/materiale/") }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "Homepage", href: toRoute("/#design") },
        { label: "Proces", href: toRoute("/#cum-functioneaza") },
        { label: "Galerie", href: toRoute("/#galerie") },
        { label: "Ofertă", href: toRoute("/oferta/") },
        { label: "Proiect finanțat prin Programul Regional Vest", href: toRoute("/comunicat-de-presa/") }
      ]
    },
    {
      title: "Contact",
      links: [
        { label: "office@marand-print.ro", href: "mailto:office@marand-print.ro" },
        { label: "0725894569", href: "tel:+40725894569" },
        { label: "Cere ofertă", href: toRoute("/oferta/") },
        { label: "Lun-Vin: 9-18", href: "#contact" }
      ]
    }
  ];

  const headerTarget = document.querySelector("[data-marand-shell-header]");
  const footerTarget = document.querySelector("[data-marand-shell-footer]");

  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="container">
          <a class="logo" href="${toRoute("/")}" aria-label="Marand — Acasă">
            <img class="logo-full" src="${brandLogo}" alt="Marand" />
          </a>
          <nav class="nav-pill" aria-label="Navigare principală">
            ${navItems.map((item) => `<a class="${navActive === item.key ? "is-active" : ""}" href="${item.href}">${item.label}</a>`).join("")}
          </nav>
          <button class="nav-burger" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Deschide meniul">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <a class="cta cta-primary cta-pill header-cta" href="${toRoute("/oferta/")}">Cere Oferta</a>
        </div>
        <div class="mobile-nav" id="mobile-nav" hidden>
          <button class="mobile-nav-close" type="button" aria-label="Închide meniul">×</button>
          <div class="mobile-nav-panel">
            <nav class="mobile-nav-links" aria-label="Navigare principală pe mobil">
              ${navItems.map((item) => `<a class="${navActive === item.key ? "is-active" : ""}" href="${item.href}">${item.label}</a>`).join("")}
            </nav>
            <a class="cta cta-primary cta-pill mobile-nav-cta" href="${toRoute("/oferta/")}">Cere Oferta</a>
          </div>
        </div>
      </header>
    `;

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

  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer class="site-footer" id="contact">
        <div class="site-footer-inner">
          <div class="site-footer-top">
            <div class="site-footer-brand">
              <div class="site-footer-social" aria-label="Retele sociale Marand">
                ${socialLinks.map((item) => `<a class="site-footer-social-link" href="${item.href}" aria-label="${item.label}" target="_blank" rel="noopener noreferrer">${item.icon}</a>`).join("")}
              </div>
              <p class="site-footer-intro">Print shop profesionist — large format, bannere, canvas, stickere, textile și multe altele. Calitate și execuție rapidă.</p>
            </div>
            <div class="site-footer-links">
              ${footerGroups.map((group) => `
                <div class="site-footer-column">
                  <h3 class="site-footer-heading">${group.title}</h3>
                  <ul class="site-footer-list">
                    ${group.links.map((link) => `<li><a href="${link.href}">${link.label}</a></li>`).join("")}
                  </ul>
                </div>
              `).join("")}
            </div>
          </div>
          <p class="site-footer-legal">© 2026 Marand Print Shop. Toate drepturile rezervate.</p>
          <div class="site-footer-lockup" aria-hidden="true">
            <img class="site-footer-logo" src="${brandLogo}" alt="" />
          </div>
        </div>
      </footer>
    `;
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

  const openingDate = new Date(2026, 5, 1);
  const shouldShowOpeningNotice = Date.now() < openingDate.getTime();
  const isMobileNoticeViewport = window.matchMedia("(max-width: 760px)").matches;
  const openingNoticeKey = `marand-opening-notice-dismissed-${isMobileNoticeViewport ? "mobile" : "desktop"}`;
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
          <p class="opening-notice-title">Ne vedem din 1 iunie.</p>
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
