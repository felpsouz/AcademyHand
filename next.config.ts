import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' gera um servidor Node self-contained em .next/standalone —
  // é o formato recomendado pra rodar em Docker/containers. No Vercel isso
  // não era necessário (a Vercel gerencia isso por trás dos panos), mas pro
  // Cloudflare Containers precisamos gerar esse pacote nós mesmos.
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  reactStrictMode: true,
};

export default nextConfig;