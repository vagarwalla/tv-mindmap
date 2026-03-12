// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadMindMap, makeToggleAll } from './init.js'

// ─── Mock MindElixir class ────────────────────────────────────────────────────

function makeMockMindElixir() {
  const instance = {
    init: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    scale: vi.fn(),
    toCenter: vi.fn(),
  }
  const MockClass = vi.fn(() => instance)
  MockClass.SIDE = 2
  MockClass._instance = instance
  return MockClass
}

// ─── Minimal MindMup fixture ──────────────────────────────────────────────────

const SAMPLE_MUP = {
  id: 'root',
  formatVersion: 3,
  ideas: {
    '1': { id: 1, title: 'Drama', ideas: {
      '1': { id: 2, title: 'Breaking Bad' },
      '2': { id: 3, title: 'Succession' },
    }},
    '2': { id: 4, title: 'Comedy', attr: { style: { background: '#ffcc00' } } },
  },
}

function mockFetch(data) {
  return vi.fn(() => Promise.resolve({
    json: () => Promise.resolve(data),
  }))
}

// ─── loadMindMap ─────────────────────────────────────────────────────────────

describe('loadMindMap', () => {
  let MockMindElixir
  let mapEl

  beforeEach(() => {
    MockMindElixir = makeMockMindElixir()
    mapEl = document.createElement('div')
    mapEl.id = 'map'
    document.body.appendChild(mapEl)
  })

  it('fetches the mindmap data from the given URL', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data/mindmap', MindElixirClass: MockMindElixir, mapEl })
    expect(fetch).toHaveBeenCalledWith('/data/mindmap')
  })

  it('instantiates MindElixir with the map element', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(MockMindElixir).toHaveBeenCalledWith(
      expect.objectContaining({ el: mapEl })
    )
  })

  it('passes MindElixirClass.SIDE as the direction', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(MockMindElixir).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 2 })
    )
  })

  it('passes converted mindmap data with a root node', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    const { data } = MockMindElixir.mock.calls[0][0]
    expect(data.nodeData.id).toBe('root')
    expect(data.nodeData.topic).toBe('TV Shows')
  })

  it('passes converted children for top-level ideas', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    const { data } = MockMindElixir.mock.calls[0][0]
    const topics = data.nodeData.children.map(c => c.topic)
    expect(topics).toContain('Drama')
    expect(topics).toContain('Comedy')
  })

  it('recursively converts nested children', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    const { data } = MockMindElixir.mock.calls[0][0]
    const drama = data.nodeData.children.find(c => c.topic === 'Drama')
    expect(drama.children.map(c => c.topic)).toEqual(['Breaking Bad', 'Succession'])
  })

  it('calls mind.init() to render the map', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(MockMindElixir._instance.init).toHaveBeenCalledOnce()
  })

  it('returns the mind instance', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    const mind = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(mind).toBe(MockMindElixir._instance)
  })

  it('renders an error message in the map element when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(mapEl.innerHTML).toContain('Failed to load mind map')
    expect(mapEl.innerHTML).toContain('Network error')
  })

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
    const result = await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(result).toBeNull()
  })

  it('renders an error message when JSON is malformed', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      json: () => Promise.reject(new Error('Unexpected token')),
    }))
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(mapEl.innerHTML).toContain('Unexpected token')
  })

  it('does not call MindElixir constructor when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('404')))
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    expect(MockMindElixir).not.toHaveBeenCalled()
  })

  it('accepts a CSS selector string for mapEl', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('oops')))
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl: '#map' })
    // Error message should land in the #map div
    expect(document.getElementById('map').innerHTML).toContain('oops')
  })

  it('preserves node colours from the MindMup file', async () => {
    global.fetch = mockFetch(SAMPLE_MUP)
    await loadMindMap({ fetchUrl: '/data', MindElixirClass: MockMindElixir, mapEl })
    const { data } = MockMindElixir.mock.calls[0][0]
    const comedy = data.nodeData.children.find(c => c.topic === 'Comedy')
    expect(comedy.style?.background).toBe('#ffcc00')
  })
})

// ─── makeToggleAll ────────────────────────────────────────────────────────────

describe('makeToggleAll', () => {
  let mind
  let btn

  beforeEach(() => {
    mind = { expandAll: vi.fn(), collapseAll: vi.fn() }
    btn = document.createElement('button')
    btn.textContent = 'Expand All'
  })

  it('does nothing when mind is not yet ready', () => {
    const toggle = makeToggleAll(() => null, () => btn)
    expect(() => toggle()).not.toThrow()
    expect(btn.textContent).toBe('Expand All')
  })

  it('calls expandAll and updates button text on first call', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    expect(mind.expandAll).toHaveBeenCalledOnce()
    expect(btn.textContent).toBe('Collapse All')
  })

  it('calls collapseAll and reverts button text on second call', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    toggle()
    expect(mind.collapseAll).toHaveBeenCalledOnce()
    expect(btn.textContent).toBe('Expand All')
  })

  it('alternates correctly across multiple calls', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle(); toggle(); toggle()
    expect(mind.expandAll).toHaveBeenCalledTimes(2)
    expect(mind.collapseAll).toHaveBeenCalledTimes(1)
    expect(btn.textContent).toBe('Collapse All')
  })

  it('never calls collapse before first expand', () => {
    const toggle = makeToggleAll(() => mind, () => btn)
    toggle()
    expect(mind.collapseAll).not.toHaveBeenCalled()
  })

  it('each toggle instance has independent state', () => {
    const btn2 = document.createElement('button')
    const toggle1 = makeToggleAll(() => mind, () => btn)
    const toggle2 = makeToggleAll(() => mind, () => btn2)
    toggle1()
    expect(btn.textContent).toBe('Collapse All')
    expect(btn2.textContent).toBe('Expand All') // toggle2 not called yet
  })
})
