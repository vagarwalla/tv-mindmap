// @vitest-environment jsdom
// Tests that verify the HTML structure of index.html and edit.html is correct.
// These are regression tests — they catch structural regressions that would break
// the mind map or the search panel at runtime.

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { formatShowTopic } from './tv-search.js'

// ─── HTML file loader ─────────────────────────────────────────────────────────

function loadHtml(filename) {
  const p = resolve(import.meta.dirname, '..', filename)
  return readFileSync(p, 'utf8')
}

// ─── index.html structure ─────────────────────────────────────────────────────

describe('index.html structure', () => {
  let html

  beforeAll(() => { html = loadHtml('index.html') })

  it('contains a div#map element', () => {
    expect(html).toMatch(/<div\s+id="map"/)
  })

  it('uses mind-elixir@5.9.3 pinned CDN', () => {
    expect(html).toContain('mind-elixir@5.9.3')
  })

  it('uses MindElixirLite IIFE script (not unpinned or wrong name)', () => {
    expect(html).toContain('MindElixirLite.iife.js')
  })

  it('uses MindElixirLite CSS (not MindElixir.css)', () => {
    expect(html).toContain('MindElixirLite.css')
  })

  it('has a theme toggle button with id="themeBtn"', () => {
    expect(html).toContain('id="themeBtn"')
  })

  it('calls initTheme() in the head before body renders', () => {
    // initTheme must appear in a <script> tag inside <head>
    const headMatch = html.match(/<head>([\s\S]*?)<\/head>/)
    expect(headMatch).not.toBeNull()
    expect(headMatch[1]).toContain('initTheme()')
  })

  it('uses MindElixirLite.default as constructor — IIFE exports namespace not class', () => {
    expect(html).not.toContain('new MindElixirLite(')
    expect(html).not.toContain('new MindElixir(')
    expect(html).toContain('MindElixirLite.default')
  })
})

// ─── edit.html structure ──────────────────────────────────────────────────────

describe('edit.html structure', () => {
  let html

  beforeAll(() => { html = loadHtml('edit.html') })

  it('contains the showSearchPanel element', () => {
    expect(html).toContain('id="showSearchPanel"')
  })

  it('contains the showSearchInput element', () => {
    expect(html).toContain('id="showSearchInput"')
  })

  it('contains the addShowBtn element', () => {
    expect(html).toContain('id="addShowBtn"')
  })

  it('uses mind-elixir@5.9.3 pinned CDN', () => {
    expect(html).toContain('mind-elixir@5.9.3')
  })

  it('uses MindElixirLite IIFE script', () => {
    expect(html).toContain('MindElixirLite.iife.js')
  })

  it('uses MindElixirLite CSS', () => {
    expect(html).toContain('MindElixirLite.css')
  })

  it('uses MindElixirLite.default as constructor — IIFE exports namespace not class', () => {
    // new MindElixirLite() throws "not a constructor" — must use MindElixirLite.default
    expect(html).not.toContain('new MindElixirLite(')
    expect(html).not.toContain('new MindElixir(')
    expect(html).toContain('MindElixirLite.default')
  })

  it('calls mind.init(data) — data is NOT in the constructor call', () => {
    expect(html).toContain('mind.init(data)')
  })

  it('does not contain invalid v5 options draggable or nodeMenu', () => {
    expect(html).not.toContain('draggable: true')
    expect(html).not.toContain('nodeMenu: true')
  })

  it('has a theme toggle button with id="themeBtn"', () => {
    expect(html).toContain('id="themeBtn"')
  })

  it('calls initTheme() in the head before body renders', () => {
    const headMatch = html.match(/<head>([\s\S]*?)<\/head>/)
    expect(headMatch).not.toBeNull()
    expect(headMatch[1]).toContain('initTheme()')
  })

  it('imports tv-search.js in module script', () => {
    expect(html).toContain('tv-search.js')
  })
})

// ─── formatShowTopic (additional integration tests) ───────────────────────────

describe('formatShowTopic — additional tests', () => {
  it("formatShowTopic('Breaking Bad', []) returns 'Breaking Bad'", () => {
    expect(formatShowTopic('Breaking Bad', [])).toBe('Breaking Bad')
  })

  it("formatShowTopic('Breaking Bad', [1, 2, 3]) returns 'Breaking Bad (S1, S2, S3)'", () => {
    expect(formatShowTopic('Breaking Bad', [1, 2, 3])).toBe('Breaking Bad (S1, S2, S3)')
  })
})
