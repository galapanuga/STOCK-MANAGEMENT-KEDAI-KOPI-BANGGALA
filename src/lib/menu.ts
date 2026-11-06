import type { Bahan, ItemPenjualan, Menu, StokInfo } from '../types'

const bulatkan = (n: number) => Math.round(n * 1000) / 1000

export interface RincianKebutuhan {
  bahanId: string
  nama: string
  satuan: string
  dibutuhkan: number
  tersedia: number
  cukup: boolean
}

export function menuPunyaResep(menu: Menu | undefined): boolean {
  return Boolean(menu && menu.resep.length > 0)
}

/** Gabungkan kebutuhan seluruh item penjualan menjadi kebutuhan per bahan. */
export function kebutuhanBahan(
  items: { menuId: string; jumlah: number }[],
  menuMap: Map<string, Menu>,
): Map<string, number> {
  const peta = new Map<string, number>()

  for (const item of items) {
    if (!(item.jumlah > 0)) continue
    const menu = menuMap.get(item.menuId)
    if (!menu) continue
    for (const resep of menu.resep) {
      if (!(resep.jumlah > 0)) continue
      peta.set(
        resep.bahanId,
        (peta.get(resep.bahanId) ?? 0) + resep.jumlah * item.jumlah,
      )
    }
  }

  for (const [bahanId, jumlah] of peta) {
    peta.set(bahanId, bulatkan(jumlah))
  }
  return peta
}

/** Rincian kebutuhan vs stok tersedia, dipakai untuk validasi dan pratinjau. */
export function rincianKebutuhan(
  items: { menuId: string; jumlah: number }[],
  menuMap: Map<string, Menu>,
  bahanMap: Map<string, Bahan>,
  stokMap: Map<string, StokInfo>,
): RincianKebutuhan[] {
  const kebutuhan = kebutuhanBahan(items, menuMap)
  const hasil: RincianKebutuhan[] = []

  for (const [bahanId, dibutuhkan] of kebutuhan) {
    const bahan = bahanMap.get(bahanId)
    const tersedia = stokMap.get(bahanId)?.stok ?? 0
    hasil.push({
      bahanId,
      nama: bahan?.nama ?? `Bahan tidak dikenal (${bahanId})`,
      satuan: bahan?.satuan ?? '',
      dibutuhkan,
      tersedia,
      cukup: Boolean(bahan) && dibutuhkan <= tersedia + 1e-9,
    })
  }

  return hasil.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}

export interface KekuranganStok {
  bahanId: string
  nama: string
  satuan: string
  dibutuhkan: number
  tersedia: number
}

export function periksaKetersediaan(
  items: { menuId: string; jumlah: number }[],
  menuMap: Map<string, Menu>,
  bahanMap: Map<string, Bahan>,
  stokMap: Map<string, StokInfo>,
): KekuranganStok[] {
  return rincianKebutuhan(items, menuMap, bahanMap, stokMap)
    .filter((r) => !r.cukup)
    .map((r) => ({
      bahanId: r.bahanId,
      nama: r.nama,
      satuan: r.satuan,
      dibutuhkan: r.dibutuhkan,
      tersedia: r.tersedia,
    }))
}

/** Menu pada transaksi yang tidak akan memotong stok karena belum punya resep. */
export function menuTanpaResep(
  items: { menuId: string; jumlah: number }[],
  menuMap: Map<string, Menu>,
): string[] {
  const nama = new Set<string>()
  for (const item of items) {
    if (!(item.jumlah > 0)) continue
    const menu = menuMap.get(item.menuId)
    if (!menu) continue
    if (menu.resep.length === 0) nama.add(menu.nama)
  }
  return [...nama]
}

export function totalItem(items: ItemPenjualan[]): number {
  return bulatkan(items.reduce((total, it) => total + it.jumlah, 0))
}

export function ringkasItems(items: ItemPenjualan[]): string {
  return items.map((it) => `${it.jumlah}× ${it.nama}`).join(', ')
}
