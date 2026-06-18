"use client";

import React, { useState } from 'react';
import { LogIn, ShieldCheck, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // 1. Import useRouter dari next/navigation

export default function LoginPage() {
  const router = useRouter(); // 2. Inisialisasi router
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Tembak langsung endpoint login FastAPI di port 8000
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const result = await response.json();

      // 2. Jika FastAPI mengembalikan status gagal/eror (HTTP Status 4xx / 5xx)
      if (!response.ok) {
        if (response.status === 403) {
          setError("Akun Anda belum disetujui Admin.");
        } else if (response.status === 401) {
          setError("Email atau Password salah.");
        } else {
          setError(result.detail || "Gagal masuk ke sistem.");
        }
        setIsLoading(false);
        return; // STOP DI SINI. Jangan izinkan masuk ke dashboard jika gagal
      }

      // 3. Jika login sukses (HTTP status 200 OK)
      // Menyimpan data user/token yang dikirim dari backend
      const userData = result.user ? result.user : result;
      localStorage.setItem("iiot_user", JSON.stringify(userData));
      
      // Jika backend mengirimkan token terpisah, simpan juga di sini (opsional)
      if (result.access_token) {
        localStorage.setItem("iiot_token", result.access_token);
      }
      
      // Alihkan halaman ke dashboard secara bersih dan refresh state router
      router.push("/dashboard");
      router.refresh();

    } catch (err) {
      setError("Koneksi ke backend FastAPI gagal.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">IIoT Login</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sistem Monitoring PKL</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                required
                type="email" 
                className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100 text-slate-800 font-sans"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                required
                type="password" 
                className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100 text-slate-800 font-sans"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link href="/register" className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    </div>
  );
}