"use client";
import React, { useState } from 'react';
import { UserPlus, Clock, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    invitationCode: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg(""); 
  };

  // ========================================================
  // INTEGRASI BARU: Terhubung ke FastAPI Multi-Tenant
  // ========================================================
  // ========================================================
  // INTEGRASI BARU: Terhubung ke FastAPI Multi-Tenant (Fixed)
  // ========================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok!");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    // Ambil kode, bersihkan spasi, dan paksa menjadi Huruf Kapital Semua
    const cleanInvitationCode = formData.invitationCode.trim().toUpperCase();

    // Lacak isi paket data di Console Browser (F12) sebelum dikirim
    console.log("=== INSPEKSI PAYLOAD NEXT.JS ===");
    console.log("Nama:", formData.name);
    console.log("Email:", formData.email);
    console.log("Kode dikirim:", cleanInvitationCode);
    console.log("================================");

    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          invitation_code: cleanInvitationCode // Menggunakan variabel yang sudah dikunci kapital
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        // Menangkap error detail dari HTTPException milik FastAPI
        setErrorMsg(result.detail || "Gagal mendaftarkan akun.");
      }
    } catch (error) {
      setErrorMsg("Gagal menghubungi server. Pastikan kontainer backend Docker Anda aktif.");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================
  // UI SISI FRONTEND (Tetap Utuh 100% Menggunakan Desain Lu)
  // ========================================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-200">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Clock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Pendaftaran Terkirim!</h2>
          <p className="text-slate-500 mt-4 leading-relaxed text-sm">
            Akun Anda berhasil didaftarkan dengan status <b className="text-amber-600 uppercase tracking-widest text-[10px]">Pending</b>. 
            Silakan hubungi Admin PT RASINDO untuk aktivasi akses Anda.
          </p>
          <Link 
            href="/login"
            className="mt-8 block w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-200 relative">
        
        <Link 
          href="/login" 
          className="absolute top-8 left-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="mb-8 mt-10 text-center md:text-left">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Daftar Akses Node</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sistem Monitoring Industrial Dashboard</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
            <input 
              required 
              name="name" 
              value={formData.name}
              placeholder="Full name..." 
              onChange={handleChange} 
              className="w-full mt-1 p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-100 text-sm text-slate-800 font-bold border-none" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Perusahaan</label>
            <input 
              required 
              name="email" 
              type="email" 
              value={formData.email}
              placeholder="corporate@email.com" 
              onChange={handleChange} 
              className="w-full mt-1 p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-100 text-sm text-slate-800 font-bold border-none" 
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-500" /> Invitation Code
            </label>
            <input 
              required 
              name="invitationCode" 
              type="text"
              value={formData.invitationCode}
              placeholder="Masukkan kode rahasia..." 
              onChange={handleChange} 
              className="w-full mt-1 p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-100 text-sm text-slate-800 font-mono font-black uppercase tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:font-normal border-none" 
            />
            <p className="text-[8px] text-slate-400 mt-2 ml-1 italic leading-tight">
              *Hanya untuk personil resmi yang memiliki kode undangan perusahaan.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                required 
                name="password" 
                type="password" 
                value={formData.password}
                placeholder="••••••••" 
                onChange={handleChange} 
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100 text-slate-800 border-none" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
              <input 
                required 
                name="confirmPassword" 
                type="password" 
                value={formData.confirmPassword}
                placeholder="••••••••" 
                onChange={handleChange} 
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl text-sm outline-none focus:ring-2 ring-blue-100 text-slate-800 border-none" 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading} 
            className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black active:scale-95 transition-all flex justify-center items-center gap-2 disabled:bg-slate-400 shadow-none border-none"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <><UserPlus className="w-4 h-4" /> Ajukan Akses</>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          Sudah punya akun? <Link href="/login" className="text-blue-600 hover:underline ml-1">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}