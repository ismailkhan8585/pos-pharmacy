import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_ROUTES = [
  "/pos",
  "/inventory",
  "/suppliers",
  "/purchases",
  "/reports",
  "/shifts",
  "/settings",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authCookie = request.cookies.get("anmedcare_pos_auth")
  const isAuthenticated = Boolean(authCookie?.value)

  // If user is accessing login page while authenticated, redirect to /pos
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/pos", request.url))
  }

  // Check if current route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtected && !isAuthenticated) {
    // In hybrid offline mode, client layouts will also enforce localStorage check.
    // However, if cookie is missing on direct browser hit, route to /login
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/pos/:path*",
    "/inventory/:path*",
    "/suppliers/:path*",
    "/purchases/:path*",
    "/reports/:path*",
    "/shifts/:path*",
    "/settings/:path*",
    "/login",
  ],
}
