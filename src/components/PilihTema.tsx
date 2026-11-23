export function PilihTema() {
  return (
    <select
      aria-label="Tema tampilan"
      className="input w-auto shrink-0 py-1.5 text-xs"
      defaultValue={document.documentElement.dataset.tema ?? 'sistem'}
      onChange={(event) => {
        const tema = event.currentTarget.value
        if (tema === 'sistem') delete document.documentElement.dataset.tema
        else document.documentElement.dataset.tema = tema

        try {
          if (tema === 'sistem') localStorage.removeItem('banggala_tema')
          else localStorage.setItem('banggala_tema', tema)
        } catch {
          // Tema tetap berlaku sampai halaman dimuat ulang.
        }
      }}
    >
      <option value="sistem">Sistem</option>
      <option value="terang">Terang</option>
      <option value="gelap">Gelap</option>
    </select>
  )
}
