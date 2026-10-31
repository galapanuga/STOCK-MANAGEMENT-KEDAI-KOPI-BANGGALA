function unduh(nama: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function unduhCSV(
  nama: string,
  header: string[],
  baris: (string | number)[][],
): void {
  const escape = (nilai: string | number) => {
    const teks = String(nilai ?? '')
    return /[";\n\r]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks
  }

  const isi =
    '\uFEFF' +
    [header, ...baris].map((r) => r.map(escape).join(';')).join('\r\n')

  unduh(
    nama.endsWith('.csv') ? nama : `${nama}.csv`,
    new Blob([isi], { type: 'text/csv;charset=utf-8;' }),
  )
}

export function unduhJSON(nama: string, data: unknown): void {
  unduh(
    nama.endsWith('.json') ? nama : `${nama}.json`,
    new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    }),
  )
}
