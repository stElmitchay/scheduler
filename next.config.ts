import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The board was called the Job Board until it started carrying scholarships
  // too. Postings already shared as /jobs/<slug> must keep resolving.
  async redirects() {
    return [
      { source: "/jobs", destination: "/opportunities", permanent: true },
      {
        source: "/jobs/dashboard",
        destination: "/opportunities/dashboard",
        permanent: true,
      },
      {
        source: "/jobs/:slug",
        destination: "/opportunities/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
