import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/products/balance") {
    return new NextResponse(null, {
      status: 401,
      statusText: "Unauthorized",
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products/balance"],
};
