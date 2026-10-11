export function SiteFooter() {
  return (
    <footer className="border-t bg-background py-4 px-4 lg:px-6">
      <div className="text-center text-xs text-muted-foreground sm:text-left">
        <div>
          <span>© {new Date().getFullYear()} </span>
          <span className="font-medium text-foreground">MONALISA KONSEL</span>
          <span> — Pemerintah Kabupaten Konawe Selatan</span>
        </div>
      </div>
    </footer>
  )
}
