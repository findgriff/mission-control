import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // Strip basePath so shell.tsx gets e.g. "/tasks" not "/mission-control/tasks"
  const basePath = process.env.__NEXT_ROUTER_BASEPATH ?? "/mission-control";
  const pathname = request.nextUrl.pathname.replace(basePath, "") || "/";
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
