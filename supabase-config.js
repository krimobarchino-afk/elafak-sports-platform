/* Public Supabase project routing.
 * Production is selected only for the exact canonical public hostname.
 * Vercel preview deployments and local development use the isolated free dev project.
 * These are publishable client keys only; never place a service-role/secret key here.
 */
(() => {
  "use strict";
  const productionHosts = new Set(["horizon-barchino.vercel.app"]);
  const isProduction = productionHosts.has(String(window.location.hostname || "").toLowerCase());
  const config = isProduction
    ? {
        environment: "production",
        url: "https://lfubzohsbwdoiagfkpkt.supabase.co",
        key: "sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ",
        storageKey: "sb-lfubzohsbwdoiagfkpkt-auth-token"
      }
    : {
        environment: "development",
        url: "https://yflokiwvbbxtjjpdhned.supabase.co",
        key: "sb_publishable_Sw4NQdo3Z09DpKMIAQIdmA_5M0onKQr",
        storageKey: "sb-yflokiwvbbxtjjpdhned-auth-token"
      };
  Object.defineProperty(window, "ElAfakSupabaseConfig", {
    value: Object.freeze(config),
    writable: false,
    configurable: false,
    enumerable: false
  });
})();
