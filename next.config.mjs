import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Root file tracing at this project so Next doesn't pick up parent-folder
  // lockfiles (silences the "inferred workspace root" warning).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
