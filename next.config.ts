import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // `ws` (WebSocket a A3 para la marketdata en vivo) es un módulo Node: no lo
  // bundleamos, se resuelve en runtime del server.
  serverExternalPackages: ["ws"],
  experimental: {
    serverActions: {
      // El uploader de /admin/datos manda el export de Agrochat (CSV ~720 KB /
      // xlsx varios MB) como multipart en la server action; el default es 1 MB.
      bodySizeLimit: "16mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // E5 #12b: HSTS explícito (Vercel lo pone en *.vercel.app; con dominio propio hace falta).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // E5 #12b: CSP en modo REPORT-ONLY para arrancar sin romper nada (Next mete scripts y
          // estilos inline). Cuando el login lleve un tiempo prendido, mirar los reports en la
          // consola del navegador y promover a Content-Security-Policy enforcing.
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
              "connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
