"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

export default function UserResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token'); // Mengambil kode token dari ?token=...

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert("Token keamanan tidak ditemukan!");
    if (newPassword !== confirmPassword) return alert("Konfirmasi password baru tidak cocok!");

    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:8000/api/users/execute-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
      } else {
        alert(data.detail || "Gagal memperbarui password.");
      }
    } catch (err) {
      alert("Gagal terhubung ke server backend.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-sm w-full text-center space-y-4 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sukses Diperbarui</h2>
          <p className="text-xs text-slate-400 leading-relaxed">Password baru Anda berhasil didaftarkan ke sistem telemetri. Silakan kembali ke halaman utama untuk login.</p>
          <button onClick={() => router.push('/login')} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-none cursor-pointer">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans text-slate-900">
      <form onSubmit={handleFormSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 max-w-sm w-full space-y-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <KeyRound className="w-5 h-5 text-blue-600" /> New Credentials
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Konfigurasikan password baru akun Anda secara mandiri</p>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password Baru</label>
          <input 
            type="password" 
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border-none ring-1 ring-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
            required 
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ulangi Password Baru</label>
          <input 
            type="password" 
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border-none ring-1 ring-slate-100 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !token}
          className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl text-[10px] uppercase shadow-lg shadow-slate-200 border-none tracking-[0.2em] cursor-pointer transition-all flex justify-center items-center"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : "Save New Password"}
        </button>
      </form>
    </div>
  );
}