import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This project lives inside a larger repo; pin the tracing root to itself so
  // Next.js doesn't infer the parent workspace from sibling lockfiles.
  outputFileTracingRoot: projectRoot,
  // Fully static export — deployable to any static host (Vercel/Netlify/S3/etc.)
  output: 'export',
  // Static export cannot use the Next.js image optimization server.
  images: { unoptimized: true },
  // Emit /route/index.html so static hosts resolve clean URLs without config.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
