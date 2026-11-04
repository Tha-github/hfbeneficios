/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { hfSeoPlugin } from './build/seo-plugin.ts'

/*
 * BASE_PATH e SITE_URL são definidos pelo GitHub Actions a partir de actions/configure-pages,
 * o que cobre tanto <usuario>.github.io/<repositorio>/ quanto um domínio personalizado.
 */
const rawBase = process.env.BASE_PATH?.trim() ?? ''
const base = `/${rawBase.replace(/^\/+|\/+$/g, '')}/`.replace(/\/+/g, '/')
const siteUrl = (process.env.SITE_URL?.trim() || `http://localhost:4173${base}`).replace(/\/?$/, '/')

const root = import.meta.dirname

export default defineConfig({
  base,
  plugins: [react(), hfSeoPlugin({ siteUrl })],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        admin: resolve(root, 'admin/index.html'),
      },
    },
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
