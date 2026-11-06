import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BahanPage } from './pages/BahanPage'
import { MutasiPage } from './pages/MutasiPage'
import { LaporanPage } from './pages/LaporanPage'
import { PenggunaPage } from './pages/PenggunaPage'
import { PengaturanPage } from './pages/PengaturanPage'
import { MenuPage } from './pages/MenuPage'
import { PenjualanPage } from './pages/PenjualanPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="bahan" element={<BahanPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="penjualan" element={<PenjualanPage />} />
            <Route path="mutasi" element={<MutasiPage />} />
            <Route path="laporan" element={<LaporanPage />} />
            <Route element={<AdminRoute />}>
              <Route path="pengguna" element={<PenggunaPage />} />
              <Route path="pengaturan" element={<PengaturanPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
