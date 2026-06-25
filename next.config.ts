import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "pdfjs-dist"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
