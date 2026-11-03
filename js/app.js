// ═══ APP · ESTADO Y ESCUCHAS EN TIEMPO REAL (FIRESTORE) ═══
const ADMIN_PIN = "1234";
let adminUnlocked = false;
let products   = [];               // Colección "products"
let vendedores = [];               // Colección "vendedores"
let customers  = [];               // Colección "customers"

let currentActiveTab = "inventario";
let currentMgmtSubtab = "tiendas";
let cart = {};
let descuentos = {};
let activeCustomerId = null;
let activeCustomerData = null;
let orders = [];
let activeCategory = "";


function initApp() {
  if (!window._fsLib || !window._db) return;
  const { collection, onSnapshot } = window._fsLib;
  const db = window._db;

  // 1. Escuchador en vivo: VENDEDORES
  onSnapshot(collection(db, "vendedores"), snap => {
    vendedores = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    window.vendedores = vendedores;
    if (typeof populateLoginVendedores === "function") populateLoginVendedores();
    if (typeof renderVendedoresList === "function") renderVendedoresList();
  }, err => console.warn("vendedores onSnapshot error:", err));

  // 2. Escuchador en vivo: PRODUCTOS (Inventario y Catálogo en tiempo real)
  onSnapshot(collection(db, "products"), snap => {
    products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    window.products = products;
    if (typeof renderStockList === "function") {
      try { renderStockList(); } catch(e) { console.warn("renderStockList error:", e); }
    }
    if (typeof renderProducts === "function") {
      try { renderProducts(); } catch(e) { console.warn("renderProducts error:", e); }
    }
  }, err => console.warn("products onSnapshot error:", err));

  // 3. Escuchador en vivo: TIENDAS (Clientes)
  onSnapshot(collection(db, "customers"), snap => {
    customers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""));
    window.customers = customers;
    if (typeof renderCustomersList === "function") {
      try { renderCustomersList(); } catch(e) { console.warn("renderCustomersList error:", e); }
    }
  }, err => console.warn("customers onSnapshot error:", err));
}

let _appInitRan = false;
function tryInitApp() {
  if (_appInitRan) return;
  if (window._firebaseReady && window._db && window._fsLib) {
    _appInitRan = true;
    initApp();
  }
}

document.addEventListener("firebase-ready", tryInitApp);
if (window._firebaseReady && window._db) {
  tryInitApp();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tryInitApp);
} else {
  tryInitApp();
}
setTimeout(tryInitApp, 100);
setTimeout(tryInitApp, 500);

// ── NAVEGACIÓN PRINCIPAL: INVENTARIO Y TIENDAS/VENDEDORES ──
function switchMainTab(tab) {
  currentActiveTab = tab;

  // Cerrar sub-panel de agregar producto si estaba abierto
  if (typeof closeAddProductView === "function") closeAddProductView();

  // Limpiar active de todas las vistas
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".drawer-nav-item").forEach(d => d.classList.remove("active"));

  const isInv = tab === "inventario";
  const btnInv = document.getElementById("tab-btn-inventario");
  const btnCom = document.getElementById("tab-btn-comercios");
  const viewInv = document.getElementById("view-inventario");
  const viewCom = document.getElementById("view-comercios");

  if (btnInv) btnInv.classList.toggle("active", isInv);
  if (btnCom) btnCom.classList.toggle("active", !isInv);
  if (viewInv && isInv) viewInv.classList.add("active");
  if (viewCom && !isInv) viewCom.classList.add("active");

  const fab = document.getElementById("cart-fab");
  if (fab) {
    fab.style.setProperty("display", "none", "important");
    fab.classList.remove("visible");
  }

  // Título dinámico en el Header superior
  const titleEl = document.getElementById("header-page-title");
  if (titleEl) {
    titleEl.textContent = isInv ? "Control de Inventarios" : "Tiendas y Vendedores";
  }

  if (isInv) {
    if (typeof renderStockList === "function") renderStockList();
    if (typeof renderProducts === "function") renderProducts();
  } else {
    switchMgmtSubtab(currentMgmtSubtab);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── SUB-PESTAÑA DENTRO DEL APARTADO DE TIENDAS Y VENDEDORES ──
function switchMgmtSubtab(sub) {
  currentMgmtSubtab = sub;
  const isTiendas = sub === "tiendas";

  const btnT = document.getElementById("subtab-btn-tiendas");
  const btnV = document.getElementById("subtab-btn-vendedores");
  const panelT = document.getElementById("mgmt-panel-tiendas");
  const panelV = document.getElementById("mgmt-panel-vendedores");

  if (btnT) btnT.classList.toggle("active", isTiendas);
  if (btnV) btnV.classList.toggle("active", !isTiendas);
  if (panelT) panelT.style.display = isTiendas ? "block" : "none";
  if (panelV) panelV.style.display = !isTiendas ? "block" : "none";

  if (isTiendas) {
    if (typeof renderCustomersList === "function") renderCustomersList();
  } else {
    if (typeof renderVendedoresList === "function") renderVendedoresList();
  }
}

// Navegación de Vendedor y Administrador
function switchTab(tab, sub) {
  if (tab === "inventario" || (tab === "admin" && sub === "productos")) {
    switchMainTab("inventario");
    return;
  }
  if (tab === "clientes" || tab === "tiendas" || tab === "vendedores" || tab === "comercios") {
    switchMainTab("comercios");
    if (tab === "vendedores") switchMgmtSubtab("vendedores");
    else switchMgmtSubtab("tiendas");
    return;
  }

  // Vistas exclusivas de Vendedor (Catálogo, Pedido, Historial)
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".drawer-nav-item").forEach(d => d.classList.remove("active"));

  const targetView = document.getElementById("view-" + tab);
  if (targetView) targetView.classList.add("active");

  const tabBtn = document.getElementById("tab-btn-" + tab) || document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (tabBtn) tabBtn.classList.add("active");

  const drawerItem = document.querySelector(`.drawer-nav-item[data-drawer-tab="${tab}"]`);
  if (drawerItem) drawerItem.classList.add("active");

  const titleEl = document.getElementById("header-page-title");
  if (titleEl) {
    if (tab === "catalogo") titleEl.textContent = "Catálogo de Productos";
    else if (tab === "pedido") titleEl.textContent = "Mi Pedido";
    else if (tab === "historial") titleEl.textContent = "Historial de Pedidos";
  }

  const fab = document.getElementById("cart-fab");
  if (fab) {
    if (tab === "pedido") { fab.style.setProperty("display", "none", "important"); fab.classList.remove("visible"); }
    else if (typeof updateCartPillBar === "function") updateCartPillBar();
  }

  if (tab === "catalogo" && typeof renderProducts === "function") {
    renderProducts();
  } else if (tab === "pedido" && typeof renderCart === "function") {
    renderCart();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openDrawer() {
  document.getElementById("app-drawer")?.classList.add("open");
  document.getElementById("drawer-backdrop")?.classList.add("open");
}
function closeDrawer() {
  document.getElementById("app-drawer")?.classList.remove("open");
  document.getElementById("drawer-backdrop")?.classList.remove("open");
}

function showFirebaseErrorBanner(msg) { toast(msg, 5000); }

// Menú del avatar en el header
function toggleHeaderMenu() {
  document.getElementById("header-menu")?.classList.toggle("open");
}
function closeHeaderMenu() {
  document.getElementById("header-menu")?.classList.remove("open");
}
document.addEventListener("click", (e) => {
  const menu = document.getElementById("header-menu");
  if (menu && menu.classList.contains("open") && !e.target.closest(".header-avatar")) {
    menu.classList.remove("open");
  }
});
