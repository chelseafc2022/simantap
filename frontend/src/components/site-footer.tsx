export function SiteFooter() {
  return (
    <footer className="border-t bg-background py-4 px-4 lg:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span>© {new Date().getFullYear()} </span>
          <span className="font-medium text-foreground">SIMANTAP</span>
          <span> — Pemerintah Kabupaten Konawe Selatan</span>
        </div>
        <div className="text-[11px]">
          Sistem Informasi Monitoring dan Evaluasi Data Pembangunan Terpadu
        </div>
      </div>
    </footer>
  )
}
