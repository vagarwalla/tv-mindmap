/**
 * TV Show search utilities using the TVMaze API (free, no key required).
 */

/**
 * Search for TV shows by name.
 * @param {string} query
 * @returns {Promise<Array<{id: string, name: string, year: string, network: string, image: string, source: string}>>}
 */
export async function searchShows(query) {
  try {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TVMaze search error: ${res.status}`)
    const results = await res.json()
    return results.map(({ show }) => ({
      id: String(show.id),
      name: show.name || '',
      year: show.premiered ? show.premiered.slice(0, 4) : '',
      network: show.network?.name || show.webChannel?.name || '',
      image: show.image?.medium || show.image?.original || '',
      source: 'tvmaze',
    }))
  } catch (primaryErr) {
    // Fallback: try singlesearch
    try {
      const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`
      const res = await fetch(url)
      if (!res.ok) return []
      const show = await res.json()
      return [{
        id: String(show.id),
        name: show.name || '',
        year: show.premiered ? show.premiered.slice(0, 4) : '',
        network: show.network?.name || show.webChannel?.name || '',
        image: show.image?.medium || show.image?.original || '',
        source: 'tvmaze',
      }]
    } catch {
      return []
    }
  }
}

/**
 * Get seasons for a show by its TVMaze show ID.
 * @param {string|number} showId
 * @returns {Promise<Array<{number: number, episodeCount: number|null, name: string}>>}
 */
export async function getSeasons(showId) {
  try {
    const url = `https://api.tvmaze.com/shows/${showId}/seasons`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`TVMaze seasons error: ${res.status}`)
    const seasons = await res.json()
    return seasons.map(s => ({
      number: s.number,
      episodeCount: s.episodeCount ?? null,
      name: s.name || '',
    }))
  } catch {
    return []
  }
}

/**
 * Format a show topic string for the mind map.
 * If seasons is empty, returns just the show name.
 * Otherwise returns "Show Name (S1, S2, S3)".
 * @param {string} showName
 * @param {number[]} seasons  - array of season numbers (already sorted)
 * @returns {string}
 */
export function formatShowTopic(showName, seasons) {
  if (!seasons || seasons.length === 0) return showName
  const label = seasons.map(n => `S${n}`).join(', ')
  return `${showName} (${label})`
}
