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
        ],
      },
    ];
  },
};

export default nextConfig;
