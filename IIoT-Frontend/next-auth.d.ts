import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Memperluas objek 'User' yang dikembalikan oleh fungsi authorize() di NextAuth
   */
  interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "client" | "user"; // Mengunci string tipe ENUM baru lu blay
    is_approved: boolean;
    company_id: number | null; // ID Perusahaan baru hasil migrasi perusahaan terpusat
  }

  /**
   * Memperluas objek 'session.user' yang dibaca oleh komponen/halaman frontend React
   */
  interface Session {
    user: {
      id: string;
      role: "admin" | "client" | "user";
      company_id: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Memperluas objek token JWT internal NextAuth
   */
  interface JWT {
    id: string;
    role: "admin" | "client" | "user";
    is_approved: boolean;
    company_id: number | null;
  }
}