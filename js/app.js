// ═══ APP · ESTADO Y ESCUCHAS DE FIRESTORE ═══
const ADMIN_PIN = "1234";          // respaldo sin internet (ver login.js)
let adminUnlocked = false;
let products   = [];               // colección "products"
let vendedores = [];               // colección "vendedores"

function initApp() {
  const { collection, onSnapshot } = window._fsLib;
  const db = window._db;

  // Vendedores: alimenta el buscador del login
  onSnapshot(collection(db, "vendedores"), snap => {
    vendedores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (typeof populateLoginVendedores === "function") populateLoginVendedores();
  }, err => console.warn("vendedores:", err));

  // Productos: cada cambio en Firestore refresca el inventario en vivo
  onSnapshot(collection(db, "products"), snap => {
    products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderStockList();
  }, err => console.warn("products:", err));
}
document.addEventListener("firebase-ready", initApp);

// Esta entrega solo incluye el módulo de Inventario: la navegación apunta a él.
function switchTab(tab, sub) {
  if (typeof closeAddProductView === "function") closeAddProductView();
}
// El catálogo de venta pertenece a una entrega posterior (se invoca desde stock.js)
function renderProducts() {}

function showFirebaseErrorBanner(msg) { toast(msg, 5000); }

// Menú del avatar
function toggleHeaderMenu() {
  document.getElementById("header-menu").classList.toggle("open");
}
function closeHeaderMenu() {
  const m = document.getElementById("header-menu");
  if (m) m.classList.remove("open");
}
document.addEventListener("click", (e) => {
  const menu = document.getElementById("header-menu");
  if (menu && menu.classList.contains("open") && !e.target.closest(".header-avatar")) {
    menu.classList.remove("open");
  }
});
