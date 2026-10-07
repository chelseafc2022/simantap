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
      {/* ========== LEFT / HERO PANEL ========== */}
      <div className="login-left">
        {/* Background Photo & Gradient Overlays */}
        <div className="login-bg">
          <Image
            src="/kantor.jpg"
            alt="Kantor Bupati Konawe Selatan"
            fill
            priority
            style={{ objectFit: "cover", objectPosition: "center 70%" }}
            quality={90}
          />
          <div className="login-bg-overlay" />
        </div>

        {/* Top Header Branding & Officials */}
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

          {/* Bupati & Wakil Bupati Cards */}
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

        {/* Center Spacer to showcase Kantor Bupati view */}
        <div className="login-left-spacer" />

        {/* Motto Bar */}
        <div className="login-bottom-motto-wrapper">
          <div className="login-bottom-motto">
            <span>MELAYANI</span>
            <span className="motto-dot">•</span>
            <span>MENGAWAL</span>
            <span className="motto-dot">•</span>
            <span>MEMBANGUN BERSAMA</span>
          </div>
        </div>

        {/* 4 Pillars Feature Badges (Desktop) */}
        <div className="login-left-features">
          <div className="feature-item">
            <div className="feature-icon feature-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span className="feature-title">Data Paket & Kontrak</span>
            <span className="feature-desc">Terintegrasi dan Akuntabel</span>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-icon-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <span className="feature-title">Realisasi Fisik & Keuangan</span>
            <span className="feature-desc">Monitoring Setiap Periode</span>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-icon-amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <span className="feature-title">Laporan & Evaluasi RFK</span>
            <span className="feature-desc">Mendukung Keputusan Daerah</span>
          </div>

          <div className="feature-item">
            <div className="feature-icon feature-icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className="feature-title">Kolaborasi OPD</span>
            <span className="feature-desc">Pembangunan Terpadu</span>
          </div>
        </div>
      </div>

      {/* ========== RIGHT / FORM PANEL ========== */}
      <div className="login-right">
        <div className="login-right-content">
          {/* Welcome Branding */}
          <div className="login-welcome">
            <div className="login-welcome-logo">
              <Image
                src="/logo_simantap_header.png"
                alt="SI-MANTAP Kabupaten Konawe Selatan"
                width={240}
                height={268}
                quality={100}
                priority
                style={{ objectFit: "contain", height: "auto", width: "100%", maxWidth: "230px" }}
              />
            </div>
            <p className="login-welcome-subtitle">
              Sistem Informasi Manajemen Pengendalian dan Evaluasi Pembangunan Daerah
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="login-form" id="login-form">
            {/* Username / NIP */}
            <div className="login-input-group">
              <label htmlFor="login-username" className="login-label">
                Username / NIP
              </label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Masukkan NIP atau username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  className="login-input"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-input-group">
              <label htmlFor="login-password" className="login-label">
                Kata Sandi
              </label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot options */}
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
              <button
                type="button"
                className="login-forgot"
                onClick={() => toast.info("Silakan hubungi Administrator OPD / Bidang Administrasi Pembangunan untuk reset password.")}
              >
                Lupa kata sandi?
              </button>
            </div>

            {/* Submit Button */}
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
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <span className="login-divider-text">Keamanan Akses Terintegrasi</span>
            <div className="login-divider-line" />
          </div>

          {/* Security Notice */}
          <div className="login-notice">
            <svg className="login-notice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
            <p className="login-notice-text">
              Akses terbatas untuk aparatur berwenang di lingkungan <strong>Pemerintah Kabupaten Konawe Selatan</strong>.
            </p>
          </div>

          {/* Logo Konsel Setara */}
          <div className="login-setara">
            <Image
              src="/logo_setara.png"
              alt="Logo Konsel Setara"
              width={125}
              height={34}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* ========== MOBILE-ONLY FEATURES & FOOTER ========== */}
      <div className="login-mobile-bottom">
        <div className="login-mobile-features-title">Pilar Pengendalian Pembangunan</div>
        <div className="login-mobile-features-grid">
          <div className="m-feature-card">
            <div className="m-feature-dot dot-blue" />
            <div>
              <div className="m-feature-name">Data Paket & Kontrak</div>
              <div className="m-feature-sub">Terintegrasi & Akuntabel</div>
            </div>
          </div>
          <div className="m-feature-card">
            <div className="m-feature-dot dot-green" />
            <div>
              <div className="m-feature-name">Realisasi Fisik & Keuangan</div>
              <div className="m-feature-sub">Monitoring Periodik</div>
            </div>
          </div>
          <div className="m-feature-card">
            <div className="m-feature-dot dot-amber" />
            <div>
              <div className="m-feature-name">Laporan & Evaluasi RFK</div>
              <div className="m-feature-sub">Keputusan Strategis</div>
            </div>
          </div>
          <div className="m-feature-card">
            <div className="m-feature-dot dot-purple" />
            <div>
              <div className="m-feature-name">Kolaborasi OPD</div>
              <div className="m-feature-sub">Pembangunan Terpadu</div>
            </div>
          </div>
        </div>

        <div className="login-mobile-footer-text">
          <div>© 2026 Pemerintah Kabupaten Konawe Selatan</div>
          <div className="text-muted">SI-MANTAP • Satu Data untuk Pembangunan Daerah</div>
        </div>
      </div>

      {/* ========== DESKTOP FIXED FOOTER ========== */}
      <div className="login-footer">
        <span className="login-footer-left">© 2026 Pemerintah Kabupaten Konawe Selatan</span>
        <span className="login-footer-right">SI-MANTAP | Satu Data untuk Pembangunan Daerah yang Lebih Baik</span>
      </div>

      <style jsx>{`
        /* ============================
           ROOT CONTAINER
        ============================ */
        .login-page {
          display: flex;
          min-height: 100vh;
          width: 100%;
          position: relative;
          background: #f8fafc;
          font-family: var(--font-inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        /* ============================
           LEFT PANEL (DESKTOP)
        ============================ */
        .login-left {
          position: relative;
          flex: 1.25;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 28px 40px 56px;
          min-height: 100vh;
          overflow: hidden;
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
            rgba(6, 26, 48, 0.72) 0%,
            rgba(10, 37, 68, 0.62) 35%,
            rgba(6, 24, 46, 0.78) 70%,
            rgba(4, 15, 30, 0.92) 100%
          );
          z-index: 1;
        }

        .login-left > *:not(.login-bg) {
          position: relative;
          z-index: 2;
        }

        /* Left Top Header */
        .login-left-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .login-left-header-logo {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .login-left-header-divider {
          width: 2px;
          height: 52px;
          background: rgba(255, 255, 255, 0.35);
          border-radius: 1px;
        }

        .login-left-header-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .login-left-header-title {
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.6px;
          line-height: 1.3;
        }

        .login-left-header-subtitle {
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
          line-height: 1.35;
        }

        /* Officials Header Cards */
        .login-left-officials-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .official-card {
          display: flex;
          align-items: center;
          gap: 9px;
          background: rgba(7, 25, 48, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          padding: 6px 12px 6px 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .official-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 213, 79, 0.5);
        }

        .official-photo {
          width: 48px;
          height: 58px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.25) 0%, rgba(10, 30, 58, 0.9) 100%);
          border: 1.5px solid rgba(255, 213, 79, 0.6);
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
          color: #ffd54f;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }

        /* Spacer */
        .login-left-spacer {
          flex: 1;
          min-height: 80px;
        }

        /* Motto Centered */
        .login-bottom-motto-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .login-bottom-motto {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          border-bottom: 2px solid #ffd54f;
          padding: 0 14px 8px;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        }

        .motto-dot {
          color: #ffd54f;
          font-size: 14px;
        }

        /* Features Desktop */
        .login-left-features {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
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
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          transition: transform 0.2s ease;
        }

        .feature-icon:hover {
          transform: translateY(-2px);
        }

        .feature-icon-blue {
          background: linear-gradient(135deg, #1565c0, #42a5f5);
        }
        .feature-icon-green {
          background: linear-gradient(135deg, #2e7d32, #66bb6a);
        }
        .feature-icon-amber {
          background: linear-gradient(135deg, #e65100, #ffa726);
        }
        .feature-icon-purple {
          background: linear-gradient(135deg, #6a1b9a, #ab47bc);
        }

        .feature-title {
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.3;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        .feature-desc {
          color: rgba(255, 255, 255, 0.72);
          font-size: 10px;
          font-weight: 400;
          line-height: 1.3;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* ============================
           RIGHT PANEL (FORM)
        ============================ */
        .login-right {
          flex: 0 0 460px;
          width: 460px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 36px 64px;
          background: #ffffff;
          position: relative;
          z-index: 3;
          min-height: 100vh;
          overflow-y: auto;
          box-shadow: -10px 0 35px rgba(0, 0, 0, 0.06);
        }

        .login-right-content {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin: auto 0;
        }

        /* Welcome Header */
        .login-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .login-welcome-logo {
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .login-welcome-subtitle {
          font-size: 12px;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
          max-width: 320px;
        }

        /* Form Layout */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .login-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          letter-spacing: 0.1px;
        }

        .login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
          transition: color 0.2s ease;
        }

        .login-input {
          width: 100%;
          height: 46px;
          padding: 0 44px 0 44px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .login-input::placeholder {
          color: #94a3b8;
          font-size: 13.5px;
        }

        .login-input:hover:not(:disabled) {
          border-color: #94a3b8;
        }

        .login-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .login-input-wrapper:focus-within .login-input-icon {
          color: #2563eb;
        }

        .login-toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.2s ease, background-color 0.2s ease;
        }

        .login-toggle-password:hover {
          color: #475569;
          background-color: #e2e8f0;
        }

        /* Options Row */
        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2px 2px;
        }

        .login-remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }

        .login-checkbox {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
          cursor: pointer;
          border-radius: 4px;
        }

        .login-forgot {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease;
        }

        .login-forgot:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        /* Submit Button */
        .login-submit-btn {
          width: 100%;
          height: 46px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.25s ease;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
          margin-top: 4px;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e40af, #1d4ed8);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-spinner {
          animation: spin 0.8s linear infinite;
        }

        /* Divider */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }

        .login-divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .login-divider-text {
          font-size: 11.5px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Notice Card */
        .login-notice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 10px;
        }

        .login-notice-icon {
          color: #0284c7;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .login-notice-text {
          font-size: 12px;
          color: #334155;
          line-height: 1.45;
          margin: 0;
        }

        .login-notice-text strong {
          color: #0369a1;
          font-weight: 600;
        }

        /* Setara Logo */
        .login-setara {
          display: flex;
          justify-content: center;
          padding-top: 4px;
        }

        /* Mobile-only Bottom Features & Footer */
        .login-mobile-bottom {
          display: none;
        }

        /* ============================
           DESKTOP FIXED FOOTER
        ============================ */
        .login-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 40px;
          background: rgba(4, 15, 30, 0.94);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 10;
        }

        .login-footer-left,
        .login-footer-right {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.65);
          letter-spacing: 0.3px;
        }

        /* ============================
           RESPONSIVE BREAKPOINTS
        ============================ */

        /* 1. Large Monitors (>= 1440px) */
        @media (min-width: 1440px) {
          .login-left {
            padding: 36px 52px 64px;
          }
          .login-right {
            flex: 0 0 500px;
            width: 500px;
            padding: 48px 48px 64px;
          }
          .login-right-content {
            max-width: 400px;
            gap: 22px;
          }
          .login-welcome-logo :global(img) {
            max-width: 250px !important;
          }
        }

        /* 2. Compact Desktop / Laptops (1024px to 1279px) */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .login-left {
            padding: 24px 28px 52px;
          }
          .login-left-header-title {
            font-size: 13px;
          }
          .login-left-header-subtitle {
            font-size: 10px;
          }
          .official-card {
            padding: 4px 8px 4px 4px;
            gap: 7px;
          }
          .official-photo {
            width: 42px;
            height: 52px;
          }
          .official-name {
            font-size: 10.5px;
          }
          .official-title {
            font-size: 9px;
          }
          .login-right {
            flex: 0 0 420px;
            width: 420px;
            padding: 32px 28px 56px;
          }
          .login-right-content {
            max-width: 350px;
            gap: 16px;
          }
          .feature-title {
            font-size: 10px;
          }
          .feature-desc {
            font-size: 9px;
          }
        }

        /* 3. Short Desktop Screens (height <= 760px) */
        @media (min-width: 1024px) and (max-height: 760px) {
          .login-left {
            padding: 18px 28px 48px;
          }
          .login-left-spacer {
            min-height: 30px;
          }
          .login-bottom-motto-wrapper {
            margin-bottom: 12px;
          }
          .login-bottom-motto {
            font-size: 12px;
            padding-bottom: 5px;
          }
          .login-left-features {
            padding-top: 12px;
            gap: 10px;
          }
          .feature-icon {
            width: 38px;
            height: 38px;
          }
          .login-right {
            padding: 24px 28px 52px;
          }
          .login-right-content {
            gap: 14px;
          }
          .login-welcome-subtitle {
            font-size: 11px;
          }
        }

        /* 4. Tablets (768px to 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .login-page {
            flex-direction: column;
            min-height: 100vh;
            background: #f1f5f9;
          }

          .login-footer {
            display: none; /* Replaced by in-page mobile bottom */
          }

          .login-left {
            min-height: 380px;
            flex: none;
            padding: 24px 28px 36px;
          }

          .login-left-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .login-left-features {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            padding-top: 14px;
          }

          .login-right {
            flex: none;
            width: 100%;
            min-height: auto;
            background: transparent;
            box-shadow: none;
            padding: 32px 20px 48px;
            margin-top: -30px;
            z-index: 5;
          }

          .login-right-content {
            max-width: 440px;
            background: #ffffff;
            padding: 36px 32px;
            border-radius: 18px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            gap: 18px;
          }

          .login-mobile-bottom {
            display: block;
            padding: 0 24px 40px;
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
          }
        }

        /* 5. Mobile Smartphones (< 768px) */
        @media (max-width: 767px) {
          .login-page {
            flex-direction: column;
            min-height: 100vh;
            background: #f1f5f9;
          }

          .login-footer {
            display: none;
          }

          /* Compact & majestic top hero banner */
          .login-left {
            min-height: 220px;
            flex: none;
            padding: 18px 16px 28px;
            justify-content: flex-start;
          }

          .login-left-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
            width: 100%;
          }

          .login-left-header-logo {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }

          .login-left-header-divider {
            height: 38px;
            width: 1.5px;
          }

          .login-left-header-text {
            text-align: left;
          }

          .login-left-header-title {
            font-size: 12px;
            line-height: 1.25;
          }

          .login-left-header-subtitle {
            font-size: 9.5px;
            line-height: 1.3;
          }

          /* Officials: Compact clean cards */
          .login-left-officials-header {
            display: flex;
            flex-direction: row;
            justify-content: center;
            gap: 8px;
            width: 100%;
            max-width: 360px;
          }

          .official-card {
            flex: 1;
            padding: 4px 8px 4px 4px;
            gap: 7px;
            border-radius: 8px;
          }

          .official-photo {
            width: 36px;
            height: 44px;
            border-radius: 6px;
          }

          .official-name {
            font-size: 9.5px;
            white-space: normal;
            line-height: 1.2;
          }

          .official-title {
            font-size: 8px;
            line-height: 1.2;
          }

          /* Hide desktop features from top banner */
          .login-left-features,
          .login-left-spacer,
          .login-bottom-motto-wrapper {
            display: none;
          }

          /* Right Panel / Login Card overlaps smoothly */
          .login-right {
            flex: none;
            width: 100%;
            min-height: auto;
            background: transparent;
            box-shadow: none;
            padding: 0 14px 28px;
            margin-top: -16px;
            z-index: 5;
          }

          .login-right-content {
            max-width: 100%;
            background: #ffffff;
            padding: 28px 20px 24px;
            border-radius: 18px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            gap: 16px;
          }

          .login-welcome {
            gap: 8px;
            margin-bottom: 2px;
          }

          .login-welcome-logo :global(img) {
            max-width: 200px !important;
          }

          .login-welcome-subtitle {
            font-size: 11.5px;
            line-height: 1.4;
          }

          /* Input field: 48px height, 16px font to prevent Safari zoom */
          .login-input {
            height: 48px;
            font-size: 16px;
            padding: 0 46px 0 44px;
            border-radius: 10px;
          }

          .login-input::placeholder {
            font-size: 14px;
          }

          .login-submit-btn {
            height: 48px;
            font-size: 15px;
            border-radius: 10px;
          }

          .login-notice {
            padding: 10px 12px;
          }

          .login-notice-text {
            font-size: 11.5px;
          }

          /* Mobile Bottom Features Grid */
          .login-mobile-bottom {
            display: block;
            padding: 0 16px 36px;
            width: 100%;
          }

          .login-mobile-features-title {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            text-align: center;
            margin-bottom: 12px;
          }

          .login-mobile-features-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 24px;
          }

          .m-feature-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 10px 12px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
          }

          .m-feature-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-top: 5px;
            flex-shrink: 0;
          }

          .dot-blue { background: #2563eb; }
          .dot-green { background: #16a34a; }
          .dot-amber { background: #d97706; }
          .dot-purple { background: #9333ea; }

          .m-feature-name {
            font-size: 11px;
            font-weight: 600;
            color: #1e293b;
            line-height: 1.25;
          }

          .m-feature-sub {
            font-size: 9.5px;
            color: #64748b;
            line-height: 1.2;
            margin-top: 2px;
          }

          .login-mobile-footer-text {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
        }

        /* 6. Extra Small Screens (<= 360px) */
        @media (max-width: 360px) {
          .login-right-content {
            padding: 22px 14px 20px;
          }
          .login-mobile-features-grid {
            grid-template-columns: 1fr;
          }
          .official-card {
            padding: 3px 6px 3px 3px;
          }
          .official-photo {
            width: 32px;
            height: 40px;
          }
          .official-name {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  )
}
