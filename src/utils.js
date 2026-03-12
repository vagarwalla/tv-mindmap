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

// ─── Mind Elixir → MindMup converter (for saving) ───────────────────────────

function fontSizeToMultiplier(fontSize) {
  // Reverse of getFontSize: '15px' → 1.25, '18px' → 1.5, etc.
  if (!fontSize) return 1
  const px = parseFloat(fontSize)
  return Math.round((px / 12) * 4) / 4 // round to nearest 0.25
}

function convertMeNode(meNode, index) {
  const node = {
    id: isNaN(Number(meNode.id)) ? meNode.id : Number(meNode.id),
    title: meNode.topic || '',
    ideas: {},
    attr: { style: {} },
  }

  const s = meNode.style || {}
  if (s.background) node.attr.style.background = s.background
  if (s.color && s.color !== contrastColor(s.background || '')) node.attr.style['text'] = { color: s.color }
  if (s.fontSize) {
    const m = fontSizeToMultiplier(s.fontSize)
    if (m !== 1) node.attr.style.fontMultiplier = m
  }
  if (!Object.keys(node.attr.style).length) delete node.attr

  if (meNode.children?.length) {
    meNode.children.forEach((child, i) => {
      node.ideas[String(i + 1)] = convertMeNode(child, i + 1)
    })
  }

  return node
}

function convertToMindmup(meData) {
  const root = meData.nodeData
  const mup = {
    id: 'root',
    formatVersion: 3,
    ideas: {},
  }

  if (root.children?.length) {
    root.children.forEach((child, i) => {
      mup.ideas[String(i + 1)] = convertMeNode(child, i + 1)
    })
  }

  return mup
}

export { getBg, getTextColor, getFontSize, contrastColor, convertNode, convertMindmup, convertToMindmup, fontSizeToMultiplier }
