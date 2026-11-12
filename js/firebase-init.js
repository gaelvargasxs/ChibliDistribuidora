
(function() {
  // ──────────────────────────────────────────────────────────────
  // CONFIGURACIÓN DE FIREBASE — PROYECTO DISTRIBUIDORA CHIBLI
  // En Vercel (*.vercel.app, junto con vercel.json) o Firebase Hosting
  // usa el mismo dominio como authDomain para evitar bloqueos en Safari.
  // Si conectas un dominio propio en Vercel, agrégalo en CUSTOM_AUTH_DOMAINS.
  // ──────────────────────────────────────────────────────────────
  const CUSTOM_AUTH_DOMAINS = [];
  const host = (window.location && window.location.hostname) || "";
  const isSameOriginAuthHost =
    host.endsWith(".vercel.app") ||
    host.endsWith(".web.app") ||
    host.endsWith(".firebaseapp.com") ||
    CUSTOM_AUTH_DOMAINS.includes(host);
  const dynamicAuthDomain = isSameOriginAuthHost
    ? host
    : "distribuidora-chibli.firebaseapp.com";

  const firebaseConfig = {
    apiKey:            "AIzaSyD9HY8H-yMTlqQ_Sg6J4JqSbXmEANb2E_E",
    authDomain:        dynamicAuthDomain,
    projectId:         "distribuidora-chibli",
    storageBucket:     "distribuidora-chibli.firebasestorage.app",
    messagingSenderId: "393439847543",
    appId:             "1:393439847543:web:16257db92ddff4e6ef5272"
  };
  // ──────────────────────────────────────────────────────────────

  try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Adaptar la API compat a la misma interfaz que usaba el código
    window._db = db;
    window._auth = (firebase.auth ? firebase.auth() : null);
    window._firebaseReady = true;

    // Puente de funciones: el resto del código sigue igual sin cambios
    window._fsLib = {
      collection:      (db, path)           => db.collection(path),
      doc:             (db, path, id)       => db.collection(path).doc(id),
      addDoc:          (ref, data)          => ref.add(data),
      updateDoc:       (ref, data)          => ref.update(data),
      setDoc:          (ref, data, opts)    => opts ? ref.set(data, opts) : ref.set(data),
      deleteDoc:       (ref)                => ref.delete(),
      serverTimestamp: ()                   => firebase.firestore.FieldValue.serverTimestamp(),
      onSnapshot:      (ref, onNext, onErr) => ref.onSnapshot(onNext, onErr || (()=>{})),
      // query y orderBy ya no se usan — el ordenamiento se hace en JS
      query:           (ref)                => ref,
      orderBy:         ()                   => null,
      getDoc:          (ref)                => ref.get(),
      getDocs:         (ref)                => ref.get(),
    };

    // Esperar a que el DOM esté listo antes de disparar el evento
    // para que los listeners de firebase-ready ya estén registrados
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.dispatchEvent(new Event("firebase-ready"));
      });
    } else {
      document.dispatchEvent(new Event("firebase-ready"));
    }
  } catch(e) {
    console.warn("Firebase init error:", e);
    window._firebaseReady = false;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.dispatchEvent(new Event("firebase-demo"));
      });
    } else {
      document.dispatchEvent(new Event("firebase-demo"));
    }
  }
})();
