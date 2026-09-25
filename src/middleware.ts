import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SECRET = process.env.NEXTAUTH_SECRET || "asadas-erp-secret-key-2026-change-in-production";

function base64UrlToBytes(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const normalized = padding ? base64 + '='.repeat(4 - padding) : base64;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const chars = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < chars.length; i++) {
    binary += String.fromCharCode(chars[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verifyToken(token: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const encoder = new TextEncoder();

  let payload: any;
  try {
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (header.alg !== 'HS256') return null;
    payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
  if (!payload.tenantId || !payload.sub || !payload.role) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const expectedBytes = new Uint8Array(sigBytes);
  let providedBytes: Uint8Array;
  try {
    providedBytes = base64UrlToBytes(signatureB64);
  } catch {
    return null;
  }

  if (providedBytes.length !== expectedBytes.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedBytes.length; i++) {
    diff |= providedBytes[i] ^ expectedBytes[i];
  }
  if (diff !== 0) return null;

  return payload;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  // Rate-limit simple en memoria (Edge)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // @ts-ignore global
  const g: any = globalThis as any;
  g._rl = g._rl ?? new Map<string, { n: number; t: number }>();
  const now = Date.now();
  const cur = g._rl.get(ip) ?? { n: 0, t: now };
  if (now - cur.t > 60_000) { cur.n = 0; cur.t = now; }
  cur.n++; g._rl.set(ip, cur);
  if (cur.n > 120) return new NextResponse("Too Many Requests", { status: 429 });

  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/api/portal') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const decoded = await verifyToken(token);

  if (!decoded) {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decoded.role as string;
  const isMutating = request.method !== "GET" && request.method !== "HEAD";
  const fieldBlocked = ["/billing", "/bulk", "/api/billing", "/api/payments", "/api/tenant/config", "/api/banks", "/api/notifications/send", "/api/saas", "/suscripcion", "/configuracion", "/admin", "/caja", "/conciliacion"];
  if (role === "FIELD_STAFF" && isMutating && fieldBlocked.some(p => pathname.startsWith(p))) {
    return NextResponse.json({ error: "FIELD_STAFF solo lectura y captura de lecturas" }, { status: 403 });
  }
  if (role === "FIELD_STAFF" && pathname.startsWith("/api/readings") && request.method === "POST") {
    // Permitido: lecturas
  } else if (role === "FIELD_STAFF" && ["/configuracion", "/admin", "/suscripcion", "/caja"].some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/lecturas", request.url));
  }
  // Bloqueo si tenant suspendido
  if (decoded.tenantStatus === "SUSPENDED" && !pathname.startsWith("/suscripcion") && !pathname.startsWith("/api/saas")) {
    return NextResponse.redirect(new URL("/suscripcion", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', decoded.tenantId);
  requestHeaders.set('x-user-id', decoded.sub);
  requestHeaders.set('x-user-role', decoded.role);
  requestHeaders.set('x-user-email', decoded.email);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};