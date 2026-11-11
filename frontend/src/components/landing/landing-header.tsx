"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Menu, X } from "lucide-react"
import styles from "@/app/landing.module.css"

const links = [
  { href: "#tentang", label: "Tentang" },
  { href: "#layanan", label: "Ruang Lingkup" },
  { href: "#inisiator", label: "Pimpinan & Inisiator" },
  { href: "#alur", label: "Alur Kerja" },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    const breakpoint = window.matchMedia("(min-width: 901px)")
    const closeOnDesktop = () => {
      if (breakpoint.matches) setOpen(false)
    }
    document.addEventListener("keydown", closeOnEscape)
    breakpoint.addEventListener("change", closeOnDesktop)
    return () => {
      document.removeEventListener("keydown", closeOnEscape)
      breakpoint.removeEventListener("change", closeOnDesktop)
    }
  }, [open])

  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <a
          href="#beranda"
          className={styles.brand}
          onClick={() => setOpen(false)}
          aria-label="Beranda MONALISA — Pemerintah Kabupaten Konawe Selatan"
        >
          <Image className={styles.headerLogo} src="/monalisa_sidebar.webp" alt="MONALISA Konsel" width={1774} height={887} sizes="180px" preload />

        </a>
        <nav className={styles.desktopNav} aria-label="Navigasi utama">
          {links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.headerLogin}>Masuk Aplikasi <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <button
            ref={toggle}
            type="button"
            className={styles.menuToggle}
            aria-expanded={open}
            aria-controls="landing-navigation"
            aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      <nav id="landing-navigation" className={styles.mobileNav} aria-label="Navigasi mobile" hidden={!open}>
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ))}
      </nav>
    </header>
  )
}

