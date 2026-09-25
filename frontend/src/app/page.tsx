'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useDebounce } from '../hooks/use-debounce';
import { apiClient } from '../lib/api-client';
import { ApiResponse } from '../types/api';

export default function Home() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // 1. Debounce Demonstration
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  // 2. TanStack Query Demonstration (Pings Backend Health)
  const {
    data: healthData,
    isLoading: isHealthLoading,
    isError: isHealthError,
    refetch: refetchHealth,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse>('/health');
      return res.data;
    },
    retry: 1,
    refetchInterval: 30000,
  });

  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto space-y-10">
      {/* Header Banner */}
      <header className="space-y-4 border-b border-neutral-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Frontend Stack Foundation Ready
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              SIMANTAP Frontend Base
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu • Pemkab Konawe Selatan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Siap Menerima Template UI</span>
          </div>
        </div>
      </header>

      {/* Stack Badges Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Framework</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white">Next.js 15+</div>
          <p className="text-xs text-neutral-400">App Router & TypeScript Strict Mode</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">State & Caching</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">TanStack Query v5</div>
          <p className="text-xs text-neutral-400">QueryProvider & Devtools aktif</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Security Client</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">Refresh Token Wrapper</div>
          <p className="text-xs text-neutral-400">Axios 401 Interceptor & Request Queue</p>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">Styling & Input</span>
            <Search className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">Tailwind CSS + Debounced</div>
          <p className="text-xs text-neutral-400">useDebounce Hook untuk responsif filter</p>
        </div>
      </section>

      {/* Live Demonstrations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Backend Connection & TanStack Query Test */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Server className="w-5 h-5 text-emerald-400" />
              <span>Koneksi Backend (TanStack Query)</span>
            </div>
            <button
              onClick={() => refetchHealth()}
              disabled={isHealthLoading}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Refresh Health Status"
            >
              <RefreshCw className={`w-4 h-4 ${isHealthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-neutral-400">
            Menguji koneksi otomatis antara frontend dengan backend NestJS di <code className="text-emerald-400">http://localhost:4000/api/v1/health</code>.
          </p>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Status Server:</span>
              {isHealthLoading ? (
                <span className="text-amber-400">Memeriksa...</span>
              ) : isHealthError ? (
                <span className="text-red-400">Offline / Belum Dijalankan</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Online (200 OK)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Database PostgreSQL:</span>
              <span className="text-neutral-300">
                {healthData?.data?.details?.database?.status === 'up' ? (
                  <span className="text-emerald-400 font-bold">Terhubung (UP)</span>
                ) : isHealthError ? (
                  <span className="text-neutral-500">-</span>
                ) : (
                  <span className="text-amber-400">Checking</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Terakhir Diperbarui:</span>
              <span className="text-neutral-400">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Debounced Search Test */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Terminal className="w-5 h-5 text-purple-400" />
            <span>Pengujian Debounced Input</span>
          </div>

          <p className="text-xs text-neutral-400">
            Ketik teks di bawah untuk melihat eksekusi tunda (delay 500ms) guna efisiensi panggilan API pencarian paket / NIP.
          </p>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik pencarian di sini (contoh: NIP atau Nama Paket)..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-xs space-y-1 font-mono">
              <div className="text-neutral-500">Nilai Input Langsung: <span className="text-neutral-200">{searchTerm || '""'}</span></div>
              <div className="text-purple-400">Nilai Debounced (500ms): <span className="text-white font-bold">{debouncedSearch || '""'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Refresh Wrapper Architecture Info */}
      <section className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Lock className="w-5 h-5 text-amber-400" />
          <span>Arsitektur Wrapper Refresh Token</span>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed">
          Klien API (<code className="text-emerald-400">src/lib/api-client.ts</code>) telah dilengkapi dengan interceptor Axios otomatis:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400">
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <div className="font-semibold text-white">1. Injeksi Token Otomatis</div>
            <div>Menyisipkan header <code className="text-neutral-300">Authorization: Bearer</code> pada setiap request keluar.</div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <div className="font-semibold text-white">2. Pencegat Error 401</div>
            <div>Menahan request bersamaan dalam antrian dan hanya mengirimkan satu pemanggilan refresh ke backend.</div>
          </div>
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1">
            <div className="font-semibold text-white">3. Retry Otomatis</div>
            <div>Setelah token baru diperoleh, semua antrian request diulang kembali secara transparan tanpa logout mendadak.</div>
          </div>
        </div>
      </section>

      {/* Ready for Template Note */}
      <footer className="text-center py-6 border-t border-neutral-850 text-neutral-400 text-xs space-y-2">
        <p>
          Fondasi stack frontend telah lengkap dan bersih. Direktori siap diterapkan template pilihan Anda.
        </p>
        <p className="text-neutral-400">
          Pemerintah Kabupaten Konawe Selatan • Bagian Administrasi Pembangunan Setda
        </p>
      </footer>
    </main>
  );
}
