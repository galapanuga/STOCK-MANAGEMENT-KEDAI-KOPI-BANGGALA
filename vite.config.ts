import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Registrasi dilakukan manual di src/main.tsx agar bisa menampilkan
      // penanda "versi baru tersedia" tanpa memaksa reload di tengah transaksi.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['images/logo.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        id: '/',
        name: 'Banggala Stock — Kedai Kopi Banggala',
        short_name: 'Banggala Stock',
        description:
          'Pencatatan stok, menu, resep, dan penjualan Kedai Kopi Banggala. Bisa dipakai offline.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#fef8f4',
        theme_color: '#3b2a21',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell: seluruh aset build + font lokal di-precache agar aplikasi
        // tetap dapat dibuka saat perangkat benar-benar offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        globIgnores: ['**/images/logo.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        runtimeCaching: [
          {
            // Semua lalu lintas Supabase (Auth, REST, RPC, Realtime, Functions)
            // TIDAK boleh di-cache: data transaksi harus selalu segar dan
            // antrean offline ditangani oleh outbox IndexedDB.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
            method: 'POST',
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'banggala-gambar',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    open: false,
  },
})
