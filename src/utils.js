// ─── Style helpers ───────────────────────────────────────────────────────

function getBg(style) {
  return style?.background || style?.backgroundColor || null
}

function getTextColor(style) {
  if (style?.text?.color) return style.text.color
  const bg = getBg(style)
  if (bg) return contrastColor(bg)
  return '#e0e0e0'
}

function getFontSize(fontMultiplier) {
  // MindMup fontMultiplier: 1 = ~12px, 1.25 = ~15px, 1.5 = ~18px
  const base = 12
  return Math.round(base * (fontMultiplier || 1)) + 'px'
}

function contrastColor(hex) {
  try {
    const c = hex.replace('#', '')
    const r = parseInt(c.substr(0,2), 16)
    const g = parseInt(c.substr(2,2), 16)
    const b = parseInt(c.substr(4,2), 16)
    const lum = (0.299*r + 0.587*g + 0.114*b) / 255
    return lum > 0.55 ? '#111111' : '#ffffff'
  } catch { return '#ffffff' }
}

// ─── MindMup → Mind Elixir converter ────────────────────────────────────

function convertNode(mupNode) {
  const mupStyle = mupNode.attr?.style || {}
  const bg = getBg(mupStyle)
  const textColor = getTextColor(mupStyle)
  const fontSize = getFontSize(mupStyle.fontMultiplier)

  const node = {
    id: String(mupNode.id ?? Math.random().toString(36).slice(2)),
    topic: mupNode.title || '',
    children: [],
  }

  // Build style object — only set if we have real values
  const styleObj = {}
  if (bg) styleObj.background = bg
  if (textColor) styleObj.color = textColor
  if (mupStyle.fontMultiplier && mupStyle.fontMultiplier !== 1) {
    styleObj.fontSize = fontSize
  }
  if (Object.keys(styleObj).length) node.style = styleObj

  // Recurse children, sorted by their numeric key (preserves order)
  if (mupNode.ideas && Object.keys(mupNode.ideas).length) {
    const sorted = Object.entries(mupNode.ideas)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    for (const [, child] of sorted) {
      node.children.push(convertNode(child))
    }
  }

  return node
}

function convertMindmup(mup) {
  const root = {
    id: 'root',
    topic: 'TV Shows',
    style: {
      background: '#1a1a2e',
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold',
    },
    children: [],
  }

  if (mup.ideas) {
    const sorted = Object.entries(mup.ideas)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    for (const [, child] of sorted) {
      root.children.push(convertNode(child))
    }
  }

  return { nodeData: root }
}

export { getBg, getTextColor, getFontSize, contrastColor, convertNode, convertMindmup }
