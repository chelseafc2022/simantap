"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { ApiResponse } from "@/types/api"
import { LoginResponseData } from "@/types/auth"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      toast.error("NIP / Username dan Password wajib diisi")
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>("/auth/login", {
        identifier: identifier.trim(),
        password,
      })

      if (response.data?.data) {
        login(response.data.data)
        toast.success(`Selamat datang, ${response.data.data.user.namaLengkap}!`)
        router.push("/dashboard")
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Gagal melakukan login. Periksa NIP/password Anda."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* ========== LEFT PANEL ========== */}
      <div className="login-left">
        {/* Background Image */}
        <div className="login-bg">
          <Image
            src="/kantor.jpg"
            alt="Kantor Bupati Konawe Selatan"
            fill
            priority
            style={{ objectFit: "cover", objectPosition: "center 70%", transform: "translateY(-8%) scale(1.18)", transformOrigin: "center center" }}
            quality={90}
          />
          <div className="login-bg-overlay" />
        </div>

        {/* Top Header */}
        <div className="login-left-header">
          <div className="login-left-header-logo">
            <Image
              src="/logo_konsel.png"
              alt="Logo Konawe Selatan"
              width={52}
              height={60}
              style={{ objectFit: "contain" }}
            />
            <div className="login-left-header-divider" />
            <div className="login-left-header-text">
              <span className="login-left-header-title">PEMERINTAH KABUPATEN</span>
              <span className="login-left-header-title">KONAWE SELATAN</span>
              <span className="login-left-header-subtitle">SEKRETARIAT DAERAH</span>
              <span className="login-left-header-subtitle">BAGIAN ADMINISTRASI PEMBANGUNAN</span>
            </div>
          </div>
          {/* Bupati & Wakil Bupati in Top Header */}
          <div className="login-left-officials-header">
            <div className="official-card">
              <div className="official-photo">
                <Image
                  src="/bupati.png"
                  alt="Irham Kalenggo, S.Sos., M.Si"
                  width={90}
                  height={110}
                  style={{ objectFit: "cover", objectPosition: "top" }}
                />
              </div>
              <div className="official-info">
                <span className="official-name">Irham Kalenggo, S.Sos., M.Si</span>
                <span className="official-title">Bupati Konawe Selatan</span>
              </div>
            </div>
            <div className="official-card">
              <div className="official-photo">
                <Image
                  src="/wakil_bupati.png"
                  alt="H. Wahyu Ade Pratama Imran"
                  width={90}
                  height={110}
                  style={{ objectFit: "cover", objectPosition: "top" }}
                />
              </div>
              <div className="official-info">
                <span className="official-name">H. Wahyu Ade Pratama Imran</span>
                <span className="official-title">Wakil Bupati Konawe Selatan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Spacer to maintain full open panoramic view of Kantor Bupati & Gerbang */}
        <div className="login-left-spacer" />

        {/* Motto Bar - Centered above Feature Icons */}
        <div className="login-bottom-motto-wrapper">
          <div className="login-bottom-motto">
            <span>MELAYANI</span>
            <span className="motto-dot">•</span>
            <span>MENGAWAL</span>
            <span className="motto-dot">•</span>
            <span>MEMBANGUN BERSAMA</span>
          </div>
        </div>

        {/* Feature Icons */}
        <div className="login-left-features">
          <div className="feature-item">
            <div className="feature-icon feature-icon-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span className="feature-title">Data Paket<br />& Kontrak</span>
            <span className="feature-desc">Terintegrasi<br />dan Akuntabel</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon feature-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <span className="feature-title">Realisasi Fisik<br />& Keuangan</span>
            <span className="feature-desc">Monitoring<br />Setiap Periode</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon feature-icon-amber">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <span className="feature-title">Laporan &<br />Evaluasi RFK</span>
            <span className="feature-desc">Mendukung<br />Pengambilan Keputusan</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon feature-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="feature-title">Kolaborasi<br />OPD</span>
            <span className="feature-desc">Pembangunan<br />Terpadu</span>
          </div>
        </div>
      </div>

      {/* ========== RIGHT PANEL ========== */}
      <div className="login-right">
        <div className="login-right-content">
          {/* Welcome Header */}
          {/* Welcome Header replaced with logo_simantap */}
          <div className="login-welcome">
            <Image
              src="/logo_simantap_header.png"
              alt="SI-MANTAP Kabupaten Konawe Selatan"
              width={240}
              height={268}
              quality={100}
              priority
              style={{ objectFit: "contain", height: "auto", maxWidth: "235px" }}
            />
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="login-form" id="login-form">
            <div className="login-input-group">
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Username / NIP"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-input-group">
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember" htmlFor="remember-me">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                />
                <span>Ingat saya</span>
              </label>
              <button type="button" className="login-forgot">
                Lupa password?
              </button>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="login-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">atau</span>
            <div className="login-divider-line" />
          </div>

          <div className="login-notice">
            <svg className="login-notice-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <p className="login-notice-text">
              Akses sistem ini hanya untuk pengguna yang berwenang di lingkungan <strong>Pemerintah Kabupaten Konawe Selatan</strong>.
            </p>
          </div>

          {/* Logo Setara */}
          <div className="login-setara">
            <Image
              src="/logo_setara.png"
              alt="Logo Konsel Setara"
              width={120}
              height={32}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* ========== FOOTER ========== */}
      <div className="login-footer">
        <span className="login-footer-left">© 2026 Pemerintah Kabupaten Konawe Selatan</span>
        <span className="login-footer-right">SI-MANTAP  |  Satu Data untuk Pembangunan Daerah yang Lebih Baik</span>
      </div>

      <style jsx>{`
        /* ============================
           ROOT CONTAINER
        ============================ */
        .login-page {
          display: flex;
          height: 100vh;
          max-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          font-family: var(--font-inter, 'Inter', sans-serif);
        }

        /* ============================
           LEFT PANEL
        ============================ */
        .login-left {
          position: relative;
          flex: 1.15;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px 36px 48px;
          overflow: hidden;
          height: 100vh;
          max-height: 100vh;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .login-bg-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 37, 64, 0.65) 0%,
            rgba(12, 45, 80, 0.55) 35%,
            rgba(8, 28, 52, 0.70) 65%,
            rgba(5, 18, 34, 0.85) 100%
          );
          z-index: 1;
        }

        .login-left > *:not(.login-bg) {
          position: relative;
          z-index: 2;
        }

        /* Top Header */
        .login-left-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .login-left-header-logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .login-left-header-divider {
          width: 2px;
          height: 52px;
          background: rgba(255,255,255,0.4);
          border-radius: 1px;
        }

        .login-left-header-text {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .login-left-header-title {
          color: white;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1.3;
        }

        .login-left-header-subtitle {
          color: rgba(255,255,255,0.7);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          line-height: 1.4;
        }

        .login-left-officials-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Center Spacer to keep layout positioning */
        .login-left-spacer {
          flex: 1;
        }

        /* Motto Centered above features */
        .login-bottom-motto-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }

        .login-bottom-motto {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          border-bottom: 2px solid #FFD54F;
          padding: 0 10px 6px;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }

        .motto-dot {
          color: #FFD54F;
          font-size: 14px;
        }

        .official-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(8, 26, 48, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 10px;
          padding: 5px 12px 5px 5px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          transition: all 0.25s ease;
        }

        .official-card:hover {
          background: rgba(12, 36, 66, 0.92);
          border-color: rgba(255, 213, 79, 0.45);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
        }

        .official-photo {
          width: 50px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.25) 0%, rgba(10, 30, 58, 0.9) 100%);
          border: 1.5px solid rgba(255, 213, 79, 0.5);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .official-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .official-name {
          color: #ffffff;
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1.3;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        .official-title {
          color: #FFD54F;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }

        /* Feature Icons */
        .login-left-features {
          display: flex;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .feature-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .feature-icon:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
        }

        .feature-icon-blue {
          background: linear-gradient(135deg, #1565C0, #42A5F5);
        }
        .feature-icon-green {
          background: linear-gradient(135deg, #2E7D32, #66BB6A);
        }
        .feature-icon-amber {
          background: linear-gradient(135deg, #E65100, #FFA726);
        }
        .feature-icon-purple {
          background: linear-gradient(135deg, #6A1B9A, #AB47BC);
        }

        .feature-title {
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.25;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        .feature-desc {
          color: rgba(255, 255, 255, 0.72);
          font-size: 9.5px;
          font-weight: 400;
          line-height: 1.3;
          margin-top: 1px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* ============================
           RIGHT PANEL
        ============================ */
        .login-right {
          flex: 0 0 390px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 24px 44px;
          background: white;
          position: relative;
          z-index: 3;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          box-shadow: -8px 0 30px rgba(0,0,0,0.08);
        }

        .login-right-content {
          width: 100%;
          max-width: 325px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: -24px;
        }

        /* Welcome */
        .login-welcome {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2px;
          margin-top: -10px;
        }

        /* Form */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 11px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }

        .login-input {
          width: 100%;
          height: 36px;
          padding: 0 34px 0 34px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12.5px;
          color: #1e293b;
          background: #f8fafc;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
        }

        .login-input::placeholder {
          color: #b0bec5;
          font-size: 12px;
        }

        .login-input:focus {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .login-toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }

        .login-toggle-password:hover {
          color: #64748b;
        }

        /* Options */
        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #475569;
          cursor: pointer;
        }

        .login-checkbox {
          width: 14px;
          height: 14px;
          accent-color: #2563eb;
          cursor: pointer;
          border-radius: 3px;
        }

        .login-forgot {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .login-forgot:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        /* Submit */
        .login-submit-btn {
          width: 100%;
          height: 36px;
          background: linear-gradient(135deg, #1565C0, #1e88e5);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          font-family: inherit;
          box-shadow: 0 3px 10px rgba(21, 101, 192, 0.3);
        }

        .login-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0D47A1, #1565C0);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(21, 101, 192, 0.4);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-spinner {
          animation: spin 1s linear infinite;
        }

        /* Divider */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1px 0;
        }

        .login-divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .login-divider-text {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 400;
        }

        /* Notice */
        .login-notice {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 7px 10px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
        }

        .login-notice-icon {
          color: #2563eb;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .login-notice-text {
          font-size: 10px;
          color: #475569;
          line-height: 1.35;
          margin: 0;
        }

        .login-notice-text strong {
          color: #1e293b;
        }

        /* Setara Logo */
        .login-setara {
          display: flex;
          justify-content: center;
          padding-top: 1px;
        }

        /* ============================
           FOOTER
        ============================ */
        .login-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 38px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 36px;
          background: rgba(5, 18, 34, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 10;
        }

        .login-footer-left,
        .login-footer-right {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.3px;
        }

        /* ============================
           ANIMATIONS
        ============================ */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-left-branding {
          animation: fadeInUp 0.7s ease-out;
        }

        .login-right-content {
          animation: fadeInUp 0.7s ease-out 0.15s both;
        }

        .login-left-features {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }

        .login-left-officials {
          animation: fadeInUp 0.6s ease-out 0.25s both;
        }

        /* ============================
           RESPONSIVE DESIGN (ALL DEVICES)
        ============================ */

        /* 1. Large Screens & Wide Monitors (min-width: 1400px) */
        @media (min-width: 1400px) {
          .login-left {
            padding: 24px 44px 52px;
          }
          .login-right {
            flex: 0 0 430px;
            padding: 12px 28px 48px;
          }
          .login-right-content {
            max-width: 340px;
          }
          .login-welcome :global(img) {
            max-width: 255px !important;
          }
        }

        /* 2. Tablet Landscape & Compact Laptops (901px to 1180px) */
        @media (min-width: 901px) and (max-width: 1180px) {
          .login-left {
            padding: 16px 22px 42px;
          }

          .login-left-header {
            margin-bottom: 12px;
            gap: 12px;
          }

          .login-left-header-logo {
            gap: 10px;
          }

          .login-left-header-divider {
            height: 42px;
          }

          .login-left-header-title {
            font-size: 12px;
          }

          .login-left-header-subtitle {
            font-size: 9.5px;
          }

          .login-left-officials-header {
            gap: 8px;
          }

          .official-card {
            padding: 3px 8px 3px 4px;
            gap: 6px;
            border-radius: 8px;
          }

          .official-photo {
            width: 38px;
            height: 48px;
            border-radius: 6px;
          }

          .official-name {
            font-size: 10px;
          }

          .official-title {
            font-size: 8.5px;
          }

          .login-bottom-motto {
            font-size: 11.5px;
            letter-spacing: 1px;
            gap: 8px;
            padding: 0 8px 4px;
          }

          .login-left-features {
            gap: 8px;
            padding-top: 10px;
          }

          .feature-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
          }

          .feature-title {
            font-size: 9.5px;
          }

          .feature-desc {
            font-size: 8.5px;
          }

          .login-right {
            flex: 0 0 350px;
            padding: 8px 20px 42px;
          }

          .login-right-content {
            max-width: 285px;
            gap: 6px;
          }

          .login-welcome :global(img) {
            max-width: 185px !important;
          }

          .login-input {
            height: 34px;
            font-size: 12px;
          }

          .login-submit-btn {
            height: 34px;
            font-size: 13px;
          }

          .login-notice {
            padding: 5px 8px;
          }

          .login-notice-text {
            font-size: 9.5px;
          }

          .login-footer {
            height: 34px;
            padding: 0 24px;
          }

          .login-footer-left,
          .login-footer-right {
            font-size: 9.5px;
          }
        }

        /* 3. Short Desktop Screens (height < 700px on desktop) */
        @media (min-width: 901px) and (max-height: 720px) {
          .login-left {
            padding: 10px 20px 38px;
          }
          .login-left-header {
            margin-bottom: 8px;
          }
          .login-bottom-motto-wrapper {
            margin-bottom: 8px;
          }
          .login-bottom-motto {
            font-size: 11px;
            padding-bottom: 3px;
          }
          .login-left-features {
            padding-top: 8px;
            gap: 8px;
          }
          .feature-icon {
            width: 34px;
            height: 34px;
          }
          .login-right {
            padding: 6px 18px 38px;
          }
          .login-right-content {
            gap: 5px;
          }
          .login-welcome :global(img) {
            max-width: 165px !important;
          }
          .login-input {
            height: 32px;
            font-size: 11.5px;
          }
          .login-submit-btn {
            height: 32px;
            font-size: 12.5px;
          }
          .login-footer {
            height: 30px;
          }
        }

        /* 4. Tablet Portrait & Mid-size Devices (641px to 900px, e.g. iPad Portrait) */
        @media (max-width: 900px) and (min-width: 641px) {
          .login-page {
            height: auto;
            min-height: 100vh;
            max-height: none;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            flex-direction: column;
          }

          .login-left {
            height: auto;
            min-height: 480px;
            max-height: none;
            overflow: hidden;
            padding: 24px 28px 32px;
            flex: none;
            width: 100%;
          }

          .login-left-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            gap: 16px;
          }

          .login-left-header-logo {
            flex-shrink: 0;
          }

          .login-left-officials-header {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }

          .official-card {
            padding: 4px 10px 4px 4px;
            gap: 8px;
          }

          .official-photo {
            width: 44px;
            height: 54px;
          }

          .official-name {
            font-size: 11px;
            white-space: nowrap;
          }

          .official-title {
            font-size: 9.5px;
          }

          .login-left-spacer {
            min-height: 160px;
          }

          .login-bottom-motto-wrapper {
            margin-bottom: 16px;
          }

          .login-bottom-motto {
            font-size: 13px;
            letter-spacing: 1.2px;
            gap: 10px;
          }

          .login-left-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            width: 100%;
            padding-top: 14px;
          }

          .feature-item {
            width: 100%;
          }

          .feature-icon {
            width: 42px;
            height: 42px;
          }

          .feature-title {
            font-size: 10.5px;
          }

          .feature-desc {
            font-size: 9px;
          }

          .login-right {
            height: auto;
            min-height: auto;
            max-height: none;
            overflow: visible;
            flex: none;
            width: 100%;
            padding: 36px 24px 50px;
            box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.08);
            background: white;
          }

          .login-right-content {
            max-width: 380px;
            margin: 0 auto;
            gap: 12px;
          }

          .login-welcome :global(img) {
            max-width: 230px !important;
          }

          .login-input {
            height: 42px;
            font-size: 14px;
          }

          .login-submit-btn {
            height: 42px;
            font-size: 15px;
          }

          .login-footer {
            position: relative;
            height: auto;
            padding: 16px 24px;
            flex-direction: row;
            justify-content: space-between;
          }
        }

        /* 5. Mobile Phones / Smartphone (<= 640px, e.g. iPhone, Android) */
        @media (max-width: 640px) {
          .login-page {
            height: auto;
            min-height: 100vh;
            max-height: none;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            flex-direction: column;
          }

          .login-left {
            height: auto;
            min-height: auto;
            max-height: none;
            overflow: hidden;
            padding: 14px 12px 14px;
            flex: none;
            width: 100%;
          }

          /* Mobile Header - Stacked neatly */
          .login-left-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 8px;
            margin-bottom: 10px;
          }

          .login-left-header-logo {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .login-left-header-divider {
            height: 32px;
            width: 1.5px;
          }

          .login-left-header-text {
            text-align: left;
          }

          .login-left-header-title {
            font-size: 11px;
            line-height: 1.2;
          }

          .login-left-header-subtitle {
            font-size: 8.5px;
            line-height: 1.25;
          }

          /* Officials: Side-by-side balanced cards */
          .login-left-officials-header {
            display: flex;
            flex-direction: row;
            width: 100%;
            max-width: 360px;
            justify-content: center;
            gap: 6px;
          }

          .official-card {
            flex: 1 1 0;
            min-width: 0;
            padding: 3px 5px 3px 3px;
            gap: 5px;
            border-radius: 6px;
          }

          .official-photo {
            width: 30px;
            height: 38px;
            border-radius: 5px;
            flex-shrink: 0;
          }

          .official-info {
            min-width: 0;
            overflow: hidden;
          }

          .official-name {
            font-size: 8.5px;
            white-space: normal;
            word-break: break-word;
            line-height: 1.15;
            display: block;
          }

          .official-title {
            font-size: 7.5px;
            line-height: 1.15;
            white-space: normal;
            color: #FFD54F;
          }

          /* Compact spacer for mobile */
          .login-left-spacer {
            min-height: 24px;
          }

          /* Motto: Centered, guaranteed no text cutoff */
          .login-bottom-motto-wrapper {
            margin-bottom: 8px;
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .login-bottom-motto {
            font-size: 9px;
            letter-spacing: 0.5px;
            gap: 5px;
            padding: 0 4px 3px;
            flex-wrap: wrap;
            justify-content: center;
            text-align: center;
            max-width: 100%;
          }

          .motto-dot {
            font-size: 9px;
          }

          /* Features: Compact 4-column row on mobile */
          .login-left-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            padding-top: 8px;
            width: 100%;
          }

          .feature-item {
            width: 100%;
            gap: 3px;
          }

          .feature-icon {
            width: 30px;
            height: 30px;
            border-radius: 8px;
          }

          .feature-title {
            font-size: 8px;
            line-height: 1.15;
          }

          .feature-desc {
            display: none;
          }

          /* Right Panel on Mobile */
          .login-right {
            height: auto;
            min-height: auto;
            max-height: none;
            overflow: visible;
            flex: none;
            width: 100%;
            padding: 28px 18px 44px;
            box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.08);
            background: white;
          }

          .login-right-content {
            max-width: 100%;
            gap: 9px;
          }

          .login-welcome :global(img) {
            max-width: 205px !important;
          }

          /* Mobile Form Inputs: 16px to prevent iOS Safari auto-zoom */
          .login-input {
            height: 42px;
            font-size: 16px;
            padding: 0 36px 0 36px;
            border-radius: 8px;
          }

          .login-input::placeholder {
            font-size: 13.5px;
          }

          .login-toggle-password {
            right: 10px;
            padding: 6px;
          }

          .login-options {
            font-size: 12px;
            margin: 2px 0;
          }

          .login-remember {
            font-size: 12px;
          }

          .login-checkbox {
            width: 16px;
            height: 16px;
          }

          .login-forgot {
            font-size: 12px;
          }

          .login-submit-btn {
            height: 42px;
            font-size: 14.5px;
            border-radius: 8px;
          }

          .login-notice {
            padding: 8px 10px;
          }

          .login-notice-text {
            font-size: 10.5px;
            line-height: 1.4;
          }

          /* Mobile Footer: Centered clean text */
          .login-footer {
            position: relative;
            height: auto;
            padding: 14px 16px 18px;
            flex-direction: column;
            gap: 4px;
            text-align: center;
          }

          .login-footer-left,
          .login-footer-right {
            font-size: 9.5px;
            line-height: 1.4;
          }
        }

        /* 6. Ultra-Compact Mobile (<= 360px, e.g. iPhone SE, Galaxy Z Flip cover) */
        @media (max-width: 360px) {
          .login-left {
            padding: 14px 10px 18px;
          }

          .login-left-header-title {
            font-size: 11px;
          }

          .login-left-header-subtitle {
            font-size: 8.5px;
          }

          .login-left-officials-header {
            gap: 6px;
          }

          .official-photo {
            width: 30px;
            height: 38px;
          }

          .official-name {
            font-size: 8.5px;
          }

          .official-title {
            font-size: 7.5px;
          }

          .login-bottom-motto {
            font-size: 9px;
            letter-spacing: 0.4px;
            gap: 4px;
          }

          .feature-desc {
            display: none;
          }

          .login-welcome :global(img) {
            max-width: 165px !important;
          }

          .login-right {
            padding: 22px 14px 38px;
          }
        }
      `}</style>
    </div>
  )
}
