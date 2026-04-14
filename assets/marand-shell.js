(() => {
  const page = document.body.dataset.marandPage || "home";
  const navActive = document.body.dataset.marandNavActive || page;
  const isNestedPage = /\/(produse|oferta|echipamente|contact|productie)(\/|index\.html$)/.test(window.location.pathname);
  const routeRoot = isNestedPage ? ".." : ".";
  const toRoute = (path) => `${routeRoot}${path}`;

  const navItems = [
    { key: "products", label: "Produse", href: toRoute("/produse/") },
    { key: "design", label: "Design", href: toRoute("/#design") },
    { key: "process", label: "Cum Lucram", href: toRoute("/#cum-functioneaza") },
    { key: "production", label: "Productie", href: toRoute("/productie/") },
    { key: "equipment", label: "Echipamente", href: toRoute("/echipamente/") },
    { key: "contact", label: "Contact", href: toRoute("/contact/") }
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
        { label: "Small Format", href: toRoute("/produse/#small-format") }
      ]
    },
    {
      title: "Company",
      links: [
        { label: "Homepage", href: toRoute("/#design") },
        { label: "Proces", href: toRoute("/#cum-functioneaza") },
        { label: "Galerie", href: toRoute("/#galerie") },
        { label: "Ofertă", href: toRoute("/oferta/") }
      ]
    },
    {
      title: "Contact",
      links: [
        { label: "hello@marand.ro", href: "mailto:hello@marand.ro" },
        { label: "+40 (XXX) XXX-XXX", href: "tel:+40000000000" },
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
          <a class="logo" href="${toRoute("/")}" aria-label="Marand — Acasă"><img class="logo-icon" src="https://www.figma.com/api/mcp/asset/8b2090a2-5a19-419e-9cf0-05f4b3eb92cb" alt="" /><img class="logo-wordmark" src="https://www.figma.com/api/mcp/asset/b75900d8-2cb3-4139-b47c-08ddf6c87776" alt="Marand" /></a>
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
              <div class="site-footer-social" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
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
            <div class="site-footer-mark">
              <img src="https://www.figma.com/api/mcp/asset/6cb3be78-f6e9-4abb-9a91-1e7e48d4ef8a" alt="" />
            </div>
            <div class="site-footer-wordmark">
              <img src="https://www.figma.com/api/mcp/asset/1dfd1c09-b39f-46af-bb9d-5da7e9cecc59" alt="" />
            </div>
          </div>
        </div>
      </footer>
    `;
  }
})();
