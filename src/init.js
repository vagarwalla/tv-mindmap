import { convertMindmup } from './utils.js'

const MIND_ELIXIR_OPTIONS = {
  contextMenu: false,
  toolBar: false,
  keypress: true,
  theme: {
    name: 'dark',
    palette: [
      '#00ccff', '#40e0d0', '#6b8e23', '#33CCCC',
      '#ee82ee', '#ffc0cb', '#99cc00', '#C0C0C0',
    ],
    cssVar: {
      '--main-color':         '#ffffff',
      '--main-bgcolor':       '#1a1a2e',
      '--color':              '#e0e0e0',
      '--bgcolor':            '#1e1e2e',
      '--panel-color':        '#f0f0f0',
      '--panel-bgcolor':      '#2a2a3e',
      '--panel-border-color': '#444',
      '--selected-color':     '#ffffff',
      '--selected-bgcolor':   '#4a4a7a',
      '--line-color':         '#555577',
      '--line-width':         '2px',
      '--root-color':         '#ffffff',
      '--root-bgcolor':       '#1a1a2e',
      '--root-radius':        '8px',
      '--radius':             '5px',
    },
  },
}

/**
 * Fetch mindmap data and initialise Mind Elixir.
 * Returns the mind instance on success, or null on failure (also renders error into mapEl).
 */
export async function loadMindMap({ fetchUrl, MindElixirClass, mapEl }) {
  if (typeof MindElixirClass !== 'function') {
    const msg = `MindElixirClass is not a constructor (got ${typeof MindElixirClass}). ` +
      `Check that the CDN script loaded and the correct global name is used.`
    const el = typeof mapEl === 'string' ? document.querySelector(mapEl) : mapEl
    if (el) el.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#c55;font-size:0.9rem;">
        Could not load MindElixirLite from CDN. Check your network connection.
      </div>`
    throw new Error(msg)
  }

  try {
    const r = await fetch(fetchUrl)
    const mup = await r.json()
    const data = convertMindmup(mup)

    const mind = new MindElixirClass({
      el: mapEl,
      direction: MindElixirClass.SIDE,
      ...MIND_ELIXIR_OPTIONS,
    })
    mind.init(data)
    return mind
  } catch (err) {
    const el = typeof mapEl === 'string' ? document.querySelector(mapEl) : mapEl
    if (el) {
      el.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#555;font-size:0.9rem;">
          Failed to load mind map: ${err.message}
        </div>`
    }
    return null
  }
}

/**
 * Returns a toggleAll function bound to a mind instance getter and a button element getter.
 * Keeping the state inside the closure makes it easy to test in isolation.
 */
export function makeToggleAll(getMind, getBtnEl) {
  let allExpanded = false
  return function toggleAll() {
    const mind = getMind()
    if (!mind) return
    allExpanded = !allExpanded
    // v5 API: expandNodeAll(element, expandedBool) replaces expandAll()/collapseAll()
    mind.expandNodeAll(mind.findEle('root'), allExpanded)
    getBtnEl().textContent = allExpanded ? 'Collapse All' : 'Expand All'
  }
}
