import type { Mutasi, Penjualan } from '../types'
import type { KekuranganStokCloud } from './rpc'

export type PeristiwaSinkron =
  | {
      tipe: 'penjualan-tersimpan'
      idLokal: string
      penjualan: Penjualan
      mutasi: Mutasi[]
    }
  | {
      tipe: 'penolakan'
      pesan: string
      kode: string
      kekurangan?: KekuranganStokCloud[]
    }
  | { tipe: 'perlu-sinkron-ulang' }
  | { tipe: 'antrean-berubah' }

type Pendengar = (peristiwa: PeristiwaSinkron) => void

const pendengar = new Set<Pendengar>()

export function langgananPeristiwaSinkron(cb: Pendengar): () => void {
  pendengar.add(cb)
  return () => {
    pendengar.delete(cb)
  }
}

export function siarkanPeristiwa(peristiwa: PeristiwaSinkron): void {
  pendengar.forEach((cb) => {
    try {
      cb(peristiwa)
    } catch (error) {
      console.error('[Banggala Stock] Pendengar peristiwa gagal:', error)
    }
  })
}
