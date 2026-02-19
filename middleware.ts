import { AuthMiddleware } from "@/lib/middlewares/auth.middleware";

export const middleware = AuthMiddleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
