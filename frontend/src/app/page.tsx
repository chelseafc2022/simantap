import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Building2, Check, FileText, MapPin, MoveUpRight, Wallet } from "lucide-react"
import { LandingHeader } from "@/components/landing/landing-header"
import styles from "./landing.module.css"

export const metadata: Metadata = {
  title: "MONALISA — Monitoring Pembangunan Konawe Selatan",
  description: "MONALISA: Monitoring Realisasi Anggaran dan Fisik Data Pembangunan Konawe Selatan. Satu ruang untuk mencatat progres, memantau realisasi, dan menyajikan laporan pembangunan.",
  openGraph: {
    title: "MONALISA · Konawe Selatan",
    description: "Pembangunan terukur. Keputusan lebih pasti. Monitoring realisasi anggaran dan fisik pembangunan Konawe Selatan.",
    type: "website",
    locale: "id_ID",
    siteName: "MONALISA KONSEL",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "MONALISA KONSEL — Monitoring Realisasi Anggaran dan Fisik Data Pembangunan Konawe Selatan" }],
  },
}

const capabilities = [
  { icon: Building2, title: "Data pembangunan", text: "Informasi paket, perangkat daerah, dan anggaran tersusun dalam satu tempat.", detail: "Paket & perangkat daerah" },
  { icon: BarChart3, title: "Progres fisik", text: "Catat perkembangan pelaksanaan kegiatan beserta dokumentasi pendukungnya.", detail: "Target & realisasi" },
  { icon: Wallet, title: "Realisasi keuangan", text: "Rekam pencairan bertahap dan telusuri realisasi setiap bulan secara terperinci.", detail: "Pencairan & anggaran" },
  { icon: FileText, title: "Rekap & laporan", text: "Sajikan perkembangan pembangunan sebagai bahan monitoring dan evaluasi.", detail: "Informasi & evaluasi" },
]

const workflow = [
  { title: "Siapkan data paket", text: "Lengkapi informasi kegiatan, pagu anggaran, serta target pelaksanaan." },
  { title: "Catat perkembangannya", text: "Perbarui progres fisik dan pencairan keuangan sesuai periode pelaporan." },
  { title: "Pantau & evaluasi", text: "Tinjau capaian melalui dashboard dan gunakan rekap untuk menyusun laporan." },
]

export default function LandingPage() {
  return (
    <div className={styles.landing} id="beranda">
      <a className={styles.skipLink} href="#konten">Langsung ke konten</a>
      <LandingHeader />
      <main id="konten">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span />MONITORING PEMBANGUNAN TERPADU</p>
            <h1 id="hero-title">Pembangunan<br /><em>terukur.</em><br />Keputusan<br />lebih pasti.</h1>
            <p className={styles.heroDescription}>Kenali <strong>MONALISA.</strong> Satu ruang untuk memantau realisasi anggaran dan fisik pembangunan Kabupaten Konawe Selatan.</p>
            <div className={styles.actions}>
              <Link href="/login" className={styles.primaryButton}>Masuk ke MONALISA <ArrowUpRight size={19} aria-hidden="true" /></Link>
              <a href="#tentang" className={styles.textButton}>Jelajahi <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <div className={styles.heroSignature}><span className={styles.signatureLine} />BAGIAN ADMINISTRASI PEMBANGUNAN<br />SEKRETARIAT DAERAH KABUPATEN KONAWE SELATAN</div>
          </div>
          <figure className={styles.heroVisual}>
            <Image src="/kantor.webp" alt="Kantor Bupati Konawe Selatan dan gerbang utama kawasan perkantoran" fill preload sizes="(max-width: 800px) 100vw, 52vw" className={styles.officeImage} />
            <div className={styles.photoTopline}><span>KONAWE SELATAN</span><span>SULAWESI TENGGARA</span></div>
            <figcaption className={styles.photoCaption}><MapPin size={19} aria-hidden="true" /><span>Kantor Bupati<br /><strong>Konawe Selatan</strong></span><span className={styles.photoIndex}>01 / DAERAH KITA</span></figcaption>
          </figure>
        </section>

        <div className={styles.valuesBand}>
          <div className={`${styles.container} ${styles.valuesInner}`}>
            <p>Data yang terhubung.<br /><strong>Pembangunan yang terarah.</strong></p>
            <span><Check size={17} aria-hidden="true" />Realisasi fisik</span>
            <span><Check size={17} aria-hidden="true" />Realisasi anggaran</span>
            <span><Check size={17} aria-hidden="true" />Pelaporan terpadu</span>
          </div>
        </div>

        <section id="tentang" className={`${styles.container} ${styles.about}`} aria-labelledby="about-title">
          <div className={styles.aboutMark}>
            <span className={styles.smallLabel}>IDENTITAS INOVASI</span>
            <Image src="/monalisa_full.webp" alt="Logo MONALISA Konsel — Monitoring Realisasi Anggaran dan Fisik Data Pembangunan Konawe Selatan" width={700} height={639} sizes="(max-width: 800px) 65vw, 330px" />
            <span className={styles.markFoot}>MONALISA · KONAWE SELATAN</span>
          </div>
          <div className={styles.aboutCopy}>
            <p className={styles.eyebrow}>01 — TENTANG MONALISA</p>
            <h2 id="about-title">Satu pandangan utuh<br />atas pembangunan.</h2>
            <p className={styles.lead}>Monitoring Realisasi Anggaran dan Fisik Data Pembangunan Konawe Selatan.</p>
            <p>MONALISA membantu perangkat daerah mencatat perkembangan pembangunan dalam format yang terstruktur. Data paket, progres fisik, dan pencairan keuangan terhubung untuk memudahkan pemantauan serta pelaporan.</p>
            <div className={styles.aboutNote}><span /><p>Dari data yang tersebar, menjadi informasi yang lebih mudah ditelusuri dan digunakan bersama.</p></div>
            <a href="#layanan" className={styles.textButton}>Lihat ruang lingkupnya <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
        </section>

        <section id="layanan" className={styles.featuresSection} aria-labelledby="features-title">
          <div className={styles.container}>
            <div className={styles.sectionTop}>
              <div><p className={styles.eyebrow}>02 — RUANG LINGKUP</p><h2 id="features-title">Dari pencatatan<br />hingga pengambilan keputusan.</h2></div>
              <p>Informasi yang dibutuhkan untuk mengikuti perjalanan pembangunan, dalam satu platform.</p>
            </div>
            <div className={styles.featureList}>
              {capabilities.map(({ icon: Icon, title, text, detail }, index) => (
                <article className={styles.featureRow} key={title}>
                  <span className={styles.featureNumber}>0{index + 1}</span>
                  <span className={styles.featureIcon}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /></span>
                  <h3>{title}</h3><p>{text}</p><span className={styles.featureDetail}>{detail}<MoveUpRight size={15} aria-hidden="true" /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="inisiator" className={`${styles.container} ${styles.initiatorSection}`} aria-labelledby="initiator-title">
          <article className={styles.leaderPanel} aria-labelledby="leader-name">
            <Image src="/landing/ichsan-porosi-2026.webp" alt="H. Ichsan Porosi, ST., MTP" width={720} height={960} sizes="(max-width: 480px) 140px, 180px" className={styles.leaderPhoto} />
            <div className={styles.leaderCopy}>
              <p className={styles.eyebrow}>PIMPINAN · SEKRETARIAT DAERAH</p>
              <h3 id="leader-name">H. Ichsan Porosi, <span>ST., MTP</span></h3>
              <p>Sekretaris Daerah Kabupaten Konawe Selatan</p>
            </div>
          </article>
          <div className={styles.initiatorCopy}>
            <p className={styles.eyebrow}>03 — DI BALIK INOVASI</p>
            <h2 id="initiator-title">Menggerakkan perubahan.<br /><em>Menguatkan tata kelola.</em></h2>
            <p>MONALISA merupakan aksi perubahan untuk mendukung pengendalian pembangunan yang lebih tertib, terukur, dan berbasis data di Kabupaten Konawe Selatan.</p>
            <div className={styles.personIdentity}>
              <span className={styles.smallLabel}>INISIATOR AKSI PERUBAHAN</span>
              <h3>Andi Wirdayani, <span>S.Sos., M.AP</span></h3>
              <p>Kepala Bagian Administrasi Pembangunan<br />Sekretariat Daerah Kabupaten Konawe Selatan</p>
            </div>
            <p className={styles.education}>Pelatihan Kepemimpinan Administrator<br />Angkatan XXII · BPSDM Provinsi Sulawesi Tenggara</p>
          </div>
          <figure className={styles.portraitFrame}>
            <span className={styles.portraitWord} aria-hidden="true">AKSI<br />NYATA.</span>
            <Image src="/landing/andi-wirdayani-cutout.png" alt="Andi Wirdayani, S.Sos., M.AP, Kepala Bagian Administrasi Pembangunan" width={1127} height={1395} sizes="(max-width: 800px) 90vw, 480px" className={styles.portrait} />
            <figcaption className={styles.portraitCaption}>KOMITMEN UNTUK PEMBANGUNAN KONAWE SELATAN<ArrowUpRight size={18} aria-hidden="true" /></figcaption>
          </figure>
        </section>

        <section id="alur" className={styles.workflowSection} aria-labelledby="workflow-title">
          <div className={styles.container}>
            <div className={styles.sectionTop}><div><p className={styles.eyebrow}>04 — ALUR KERJA</p><h2 id="workflow-title">Lebih teratur di setiap langkah.</h2></div><p>Mulai dari informasi dasar hingga laporan perkembangan pembangunan.</p></div>
            <ol className={styles.workflow}>
              {workflow.map((step, index) => <li key={step.title}><div className={styles.stepTop}><span>0{index + 1}</span><ArrowRight size={23} aria-hidden="true" /></div><h3>{step.title}</h3><p>{step.text}</p></li>)}
            </ol>
          </div>
        </section>

        <section className={`${styles.container} ${styles.ctaSection}`} aria-labelledby="cta-title">
          <div className={styles.cta}><div><p className={styles.eyebrow}>MONALISA · KONAWE SELATAN</p><h2 id="cta-title">Langkah nyata dimulai<br />dari data yang tertata.</h2><p>Akses aplikasi untuk mencatat, memantau, dan melaporkan perkembangan pembangunan.</p></div><Link href="/login" className={styles.goldButton}>Buka MONALISA <ArrowUpRight size={20} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerMain}`}>
          <div className={styles.footerIdentity}><Image src="/logo_konsel.webp" alt="Lambang Kabupaten Konawe Selatan" width={678} height={800} sizes="42px" /><div><strong>Pemerintah Kabupaten Konawe Selatan</strong><p>Bagian Administrasi Pembangunan<br />Sekretariat Daerah</p></div></div>
          <nav aria-label="Navigasi footer"><a href="#tentang">Tentang MONALISA</a><a href="#inisiator">Pimpinan &amp; Inisiator</a><Link href="/login">Masuk aplikasi <ArrowUpRight size={14} aria-hidden="true" /></Link></nav>
          <Image src="/logo_setara.webp" alt="Konsel Setara — Sehat, Cerdas dan Sejahtera" width={1000} height={322} sizes="145px" className={styles.setaraLogo} />
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}><p>© 2026 MONALISA. Pemerintah Kabupaten Konawe Selatan.</p><a href="#beranda">Kembali ke atas ↑</a></div>
      </footer>
    </div>
  )
}
