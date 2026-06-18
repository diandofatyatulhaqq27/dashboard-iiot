# Industrial IoT (IIoT) Web Dashboard

[![Framework](https://img.shields.io/badge/Framework-Next.js%2014-blue?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Library](https://img.shields.io/badge/Library-React-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/Project-PKL%20%2F%20Internship-orange?style=flat-square)]()

Aplikasi *Web Dashboard* berbasis web untuk memonitoring sistem otomasi industri dan perangkat *Industrial Internet of Things* (IIoT) secara *real-time*. Projek ini dikembangkan sebagai bagian dari tugas akhir proyek Praktik Kerja Lapangan (PKL) / Magang mahasiswa Universitas.

## 🚀 Fitur Utama

*   **Real-time Sensor Monitoring:** Visualisasi data sensor industri (seperti *Gas Sensor Analog Input* dari Cosmos KD-12B, status sistem tata udara AHU, dan *ducting*).
*   **Interactive SVG Widgets:** Dashboard menggunakan widget berbasis *Scalable Vector Graphics* (SVG) untuk indikator status visual yang dinamis, ringan, dan tajam di berbagai resolusi layar.
*   **Smart Alarm System:** Sistem peringatan otomatis (*Alarm Status*) yang responsif. Menggunakan logika *safety-first* di mana jika belum ada data masuk (data kosong), nilai default akan diset ke `0` untuk mencegah alarm aktif secara tidak sengaja (*false alarm*).
*   **Localizing Interface:** Antarmuka web telah dilokalisasi penuh ke dalam Bahasa Indonesia untuk istilah teknis industri (contoh: *Sistem Pemadam Kebakaran / Fire Suppression System*).

## 🛠️ Tech Stack (Teknologi yang Digunakan)

*   **Frontend Framework:** Next.js (React)
*   **Routing & State Management:** Next.js App Router & React Hooks (`useState`, `useEffect`)
*   **Styling:** Tailwind CSS / CSS Modules
*   **Database / Backend Integration:** PostgreSQL (Supabase/Render) / Node.js API
*   **Deployment Target:** GitHub Private & Cloud Hosting (Vercel / AWS EC2 via Git integration)

---

## 💻 Cara Menjalankan Projek di Lokal (Development)

Prasyarat: Pastikan laptop Anda sudah terinstal **Node.js** (versi 18 ke atas) dan **Git**.

1.  **Clone Repositori (Private):**
```bash
    git clone [https://github.com/username-anda/nama-repo-dashboard.git](https://github.com/username-anda/nama-repo-dashboard.git)
    cd nama-repo-dashboard
    ```

2.  **Instal Dependensi:**
```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables:**
    Buat file `.env.local` di root direktori dan masukkan kredensial yang dibutuhkan (jika ada):
```env
    NEXT_PUBLIC_API_URL=http://localhost:3000/api
    # Masukkan config database/sensor stream lainnya di sini
    ```

4.  **Jalankan Server Lokal:**
```bash
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat aplikasi.

---

## 🗂️ Struktur Direktori Projek (Penting)

```text
├── .next/                  # Hasil build otomatis Next.js
├── node_modules/           # Dependensi pihak ketiga
├── src/
│   ├── app/                # Next.js App Router (Halaman Utama)
│   │   ├── page.js         # Beranda Dashboard
│   │   └── sensor/         # Fitur SensorDetailPage
│   ├── components/         # Komponen Widget SVG & Alarm
│   └── utils/              # Fungsi pembantu / konfigurasi API
├── .gitignore              # Daftar file yang diabaikan oleh Git
├── package.json            # Konfigurasi dependensi npm
└── README.md               # Dokumentasi projek
