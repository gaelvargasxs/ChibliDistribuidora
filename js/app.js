// ═══ APP · ESTADO Y ESCUCHAS EN TIEMPO REAL (FIRESTORE) ═══
const ADMIN_PIN = "1234";
let adminUnlocked = false;
let products   = [];               // Colección "products"
let vendedores = [];               // Colección "vendedores"
let customers  = [];               // Colección "customers"

let currentActiveTab = "inventario";
let currentMgmtSubtab = "tiendas";

function initApp() {
  const { collection, onSnapshot } = window._fsLib;
  const db = window._db;

  // 1. Escuchador en vivo: VENDEDORES
  onSnapshot(collection(db, "vendedores"), snap => {
    vendedores = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    if (typeof populateLoginVendedores === "function") populateLoginVendedores();
    if (typeof renderVendedoresList === "function") renderVendedoresList();
  }, err => console.warn("vendedores onSnapshot error:", err));

  // 2. Escuchador en vivo: PRODUCTOS (Inventario)
  onSnapshot(collection(db, "products"), snap => {
    products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (typeof renderStockList === "function") renderStockList();
  }, err => console.warn("products onSnapshot error:", err));

  // 3. Escuchador en vivo: TIENDAS (Clientes)
  onSnapshot(collection(db, "customers"), snap => {
    customers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""));
    if (typeof renderCustomersList === "function") renderCustomersList();
  }, err => console.warn("customers onSnapshot error:", err));
}
document.addEventListener("firebase-ready", initApp);

// ── NAVEGACIÓN PRINCIPAL: INVENTARIO Y TIENDAS/VENDEDORES ──
function switchMainTab(tab) {
  currentActiveTab = tab;

  // Cerrar sub-panel de agregar producto si estaba abierto
  if (typeof closeAddProductView === "function") closeAddProductView();

  const isInv = tab === "inventario";
  const btnInv = document.getElementById("tab-btn-inventario");
  const btnCom = document.getElementById("tab-btn-comercios");
  const viewInv = document.getElementById("view-inventario");
  const viewCom = document.getElementById("view-comercios");

  if (btnInv) btnInv.classList.toggle("active", isInv);
  if (btnCom) btnCom.classList.toggle("active", !isInv);
  if (viewInv) viewInv.classList.toggle("active", isInv);
  if (viewCom) viewCom.classList.toggle("active", !isInv);

  // Título dinámico en el Header superior
  const titleEl = document.getElementById("header-page-title");
  if (titleEl) {
    titleEl.textContent = isInv ? "Control de Inventarios" : "Tiendas y Vendedores";
  }

  if (isInv) {
    if (typeof renderStockList === "function") renderStockList();
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

// Compatibilidad con llamadas legacy
function switchTab(tab, sub) {
  if (tab === "admin" && sub === "productos") switchMainTab("inventario");
  else if (tab === "clientes" || tab === "tiendas" || tab === "vendedores" || tab === "comercios") {
    switchMainTab("comercios");
    if (tab === "vendedores") switchMgmtSubtab("vendedores");
    else switchMgmtSubtab("tiendas");
  } else {
    switchMainTab("inventario");
  }
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
