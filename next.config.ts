import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The React Compiler instruments hook dependency arrays. Under HMR the
  // injected cache slots change count between renders, which trips React's
  // "deps array changed size" invariant inside the r3f Canvas tree. Keep
  // the optimisation for production builds, skip it in development.
  reactCompiler: process.env.NODE_ENV === "production",
};

export default nextConfig;
