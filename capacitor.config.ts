import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cinemax.app",
  appName: "CinéMax",
  webDir: "public",

  // ─── Mode « live server » ───────────────────────────────────────────
  // L'app mobile charge le site directement depuis le serveur Render.
  // Avantages : Server Components, API routes, auth, tout fonctionne
  // comme sur le web — zéro duplication.
  //
  // ⚠️  Remplacez l'URL ci-dessous par votre URL Render de production.
  server: {
    url: "https://web-stream-mncx.onrender.com",
    cleartext: false, // HTTPS uniquement
  },

  // ─── Plugins natifs ─────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#09090b",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },

  // ─── Configuration Android ──────────────────────────────────────────
  android: {
    allowMixedContent: false,
    backgroundColor: "#09090b",
  },

  // ─── Configuration iOS ─────────────────────────────────────────────
  ios: {
    contentInset: "always",
    backgroundColor: "#09090b",
    preferredContentMode: "mobile",
  },
};

export default config;
