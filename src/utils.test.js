import { describe, it, expect } from 'vitest'
import { getBg, getTextColor, getFontSize, contrastColor, convertNode, convertMindmup, convertToMindmup, fontSizeToMultiplier } from './utils.js'

// ─── getBg ───────────────────────────────────────────────────────────────────

describe('getBg', () => {
  it('returns background when present', () => {
    expect(getBg({ background: '#ff0000' })).toBe('#ff0000')
  })

  it('returns backgroundColor as fallback', () => {
    expect(getBg({ backgroundColor: '#00ff00' })).toBe('#00ff00')
  })

  it('prefers background over backgroundColor', () => {
    expect(getBg({ background: '#ff0000', backgroundColor: '#00ff00' })).toBe('#ff0000')
  })

  it('returns null when neither is present', () => {
    expect(getBg({})).toBeNull()
  })

  it('returns null for undefined style', () => {
    expect(getBg(undefined)).toBeNull()
  })

  it('returns null for null style', () => {
    expect(getBg(null)).toBeNull()
  })
})

// ─── contrastColor ───────────────────────────────────────────────────────────

describe('contrastColor', () => {
  it('returns dark text for a light background', () => {
    expect(contrastColor('#ffffff')).toBe('#111111') // white bg → dark text
  })

  it('returns light text for a dark background', () => {
    expect(contrastColor('#000000')).toBe('#ffffff') // black bg → light text
  })

  it('returns light text for a dark blue', () => {
    expect(contrastColor('#1a1a2e')).toBe('#ffffff')
  })

  it('returns dark text for yellow (high luminance)', () => {
    expect(contrastColor('#ffff00')).toBe('#111111')
  })

  it('returns #ffffff for an unparseable value', () => {
    expect(contrastColor('notacolor')).toBe('#ffffff')
  })

  it('handles hex without leading #', () => {
    // The function does hex.replace('#','') so passing without # should still work
    // 'ffffff' → c = 'ffffff' → r=255, g=255, b=255 → lum ~1 → dark text
    expect(contrastColor('ffffff')).toBe('#111111')
  })

  it('threshold is 0.55 — mid-grey returns light text', () => {
    // #808080 → r=128, g=128, b=128
    // lum = (0.299*128 + 0.587*128 + 0.114*128)/255 = 128/255 ≈ 0.502 → ≤ 0.55 → white
    expect(contrastColor('#808080')).toBe('#ffffff')
  })

  it('returns dark text for near-white (#e0e0e0)', () => {
    // lum = 0.878 → dark
    expect(contrastColor('#e0e0e0')).toBe('#111111')
  })
})

// ─── getFontSize ─────────────────────────────────────────────────────────────

describe('getFontSize', () => {
  it('returns 12px for multiplier 1', () => {
    expect(getFontSize(1)).toBe('12px')
  })

  it('returns 15px for multiplier 1.25', () => {
    expect(getFontSize(1.25)).toBe('15px')
  })

  it('returns 18px for multiplier 1.5', () => {
    expect(getFontSize(1.5)).toBe('18px')
  })

  it('defaults to 12px when multiplier is falsy', () => {
    expect(getFontSize(0)).toBe('12px')
    expect(getFontSize(null)).toBe('12px')
    expect(getFontSize(undefined)).toBe('12px')
  })

  it('rounds to nearest pixel', () => {
    // 12 * 1.3 = 15.6 → rounds to 16
    expect(getFontSize(1.3)).toBe('16px')
  })
})

// ─── getTextColor ─────────────────────────────────────────────────────────────

describe('getTextColor', () => {
  it('returns explicit text.color when set', () => {
    expect(getTextColor({ text: { color: '#ff00ff' } })).toBe('#ff00ff')
  })

  it('returns contrast of background when no text.color', () => {
    expect(getTextColor({ background: '#ffffff' })).toBe('#111111')
    expect(getTextColor({ background: '#000000' })).toBe('#ffffff')
  })

  it('returns default grey when no background and no text color', () => {
    expect(getTextColor({})).toBe('#e0e0e0')
  })

  it('returns default grey for undefined style', () => {
    expect(getTextColor(undefined)).toBe('#e0e0e0')
  })

  it('prefers text.color over background-derived contrast', () => {
    expect(getTextColor({ background: '#ffffff', text: { color: '#aabbcc' } })).toBe('#aabbcc')
  })
})

// ─── convertNode ─────────────────────────────────────────────────────────────

describe('convertNode', () => {
  it('converts a minimal node', () => {
    const node = convertNode({ id: '1', title: 'Drama' })
    expect(node.id).toBe('1')
    expect(node.topic).toBe('Drama')
    expect(node.children).toEqual([])
  })

  it('uses empty string for missing title', () => {
    const node = convertNode({ id: '2' })
    expect(node.topic).toBe('')
  })

  it('generates an id when none is given', () => {
    const node = convertNode({ title: 'No ID' })
    expect(typeof node.id).toBe('string')
    expect(node.id.length).toBeGreaterThan(0)
  })

  it('sets only default color when no style attributes are present', () => {
    const node = convertNode({ id: '3', title: 'Plain' })
    // getTextColor always returns a value (default '#e0e0e0'), so style is always set
    expect(node.style).toEqual({ color: '#e0e0e0' })
    expect(node.style?.background).toBeUndefined()
    expect(node.style?.fontSize).toBeUndefined()
  })

  it('sets background in style when present', () => {
    const node = convertNode({ id: '4', title: 'Colored', attr: { style: { background: '#ff0000' } } })
    expect(node.style?.background).toBe('#ff0000')
  })

  it('sets fontSize in style only when fontMultiplier !== 1', () => {
    const withMultiplier = convertNode({ id: '5', title: 'Big', attr: { style: { fontMultiplier: 1.5 } } })
    expect(withMultiplier.style?.fontSize).toBe('18px')

    const defaultMultiplier = convertNode({ id: '6', title: 'Normal', attr: { style: { fontMultiplier: 1 } } })
    expect(defaultMultiplier.style?.fontSize).toBeUndefined()
  })

  it('recursively converts children in sorted order', () => {
    const node = convertNode({
      id: '10',
      title: 'Parent',
      ideas: {
        '3': { id: 'c', title: 'Third' },
        '1': { id: 'a', title: 'First' },
        '2': { id: 'b', title: 'Second' },
      },
    })
    expect(node.children.map(c => c.topic)).toEqual(['First', 'Second', 'Third'])
  })

  it('handles fractional idea keys in sorted order', () => {
    const node = convertNode({
      id: '20',
      title: 'Root',
      ideas: {
        '-1': { id: 'neg', title: 'Negative' },
        '0.5': { id: 'half', title: 'Half' },
        '2': { id: 'two', title: 'Two' },
      },
    })
    expect(node.children.map(c => c.topic)).toEqual(['Negative', 'Half', 'Two'])
  })

  it('handles deeply nested children', () => {
    const node = convertNode({
      id: '30',
      title: 'L1',
      ideas: {
        '1': {
          id: '31',
          title: 'L2',
          ideas: {
            '1': { id: '32', title: 'L3' },
          },
        },
      },
    })
    expect(node.children[0].children[0].topic).toBe('L3')
  })

  it('sets color using contrast when background is provided', () => {
    const node = convertNode({ id: '40', title: 'Dark', attr: { style: { background: '#000000' } } })
    expect(node.style?.color).toBe('#ffffff')
  })

  it('coerces numeric ids to strings', () => {
    const node = convertNode({ id: 42, title: 'Numeric' })
    expect(node.id).toBe('42')
  })
})

// ─── convertMindmup ──────────────────────────────────────────────────────────

describe('convertMindmup', () => {
  it('returns nodeData with a fixed root node', () => {
    const result = convertMindmup({})
    expect(result.nodeData.id).toBe('root')
    expect(result.nodeData.topic).toBe('TV Shows')
  })

  it('root node always has the expected style', () => {
    const { nodeData } = convertMindmup({})
    expect(nodeData.style).toMatchObject({
      background: '#1a1a2e',
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold',
    })
  })

  it('produces empty children for an empty mup', () => {
    const { nodeData } = convertMindmup({})
    expect(nodeData.children).toEqual([])
  })

  it('converts top-level ideas into root children', () => {
    const { nodeData } = convertMindmup({
      ideas: {
        '1': { id: 'a', title: 'Comedy' },
        '2': { id: 'b', title: 'Drama' },
      },
    })
    expect(nodeData.children).toHaveLength(2)
    expect(nodeData.children.map(c => c.topic)).toEqual(['Comedy', 'Drama'])
  })

  it('sorts top-level ideas by numeric key', () => {
    const { nodeData } = convertMindmup({
      ideas: {
        '10': { id: 'z', title: 'Z' },
        '2':  { id: 'b', title: 'B' },
        '1':  { id: 'a', title: 'A' },
      },
    })
    expect(nodeData.children.map(c => c.topic)).toEqual(['A', 'B', 'Z'])
  })

  it('wraps the result in { nodeData }', () => {
    const result = convertMindmup({})
    expect(Object.keys(result)).toEqual(['nodeData'])
  })

  it('handles a realistic multi-level structure', () => {
    const { nodeData } = convertMindmup({
      ideas: {
        '1': {
          id: 'drama',
          title: 'Drama',
          attr: { style: { background: '#1a1a2e' } },
          ideas: {
            '1': { id: 'bb', title: 'Breaking Bad' },
            '2': { id: 'sw', title: 'Succession' },
          },
        },
      },
    })
    const drama = nodeData.children[0]
    expect(drama.topic).toBe('Drama')
    expect(drama.children.map(c => c.topic)).toEqual(['Breaking Bad', 'Succession'])
  })
})
