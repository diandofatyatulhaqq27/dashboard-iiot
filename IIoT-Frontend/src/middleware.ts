import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Matcher ini menentukan folder mana yang diproteksi
export const config = { 
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|register).*)",
  ] 
};