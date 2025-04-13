/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import * as dotenv from 'dotenv'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { patchCssModules } from 'vite-css-modules'
import { VitePWA } from 'vite-plugin-pwa'
import i18nextLoader from 'vite-plugin-i18next-loader'

dotenv.config()

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

  // import.meta.env.VITE_PORT available here with: process.env.VITE_PORT

  return defineConfig({
    base: '/ui',
    plugins: [
      i18nextLoader({ paths: ['./public/locales/'], namespaceResolution: 'basename' }),
      patchCssModules(),
      react({
        jsxRuntime: 'automatic',
      }),
      tsconfigPaths({ root: '.' }),
      dynamicImport({}),
      VitePWA({
        registerType: 'prompt', // or autoUpdate: refreshes automatically
        includeAssets: ['favicon.ico', 'maskable_icon.png', 'icon_x192.png', 'icon_x512.png'],
        manifest: {
          name: 'La Clipasa',
          short_name: 'la-clipasa',
          description: 'El mejor evento de todo Twitch International',
          start_url: '/',
          display: 'standalone',
          background_color: '#682692',
          theme_color: '#000000',
          icons: [
            {
              src: 'icon_x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icon_x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          share_target: {
            action: '/shared-resource',
            method: 'GET',
            params: {
              title: 'shared_title',
              text: 'shared_text',
              url: 'shared_url',
            },
          },
        },
        workbox: {
          // what the service worker will precache:
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,jpg}'],
          // ensure dynamic imports are also cached
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/laclipasa\.fly\.dev\/ui\/_app\/immutable\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-chunks',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
      // nodePolyfills(),
    ],
    server: {
      host: process.env.VITE_HOST || 'localhost',
      port: Number(process.env.VITE_FRONTEND_PORT) || 5143,
      strictPort: true,
      // hmr: {
      //   protocol: 'wss',
      //   clientPort: 9443,
      // },
      // https://github.com/vitest-dev/vitest/issues/4187
      ...(process.env.APP_ENV === 'dev' && {
        https: {
          key: '../certificates/localhost-key.pem',
          cert: '../certificates/localhost.pem',
        },
      }),
    },
    optimizeDeps: {
      exclude: ['react-hook-form'],
    },
    define: {
      'process.env.NODE_ENV': `"${mode}"`,
    },
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    build: {
      sourcemap: true,
      minify: 'terser',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      outDir: './build',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          // nested: resolve(__dirname, 'nested/index.html')
        },
        external: ['src/index.tsx'],
      },
      dynamicImportVarsOptions: {
        exclude: [],
      },
    },
  })
}
