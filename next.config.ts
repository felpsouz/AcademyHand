import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não usar 'standalone' - deixa Vercel gerenciar
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Força renderização no cliente para Firebase
  reactStrictMode: true,
};

export default nextConfig;