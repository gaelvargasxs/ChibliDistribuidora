// ════════════════════════════════════════════════════════════════
// MÓDULOS AGREGADOS: Dashboard · Pedidos/Rendimiento · Tickets · Caja
// No modifica ningún archivo existente: envuelve switchMainTab() y deja
// que las pestañas originales (inventario, comercios) sigan igual.
// ════════════════════════════════════════════════════════════════
(function () {
  const EXTRA = {
    dashboard: { view: "view-admin", sub: "dashboard", title: "Dashboard",             render: () => typeof renderAdminDashboard === "function" && renderAdminDashboard() },
    pedidos:   { view: "view-admin", sub: "pedidos",   title: "Pedidos y Rendimiento", render: () => typeof renderRendimiento === "function" && renderRendimiento() },
    tickets:   { view: "view-admin", sub: "tickets",   title: "Impresión de Tickets",  render: () => typeof renderTickets === "function" && renderTickets() },
    caja:      { view: "view-caja",                     title: "Caja y Contabilidad",   render: () => typeof renderCaja === "function" && renderCaja() }
  };

  let liveStarted = false;
  let currentExtra = null;

  // Escucha en vivo de pedidos y gastos (solo admin, una sola vez).
  function startLive() {
    if (liveStarted || !window._firebaseReady || !window._db) return;
    liveStarted = true;
    try {
      window._db.collection("orders").onSnapshot(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        orders.length = 0; orders.push(...list); window.orders = orders;
        if (currentExtra) EXTRA[currentExtra].render();
      }, err => console.warn("orders onSnapshot:", err.code || err.message));
    } catch (e) { console.warn("No se pudo escuchar orders:", e); }
    if (typeof initGastos === "function") initGastos();
  }

  const original = window.switchMainTab;
  window.switchMainTab = function (tab) {
    const cfg = EXTRA[tab];
    if (!cfg) { currentExtra = null; return original.apply(this, arguments); }
    if (typeof currentSession !== "undefined" && currentSession && currentSession.role !== "admin") return;

    currentActiveTab = tab;
    currentExtra = tab;
    if (typeof closeAddProductView === "function") closeAddProductView();
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".drawer-nav-item").forEach(d => d.classList.remove("active"));
    document.querySelectorAll("[data-drawer-admin]").forEach(b => b.classList.toggle("active", b.dataset.drawerAdmin === tab));
    document.getElementById("tab-btn-" + tab)?.classList.add("active");

    document.getElementById(cfg.view)?.classList.add("active");
    if (cfg.sub) {
      document.querySelectorAll("#view-admin .admin-subview").forEach(v => v.classList.remove("active"));
      document.getElementById("admin-subview-" + cfg.sub)?.classList.add("active");
    }
    const fab = document.getElementById("cart-fab");
    if (fab) { fab.style.setProperty("display", "none", "important"); fab.classList.remove("visible"); }
    const titleEl = document.getElementById("header-page-title");
    if (titleEl) titleEl.textContent = cfg.title;

    startLive();
    try { cfg.render(); } catch (e) { console.error("Error al mostrar " + tab, e); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Selector de Tema Oscuro / Claro para Administrador ─────────
  const THEME_STORAGE_KEY = "chibli_admin_theme";

  function syncThemeUI(isDark) {
    document.body.classList.toggle("theme-dark", isDark);
    const lbl = document.getElementById("theme-toggle-label");
    if (lbl) lbl.textContent = isDark ? "Claro" : "Oscuro";
  }

  window.applySavedAdminTheme = function () {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    // Por defecto inicia en modo oscuro ("dark") a menos que el usuario elija "light"
    const isDark = saved ? saved === "dark" : true;
    syncThemeUI(isDark);
  };

  window.toggleAdminTheme = function () {
    const isDark = !document.body.classList.contains("theme-dark");
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    syncThemeUI(isDark);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.applySavedAdminTheme);
  } else {
    window.applySavedAdminTheme();
  }
})();
