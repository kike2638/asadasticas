import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET = process.env.NEXTAUTH_SECRET || "asadas-erp-secret-key-2026-change-in-production";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
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

  try {
    const decoded = jwt.verify(token, SECRET) as any;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', decoded.tenantId);
    requestHeaders.set('x-user-id', decoded.sub);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-user-email', decoded.email);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};
