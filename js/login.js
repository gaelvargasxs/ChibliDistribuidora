// ════════════════════════════════════════════════════════════════
// AUTENTICACIÓN GOOGLE SIGN-IN — VENDEDORES Y ADMINISTRADORES
// ════════════════════════════════════════════════════════════════
let currentSession = null;
let _loginInProgress = false;

const ADMIN_WHITELIST = [
  "nel0407gael@gmail.com",
  "admin@chibli.com"
];

const VENDEDOR_INACTIVITY_MS = 8 * 60 * 60 * 1000; // 8 horas para vendedores en ruta
const ADMIN_INACTIVITY_MS    = 10 * 60 * 1000;     // 10 minutos para administradores

const STORAGE_LAST_ACTIVITY  = "chibli_last_activity";
const STORAGE_ACTIVE_ROLE    = "chibli_active_role";
const STORAGE_REDIRECT_ROLE  = "chibli_redirect_role";

function setLoginRole(role) {
  const isVend = role === "vendedor";
  document.getElementById("toggle-vendedor")?.classList.toggle("active", isVend);
  document.getElementById("toggle-admin")?.classList.toggle("active",   !isVend);

  const titleEl = document.getElementById("login-title");
  const subEl   = document.getElementById("login-sub");
  const noteEl  = document.getElementById("login-google-note");
  if (!isVend) {
    if (titleEl) titleEl.textContent = "Acceso Administrador";
    if (subEl)   subEl.innerHTML     = "Inicia sesión con tu <span>cuenta autorizada de Google</span>.";
    if (noteEl)  noteEl.textContent  = "Acceso exclusivo para cuentas administrativas autorizadas.";
  } else {
    if (titleEl) titleEl.textContent = "Ingreso de Vendedor";
    if (subEl)   subEl.innerHTML     = "Inicia sesión con tu <span>correo Gmail registrado</span> por el administrador.";
    if (noteEl)  noteEl.textContent  = "Usa Chrome o Safari directamente (no el visor interno de WhatsApp).";
  }

  const roleInput = document.getElementById("login-role-value");
  if (roleInput) roleInput.value = role;

  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.classList.remove("show");
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
  }
}

function showLoginError(msg) {
  const errEl = document.getElementById("login-error");
  if (!errEl) return;
  errEl.style.background = "";
  errEl.style.color = "";
  errEl.style.borderColor = "";
  errEl.textContent = msg;
  errEl.classList.add("show");
}

function setGoogleBtnBusy(busy, labelText) {
  const btn = document.getElementById("btn-google-signin");
  if (!btn) return;
  btn.disabled = !!busy;
  const span = btn.querySelector("span");
  if (span) span.textContent = labelText || "Continuar con Google";
}

async function resolveAuthorizedUser(user, preferredRole) {
  if (!user || !user.email) {
    throw new Error("No se recibió el correo de tu cuenta de Google.");
  }

  const email = user.email.toLowerCase().trim();
  if (user.emailVerified === false) {
    throw new Error("Tu correo de Google debe estar verificado para continuar.");
  }

  // Modo Administrador
  if (preferredRole === "admin") {
    if (!ADMIN_WHITELIST.includes(email)) {
      throw new Error("Acceso denegado: la cuenta " + email + " no está autorizada como Administrador.");
    }
    return {
      role: "admin",
      adminEmail: email,
      adminName: user.displayName || "Administrador"
    };
  }

  // Modo Vendedor: consulta exclusivamente su propio documento vendedores/{email}
  if (!window._db || !window._firebaseReady) {
    throw new Error("Sin conexión con Firebase para verificar tu acceso.");
  }

  let vendSnap;
  try {
    vendSnap = await window._db.collection("vendedores").doc(email).get();
  } catch (err) {
    if (err?.code === "permission-denied" && ADMIN_WHITELIST.includes(email)) {
      throw new Error("Tu cuenta es de Administrador. Cambia a la pestaña «Administrador» arriba para entrar.");
    }
    throw err;
  }

  if (vendSnap.exists) {
    const data = vendSnap.data() || {};
    if (data.activo === false) {
      throw new Error("Tu acceso de vendedor (" + (data.folio || email) + ") está desactivado.");
    }
    return {
      role: "vendedor",
      vendedorId: vendSnap.id,
      vendedorEmail: email,
      vendedorFolio: data.folio || "VEN-001",
      vendedorNombre: data.nombre || user.displayName || "Vendedor"
    };
  }

  if (ADMIN_WHITELIST.includes(email)) {
    throw new Error("Tu cuenta es de Administrador. Cambia a la pestaña «Administrador» arriba (o regístrate en Vendedores para operar en ruta).");
  }

  throw new Error("Acceso denegado: el correo " + email + " no está registrado como vendedor autorizado.");
}

// ═══ SESIÓN ═══
function applySession() {
  if (!currentSession) return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_ROLE, currentSession.role);
    localStorage.setItem(STORAGE_LAST_ACTIVITY, String(Date.now()));
  } catch (e) {}

  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.classList.remove("show");
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
  }

  if (typeof startAppDataSync === "function") {
    startAppDataSync(currentSession);
  }

  // ── PANTALLA DEL VENDEDOR (CATÁLOGO, CARRITO Y PEDIDO) ──
  if (currentSession.role === "vendedor") {
    document.getElementById("login-screen")?.classList.add("hidden");
    document.body.classList.add("role-vendedor");
    document.body.classList.remove("role-admin");
    const header = document.getElementById("app-header");
    if (header) header.style.display = "";
    const sessLbl = document.getElementById("session-label");
    if (sessLbl) sessLbl.textContent = currentSession.vendedorNombre || "Vendedor";
    const menuSub = document.getElementById("header-menu-sub");
    if (menuSub) menuSub.textContent = currentSession.vendedorFolio || currentSession.vendedorEmail || "";

    const dAvatar = document.getElementById("drawer-user-avatar");
    const dName   = document.getElementById("drawer-user-name");
    const dFolio  = document.getElementById("drawer-user-folio");
    if (dAvatar) dAvatar.textContent = "VEN";
    if (dName)   dName.textContent   = currentSession.vendedorNombre || "Vendedor";
    if (dFolio)  dFolio.textContent  = "Folio: " + (currentSession.vendedorFolio || "VEN-001");

    const gVend = document.getElementById("drawer-group-vendedor");
    const gAdm  = document.getElementById("drawer-group-admin");
    if (gVend) gVend.style.display = "block";
    if (gAdm)  gAdm.style.display  = "none";

    const hCartBtn = document.getElementById("header-cart-btn");
    if (hCartBtn) hCartBtn.style.display = "inline-flex";

    if (typeof switchTab === "function") switchTab("catalogo");
    resetInactivityTimer();
    toast("Bienvenido, " + (currentSession.vendedorNombre || "Vendedor"));
    return;
  }

  // ── ADMINISTRADOR: ENTRA AL PANEL CENTRAL ──
  document.getElementById("login-screen")?.classList.add("hidden");
  document.body.classList.add("role-admin");
  document.body.classList.remove("role-vendedor");
  const header = document.getElementById("app-header");
  const tabBar = document.getElementById("tab-bar");
  if (header) header.style.display = "";
  if (tabBar) tabBar.style.display = "";

  const sessLbl = document.getElementById("session-label");
  if (sessLbl) sessLbl.textContent = currentSession.adminName || "Administrador";
  const menuSub = document.getElementById("header-menu-sub");
  if (menuSub) menuSub.textContent = currentSession.adminEmail || "";

  const dAvatar = document.getElementById("drawer-user-avatar");
  const dName   = document.getElementById("drawer-user-name");
  const dFolio  = document.getElementById("drawer-user-folio");
  if (dAvatar) dAvatar.textContent = "ADM";
  if (dName)   dName.textContent   = currentSession.adminName || "Administrador";
  if (dFolio)  dFolio.textContent  = currentSession.adminEmail || "";

  const gVend = document.getElementById("drawer-group-vendedor");
  const gAdm  = document.getElementById("drawer-group-admin");
  if (gVend) gVend.style.display = "none";
  if (gAdm)  gAdm.style.display  = "block";

  const hCartBtn = document.getElementById("header-cart-btn");
  if (hCartBtn) hCartBtn.style.display = "none";

  switchMainTab("inventario");
  resetInactivityTimer();
  toast("Bienvenido, Administrador");
}

function doLogout() {
  stopInactivityTimer();
  try {
    sessionStorage.removeItem("chibli_session");
    localStorage.removeItem(STORAGE_LAST_ACTIVITY);
    localStorage.removeItem(STORAGE_ACTIVE_ROLE);
    localStorage.removeItem(STORAGE_REDIRECT_ROLE);
  } catch (e) {}

  if (typeof stopAppDataSync === "function") stopAppDataSync();
  if (window._auth) window._auth.signOut().catch(() => {});
  currentSession = null;
  adminUnlocked = false;
  closeHeaderMenu();
  if (typeof closeAddProductView === "function") closeAddProductView();
  document.body.classList.remove("role-admin", "role-vendedor");

  const header = document.getElementById("app-header");
  const tabBar = document.getElementById("tab-bar");
  if (header) header.style.display = "none";
  if (tabBar) tabBar.style.display = "none";

  const fab = document.getElementById("cart-fab");
  if (fab) { fab.style.setProperty("display", "none", "important"); fab.classList.remove("visible"); }

  ["view-inventario", "view-comercios", "view-admin", "view-caja", "view-catalogo", "view-pedido", "view-historial"].forEach(id => {
    document.getElementById(id)?.classList.remove("active");
  });
  document.getElementById("login-screen")?.classList.remove("hidden");
  setGoogleBtnBusy(false);
  setLoginRole(document.getElementById("login-role-value")?.value || "vendedor");
}

// ════════════════════════════════════════════════════════════════
// GOOGLE SIGN-IN (VENDEDORES + ADMINISTRADOR, COMPATIBLE CON SAFARI)
// ════════════════════════════════════════════════════════════════
function isInAppWebView() {
  return /FBAN|FBAV|Instagram|WhatsApp|Line|MicroMessenger/i.test(navigator.userAgent || "");
}

function handleGoogleAuthError(e) {
  console.warn("Google Sign-In error:", e);
  if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return;

  if (isInAppWebView()) {
    showLoginError("Abre esta página en Safari o Chrome (Google bloquea el inicio de sesión dentro de WhatsApp o redes sociales).");
    return;
  }
  if (e?.code === "auth/operation-not-supported-in-this-environment" || window.location.protocol === "file:") {
    showLoginError("Google Sign-In requiere servidor web HTTPS (Vercel, Firebase Hosting o http://localhost).");
  } else if (e?.code === "auth/unauthorized-domain") {
    const dom = window.location.hostname || "este dominio";
    showLoginError("Dominio (" + dom + ") no autorizado. Agrégalo en Firebase Authentication > Authorized domains y en Google Cloud OAuth (o abre tu URL principal de Vercel).");
  } else if (e?.code === "auth/popup-blocked") {
    showLoginError("Safari bloqueó la ventana de Google. Activa las ventanas emergentes para este sitio e intenta de nuevo.");
  } else {
    showLoginError(e?.message || "Error al iniciar sesión con Google.");
  }
}

function doGoogleLogin() {
  const authInstance = window._auth || (window.firebase && typeof firebase.auth === "function" ? firebase.auth() : null);
  const role = document.getElementById("login-role-value")?.value || "vendedor";
  const errEl = document.getElementById("login-error");
  if (errEl) errEl.classList.remove("show");

  if (!authInstance) {
    showLoginError("Firebase Authentication no disponible. Verifica tu conexión.");
    return;
  }

  // Importante para Safari: llamar signInWithPopup de forma SÍNCRONA dentro del click,
  // sin await previos, para no perder el gesto del usuario.
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  _loginInProgress = true;
  setGoogleBtnBusy(true, "Conectando con Google…");

  authInstance.signInWithPopup(provider)
    .then(async (result) => {
      try {
        const session = await resolveAuthorizedUser(result.user, role);
        currentSession = session;
        adminUnlocked = session.role === "admin";
        applySession();
      } catch (authzErr) {
        await authInstance.signOut().catch(() => {});
        showLoginError(authzErr?.message || "No tienes permiso para acceder.");
      }
    })
    .catch(async (e) => {
      // Respaldo automático en Safari / móvil si bloquea el popup
      if (e?.code === "auth/popup-blocked") {
        try {
          localStorage.setItem(STORAGE_REDIRECT_ROLE, role);
          setGoogleBtnBusy(true, "Redirigiendo a Google…");
          await authInstance.signInWithRedirect(provider);
          return;
        } catch (redirErr) {
          localStorage.removeItem(STORAGE_REDIRECT_ROLE);
          handleGoogleAuthError(redirErr);
          return;
        }
      }
      handleGoogleAuthError(e);
    })
    .finally(() => {
      _loginInProgress = false;
      setGoogleBtnBusy(false);
    });
}

// ════════════════════════════════════════════════════════════════
// CONTROL DE INACTIVIDAD DE SESIÓN
// Vendedor en ruta: 8 horas | Administrador: 10 minutos
// ════════════════════════════════════════════════════════════════
let inactivityTimer = null;
let _lastActivityWrite = 0;

function getInactivityLimitMs(role) {
  return role === "vendedor" ? VENDEDOR_INACTIVITY_MS : ADMIN_INACTIVITY_MS;
}

function resetInactivityTimer() {
  if (!currentSession) return;
  const now = Date.now();
  if (now - _lastActivityWrite > 15000) {
    _lastActivityWrite = now;
    try { localStorage.setItem(STORAGE_LAST_ACTIVITY, String(now)); } catch (e) {}
  }
  clearTimeout(inactivityTimer);
  const limitMs = getInactivityLimitMs(currentSession.role);
  const label   = currentSession.role === "vendedor" ? "8 horas" : "10 minutos";
  inactivityTimer = setTimeout(() => {
    if (currentSession) {
      toast(`Tu sesión ha expirado por inactividad (${label}) por seguridad.`, 5000);
      doLogout();
    }
  }, limitMs);
}

function stopInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = null;
}

["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"].forEach(evt => {
  document.addEventListener(evt, resetInactivityTimer, { passive: true });
});

// ════════════════════════════════════════════════════════════════
// RESTAURACIÓN DE SESIÓN VERIFICADA POR FIREBASE AUTH (SIN DEMOS)
// ════════════════════════════════════════════════════════════════
let _authInitStarted = false;

async function initAuthSession() {
  if (_authInitStarted) return;
  const authInstance = window._auth || (window.firebase && typeof firebase.auth === "function" ? firebase.auth() : null);
  if (!authInstance || !window._firebaseReady) return;
  _authInitStarted = true;

  let redirectRole = null;
  try {
    redirectRole = localStorage.getItem(STORAGE_REDIRECT_ROLE);
    const redirResult = await authInstance.getRedirectResult();
    if (redirResult && redirResult.user) {
      localStorage.removeItem(STORAGE_REDIRECT_ROLE);
      const role = redirectRole || "vendedor";
      setLoginRole(role);
      try {
        const session = await resolveAuthorizedUser(redirResult.user, role);
        currentSession = session;
        adminUnlocked = session.role === "admin";
        applySession();
        return;
      } catch (err) {
        await authInstance.signOut().catch(() => {});
        showLoginError(err?.message || "Acceso denegado.");
        return;
      }
    }
    if (redirectRole) localStorage.removeItem(STORAGE_REDIRECT_ROLE);
  } catch (e) {
    if (redirectRole) localStorage.removeItem(STORAGE_REDIRECT_ROLE);
    handleGoogleAuthError(e);
  }

  let handledInitialUser = false;
  authInstance.onAuthStateChanged(async (user) => {
    if (handledInitialUser || _loginInProgress || currentSession || !user) return;
    handledInitialUser = true;

    const savedRole    = localStorage.getItem(STORAGE_ACTIVE_ROLE) || "vendedor";
    const lastActivity = Number(localStorage.getItem(STORAGE_LAST_ACTIVITY) || "0");
    const limitMs      = getInactivityLimitMs(savedRole);

    if (lastActivity > 0 && (Date.now() - lastActivity) > limitMs) {
      await authInstance.signOut().catch(() => {});
      localStorage.removeItem(STORAGE_LAST_ACTIVITY);
      localStorage.removeItem(STORAGE_ACTIVE_ROLE);
      setLoginRole(savedRole);
      showLoginError("Tu sesión anterior expiró por inactividad. Vuelve a iniciar sesión.");
      return;
    }

    try {
      setLoginRole(savedRole);
      const session = await resolveAuthorizedUser(user, savedRole);
      currentSession = session;
      adminUnlocked = session.role === "admin";
      applySession();
    } catch (err) {
      await authInstance.signOut().catch(() => {});
      localStorage.removeItem(STORAGE_LAST_ACTIVITY);
      localStorage.removeItem(STORAGE_ACTIVE_ROLE);
    }
  });
}

document.addEventListener("firebase-ready", initAuthSession);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthSession);
} else {
  initAuthSession();
}
