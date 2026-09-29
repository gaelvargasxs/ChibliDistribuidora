
(function() {
  // ──────────────────────────────────────────────────────────────
  // CONFIGURACIÓN DE FIREBASE — TUS CREDENCIALES
  // ──────────────────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey:            "AIzaSyD9HY8H-yMTlqQ_Sg6J4JqSbXmEANb2E_E",
    authDomain:        "distribuidora-chibli.firebaseapp.com",
    projectId:         "distribuidora-chibli",
    storageBucket:     "distribuidora-chibli.firebasestorage.app",
    messagingSenderId: "393439847543",
    appId:             "1:393439847543:web:16257db92ddff4e6ef5272"
  };
  // ──────────────────────────────────────────────────────────────

  try {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    window._auth = firebase.auth();
    window._auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    // Adaptar la API compat a la misma interfaz que usaba el código
    window._db = db;
    window._firebaseReady = true;

    // Puente de funciones: el resto del código sigue igual sin cambios
    window._fsLib = {
      collection:      (db, path)           => db.collection(path),
      doc:             (db, path, id)        => db.collection(path).doc(id),
      addDoc:          (ref, data)           => ref.add(data),
      updateDoc:       (ref, data)           => ref.update(data),
      setDoc:          (ref, data, opts)     => ref.set(data, opts || {}),
      deleteDoc:       (ref)                 => ref.delete(),
      serverTimestamp: ()                    => firebase.firestore.FieldValue.serverTimestamp(),
      onSnapshot:      (ref, onNext, onErr)  => ref.onSnapshot(onNext, onErr || (()=>{})),
      // query y orderBy ya no se usan — el ordenamiento se hace en JS
      query:           (ref)                 => ref,
      orderBy:         ()                    => null,
      getDocs:         (ref)                 => ref.get(),
    };

    // Esperar a que el DOM esté listo antes de disparar el evento
    // para que los listeners de firebase-ready ya estén registrados
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.dispatchEvent(new Event("firebase-ready"));
      });
    } else {
      // DOM ya listo (script ejecutado tarde)
      document.dispatchEvent(new Event("firebase-ready"));
    }
    console.log("Firebase inicializado, esperando DOM...");
  } catch(e) {
    console.warn("Firebase init error, activando modo demo:", e);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.dispatchEvent(new Event("firebase-demo"));
      });
    } else {
      document.dispatchEvent(new Event("firebase-demo"));
    }
  }
})();
