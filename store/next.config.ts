import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // The PDF invoice (spec 004 US4) reads local TTF font files at runtime via
  // a dynamic path.join() call, which Next.js's serverless file tracing
  // can't always statically discover — force-include them for the two
  // routes that trigger sendCustomerPaymentConfirmed's PDF attachment.
  outputFileTracingIncludes: {
    '/api/payments/verify': ['src/lib/fonts/**/*'],
    '/api/webhooks/safepay': ['src/lib/fonts/**/*'],
  },
};

export default nextConfig;
