// CDN smoke tests — run in Node environment (no jsdom, no mocked fetch)
// These tests catch the exact failure that kept breaking the page:
// an unpinned CDN silently updated and renamed the global export.
// @vitest-environment node
import { describe, it, expect } from 'vitest'

const IIFE_URL = 'https://cdn.jsdelivr.net/npm/mind-elixir@5.9.3/dist/MindElixirLite.iife.js'
const CSS_URL  = 'https://cdn.jsdelivr.net/npm/mind-elixir@5.9.3/dist/MindElixirLite.css'

describe('CDN smoke tests', () => {
  it('pinned IIFE resolves with HTTP 200', async () => {
    const res = await fetch(IIFE_URL)
    expect(res.ok).toBe(true)
  }, 10000)

  it('pinned CSS resolves with HTTP 200', async () => {
    const res = await fetch(CSS_URL)
    expect(res.ok).toBe(true)
  }, 10000)

  it('IIFE exports MindElixirLite (not MindElixir) as the global name', async () => {
    const res = await fetch(IIFE_URL)
    const text = await res.text()
    expect(text.startsWith('var MindElixirLite=')).toBe(true)
  }, 10000)

  it('IIFE does not export the old MindElixir global name', async () => {
    const res = await fetch(IIFE_URL)
    const text = await res.text()
    expect(text.startsWith('var MindElixir=')).toBe(false)
  }, 10000)

  it('IIFE contains the SIDE constant', async () => {
    const res = await fetch(IIFE_URL)
    const text = await res.text()
    expect(text).toContain('.SIDE=')
  }, 10000)
})
