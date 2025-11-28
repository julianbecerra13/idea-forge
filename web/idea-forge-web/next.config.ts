import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Solo en producción, ignorar errores de ESLint durante el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Solo en producción, ignorar errores de TypeScript durante el build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
