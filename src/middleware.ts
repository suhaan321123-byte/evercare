import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl;
  const userAgent = req.headers.get('user-agent') || '';

  // 1. Block aggressive bots that consume quota
  const blockedBots = /bot|spider|crawl|Bytespider|GPTBot|Amazonbot/i;
  if (blockedBots.test(userAgent) && !userAgent.includes('Googlebot') && !userAgent.includes('bingbot')) {
    return new NextResponse(null, { status: 403 });
  }

  // 2. Efficiently handle Next.js prefetches
  const isPrefetch = req.headers.get('x-middleware-prefetch') === '1';
  const country = req.geo?.country || "UNKNOWN";
  
  // if (url.pathname === '/robots.txt') {
  //   return NextResponse.next();
  // }

  // The following block is commented out to remove country restrictions.
  // if (country !== "IN" && country !== "AU") {
  //   // If it's just a background prefetch, return a tiny empty response to save bandwidth
  //   if (isPrefetch) {
  //     return new NextResponse(null, { status: 403 });
  //   }
  //   // Otherwise return the styled block message
  //   return new NextResponse(
  //     `<html><body style="font-family:sans-serif;padding:50px;text-align:center;">
  //       <h1>Access Restricted</h1>
  //       <p>EvercareMed services are currently limited to Australia and India.</p>
  //       <p>Your detected location: ${country}</p>
  //     </body></html>`,
  //     { status: 403, headers: { 'content-type': 'text/html' } }
  //   );
  // }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
