import type { NextConfig } from "next";

// For GitHub Pages the deploy script sets NEXT_PUBLIC_BASE_PATH=/lean-and-mean
// and the app is exported statically. Local dev runs at / with a normal server.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
