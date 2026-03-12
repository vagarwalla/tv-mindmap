// @vitest-environment jsdom
// Integration tests using the REAL MindElixirLite library (v5).
// These tests would have caught every API breaking change that caused the blank page:
//   - data moved from constructor to init(data)
//   - draggable/nodeMenu options removed
//   - expandAll/collapseAll renamed to expandNodeAll(el, bool)
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import MindElixirLite from 'mind-elixir'
import { convertMindmup } from './utils.js'
import { loadMindMap, makeToggleAll } from './init.js'

// jsdom doesn't implement matchMedia — mock it so MindElixirLite can construct
beforeAll(() => {
  window.matchMedia = window.matchMedia || vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const SAMPLE_MUP = {
  id: 'root',
  formatVersion: 3,
  ideas: {
    '1': {
      id: 1, title: 'Drama',
      attr: { style: { background: '#00ccff', fontMultiplier: 1.25 } },
      ideas: {
        '1': { id: 2, title: 'Breaking Bad' },
        '2': { id: 3, title: 'Succession' },
      },
    },
    '2': { id: 4, title: 'Comedy' },
  },
}

// ─── MindElixirLite v5 API contract ──────────────────────────────────────────
// If any of these fail after a library update, the page will break.

describe('MindElixirLite v5 API contract', () => {
  it('exports a constructor function', () => {
    expect(typeof MindElixirLite).toBe('function')
  })

  it('SIDE constant is a number', () => {
    expect(typeof MindElixirLite.SIDE).toBe('number')
  })

  it('init() requires data argument — throws or errors without it', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const me = new MindElixirLite({ el, direction: MindElixirLite.SIDE })
    // init() with no args throws (JSON.parse fails) rather than gracefully returning
    expect(() => me.init()).toThrow()
  })

  it('init(data) with valid nodeData does not return an Error', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const me = new MindElixirLite({ el, direction: MindElixirLite.SIDE })
    expect(me.init(convertMindmup(SAMPLE_MUP))).not.toBeInstanceOf(Error)
  })

  it('constructor silently ignores data — proves data must go to init()', () => {
    // Passing data to constructor is the v3 pattern that silently does nothing in v5
    const el = document.createElement('div')
    document.body.appendChild(el)
    const me = new MindElixirLite({ el, direction: MindElixirLite.SIDE, data: convertMindmup(SAMPLE_MUP) })
    // init() without data still throws — proving the constructor data was ignored
    expect(() => me.init()).toThrow()
  })

  it('expandNodeAll exists (replaces v3 expandAll)', () => {
    expect(typeof MindElixirLite.prototype.expandNodeAll).toBe('function')
  })

  it('expandAll does NOT exist (v3 method removed in v5)', () => {
    expect(MindElixirLite.prototype.expandAll).toBeUndefined()
  })

  it('collapseAll does NOT exist (v3 method removed in v5)', () => {
    expect(MindElixirLite.prototype.collapseAll).toBeUndefined()
  })

  it('findEle exists and is needed to get nodes for expandNodeAll', () => {
    expect(typeof MindElixirLite.prototype.findEle).toBe('function')
  })

  it('scale and toCenter exist', () => {
    expect(typeof MindElixirLite.prototype.scale).toBe('function')
    expect(typeof MindElixirLite.prototype.toCenter).toBe('function')
  })

  it('getData exists', () => {
    expect(typeof MindElixirLite.prototype.getData).toBe('function')
  })
})

// ─── loadMindMap with real MindElixirLite ─────────────────────────────────────

describe('loadMindMap integration', () => {
  let mapEl

  beforeEach(() => {
    mapEl = document.createElement('div')
    document.body.appendChild(mapEl)
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(SAMPLE_MUP) })
    )
  })

  it('returns a MindElixirLite instance', async () => {
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
    expect(mind).toBeInstanceOf(MindElixirLite)
  })

  it('returned instance has all methods used by the page', async () => {
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
    expect(typeof mind.expandNodeAll).toBe('function')
    expect(typeof mind.findEle).toBe('function')
    expect(typeof mind.toCenter).toBe('function')
    expect(typeof mind.scale).toBe('function')
    expect(typeof mind.getData).toBe('function')
  })

  it('getData() returns the root topic after init', async () => {
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
    expect(mind.getData().nodeData.topic).toBe('TV Shows')
  })

  it('getData() returns correct top-level children', async () => {
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
    const topics = mind.getData().nodeData.children.map(c => c.topic)
    expect(topics).toContain('Drama')
    expect(topics).toContain('Comedy')
  })

  it('getData() preserves nested children', async () => {
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
    const drama = mind.getData().nodeData.children.find(c => c.topic === 'Drama')
    expect(drama.children.map(c => c.topic)).toEqual(['Breaking Bad', 'Succession'])
  })
})

// ─── makeToggleAll with v5 API ────────────────────────────────────────────────

describe('makeToggleAll integration (v5 expandNodeAll API)', () => {
  let mind, btn, mapEl

  beforeEach(async () => {
    mapEl = document.createElement('div')
    document.body.appendChild(mapEl)
    btn = document.createElement('button')
    btn.textContent = 'Expand All'
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(SAMPLE_MUP) })
    )
    mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MindElixirLite, mapEl })
  })

  it('toggle expand calls expandNodeAll on root node', () => {
    const spy = vi.spyOn(mind, 'expandNodeAll')
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    expect(spy).toHaveBeenCalledWith(expect.anything(), true)
  })

  it('toggle collapse calls expandNodeAll with false on second call', () => {
    const spy = vi.spyOn(mind, 'expandNodeAll')
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    toggle()
    expect(spy).toHaveBeenCalledWith(expect.anything(), false)
  })

  it('updates button text on expand', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    expect(btn.textContent).toBe('Collapse All')
  })

  it('updates button text on collapse', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    toggle()
    expect(btn.textContent).toBe('Expand All')
  })
})
