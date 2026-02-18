import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent DNS prefetch leaking visited URLs
  { key: "X-DNS-Prefetch-Control", value: "on" },

  // Force HTTPS for 2 years; include subdomains + preload list
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Block this site from being embedded in frames (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },

  // Limit referrer info sent to other origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Restrict browser feature access
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },

  // Prevent cross-origin resource embedding attacks
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },

  /**
   * Content Security Policy
   *
   * unsafe-eval is required by Next.js dev mode but must NOT be in production.
   * unsafe-inline for styles is required by Tailwind CSS (inline styles).
   *
   * Note: `script-src` uses `strict-dynamic` + nonce in a real hardened setup.
   * For this template we keep it compatible with Next.js App Router.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router requires 'unsafe-inline' for hydration; nonces would replace this
      "script-src 'self' 'unsafe-inline'" +
        (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      // Tailwind inline styles
      "style-src 'self' 'unsafe-inline'",
      // Allow data: URIs (Supabase TOTP QR SVG) + https: for OAuth avatars
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      // Supabase API + Google accounts for OAuth
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
      // Block framing
      "frame-ancestors 'none'",
      // Restrict base tag hijacking
      "base-uri 'self'",
      // Only allow form submissions to self
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      headers: securityHeaders,
    },
  ],

  // Remove the X-Powered-By header (hides Next.js fingerprint)
  poweredByHeader: false,

  // Allow Next.js <Image> to load user avatars from Supabase storage + Google
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
