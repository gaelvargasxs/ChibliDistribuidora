function esc(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
let toastTimer;
function toast(msg, duration = 2400) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}
function confirmModal({ title = "¿Estás seguro?", msg = "", confirmLabel = "Eliminar", onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>
      <div class="confirm-title">${title}</div>
      ${msg ? `<div class="confirm-msg">${msg}</div>` : ""}
      <div class="confirm-actions">
        <button class="btn btn-secondary" id="confirm-cancel-btn">Cancelar</button>
        <button class="btn" id="confirm-ok-btn"
          style="background:var(--red-600);color:var(--white);">${confirmLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#confirm-cancel-btn").onclick = () => overlay.remove();
  overlay.querySelector("#confirm-ok-btn").onclick = () => { overlay.remove(); onConfirm(); };
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}
function getHoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

const PRODUCT_CATEGORY_SVGS = {
  agua: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M9.5 14.5a3 3 0 0 0 3 3"/></svg>`,
  bebida: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M6 8h11v9a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8z"/><line x1="9" y1="3" x2="9" y2="8"/><line x1="14" y1="3" x2="14" y2="8"/></svg>`,
  botana: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="15" cy="15.5" r="1"/><circle cx="11" cy="11" r="1"/></svg>`,
  aceite: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2h4"/><path d="M11 2v3l-4.5 5.5A4 4 0 0 0 5.5 13V19a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-6a4 4 0 0 0-1-2.5L13 5V2"/><path d="M5.5 14.5h13"/></svg>`,
  limpieza: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.6 3.9L17.5 8.5l-3.9 1.6L12 14l-1.6-3.9L6.5 8.5l3.9-1.6L12 3z"/><path d="M19 14l.8 2 .2.2 2 .8-2 .8-.2.2-.8 2-.8-2-.2-.2-2-.8 2-.8.2-.2.8-2z"/><path d="M5 17l.6 1.4 1.4.6-1.4.6L5 21l-.6-1.4L3 19l1.4-.6L5 17z"/></svg>`,
  lacteo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2h8"/><path d="M9 2v3l-2 3v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8l-2-3V2"/><path d="M7 11h10"/><circle cx="12" cy="15.5" r="1.5"/></svg>`,
  enlatado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13C5 19.88 8.13 21 12 21s7-1.12 7-2.5v-13"/><path d="M5 12c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5"/></svg>`,
  pan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a8 8 0 0 1 16 0v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6z"/><path d="M9 8.5l1.5 3"/><path d="M13.5 8l1 3"/></svg>`,
  grano: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 19a7 7 0 0 1 7-7c0 3.87-3.13 7-7 7z"/><path d="M11 12a7 7 0 0 1 7-7c0 3.87-3.13 7-7 7z"/><path d="M5 20l14-14"/></svg>`,
  basico: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`
};

function getProductIconMeta(category, emoji) {
  const norm = String(category || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const em = String(emoji || "");
  if (norm.includes("agua") || em === "💧") return { tone: "tone-sky", svg: PRODUCT_CATEGORY_SVGS.agua };
  if (norm.includes("refresco") || norm.includes("bebida") || norm.includes("jugo") || em === "🥤" || em === "🧃") {
    return { tone: "tone-violet", svg: PRODUCT_CATEGORY_SVGS.bebida };
  }
  if (norm.includes("botana") || norm.includes("dulce") || norm.includes("snack") || em === "🍪" || em === "🍬") {
    return { tone: "tone-amber", svg: PRODUCT_CATEGORY_SVGS.botana };
  }
  if (norm.includes("aceite") || em === "🫙") return { tone: "tone-gold", svg: PRODUCT_CATEGORY_SVGS.aceite };
  if (norm.includes("limpieza") || norm.includes("higiene") || em === "🧼") return { tone: "tone-emerald", svg: PRODUCT_CATEGORY_SVGS.limpieza };
  if (norm.includes("lacteo") || norm.includes("leche") || em === "🥛") return { tone: "tone-cyan", svg: PRODUCT_CATEGORY_SVGS.lacteo };
  if (norm.includes("enlatado") || em === "🥫") return { tone: "tone-rose", svg: PRODUCT_CATEGORY_SVGS.enlatado };
  if (norm.includes("pan") || norm.includes("harina") || em === "🍞") return { tone: "tone-orange", svg: PRODUCT_CATEGORY_SVGS.pan };
  if (norm.includes("grano") || norm.includes("sazonador") || em === "🫘" || em === "🧂") {
    return { tone: "tone-orange", svg: PRODUCT_CATEGORY_SVGS.grano };
  }
  if (norm.includes("basico")) return { tone: "tone-blue", svg: PRODUCT_CATEGORY_SVGS.basico };
  return { tone: "tone-slate", svg: PRODUCT_CATEGORY_SVGS.basico };
}

window.getProductIconMeta = getProductIconMeta;
