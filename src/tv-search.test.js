import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchShows, getSeasons, formatShowTopic } from './tv-search.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchOnce(data, status = 200) {
  return vi.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    })
  )
}

function mockFetchReject(err) {
  return vi.fn(() => Promise.reject(err instanceof Error ? err : new Error(err)))
}

const SAMPLE_SEARCH_RESULTS = [
  {
    score: 20,
    show: {
      id: 169,
      name: 'Breaking Bad',
      premiered: '2008-01-20',
      network: { name: 'AMC' },
      webChannel: null,
      image: { medium: 'https://example.com/bb_medium.jpg', original: 'https://example.com/bb.jpg' },
      summary: '<p>A chemistry teacher turned drug lord.</p>',
    },
  },
  {
    score: 15,
    show: {
      id: 999,
      name: 'Breaking Point',
      premiered: '2020-05-01',
      network: null,
      webChannel: { name: 'Netflix' },
      image: null,
      summary: '',
    },
  },
]

const SAMPLE_SEASONS = [
  { id: 1, number: 1, episodeCount: 7, premiereDate: '2008-01-20', name: '' },
  { id: 2, number: 2, episodeCount: 13, premiereDate: '2009-03-08', name: 'Season 2' },
  { id: 3, number: 3, episodeCount: 13, premiereDate: '2010-03-21', name: '' },
]

// ─── searchShows ──────────────────────────────────────────────────────────────

describe('searchShows', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns correctly shaped results for each show', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEARCH_RESULTS)
    const results = await searchShows('breaking bad')
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      id: '169',
      name: 'Breaking Bad',
      year: '2008',
      network: 'AMC',
      image: 'https://example.com/bb_medium.jpg',
      source: 'tvmaze',
    })
  })

  it('uses webChannel name when network is null', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEARCH_RESULTS)
    const results = await searchShows('breaking point')
    expect(results[1].network).toBe('Netflix')
  })

  it('returns empty string for image when show has no image', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEARCH_RESULTS)
    const results = await searchShows('breaking point')
    expect(results[1].image).toBe('')
  })

  it('returns [] on network failure (does not throw)', async () => {
    // Primary and fallback both fail
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))  // primary
      .mockRejectedValueOnce(new Error('Network error'))  // fallback
    const results = await searchShows('anything')
    expect(results).toEqual([])
  })

  it('returns [] when primary returns non-OK status and fallback also fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({}) })
    const results = await searchShows('bad-show')
    expect(results).toEqual([])
  })

  it('falls back to singlesearch when primary throws and returns shaped result', async () => {
    const singleShow = {
      id: 42,
      name: 'Single Show',
      premiered: '2015-03-10',
      network: { name: 'HBO' },
      webChannel: null,
      image: { medium: 'https://example.com/img.jpg', original: null },
    }
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))           // primary fails
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(singleShow) })
    const results = await searchShows('single show')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('42')
    expect(results[0].name).toBe('Single Show')
    expect(results[0].network).toBe('HBO')
  })

  it('calls the TVMaze search endpoint with the encoded query', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEARCH_RESULTS)
    await searchShows('breaking bad')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.tvmaze.com/search/shows?q=breaking%20bad'
    )
  })
})

// ─── getSeasons ───────────────────────────────────────────────────────────────

describe('getSeasons', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns correctly shaped seasons', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEASONS)
    const seasons = await getSeasons(169)
    expect(seasons).toHaveLength(3)
    expect(seasons[0]).toMatchObject({ number: 1, episodeCount: 7, name: '' })
    expect(seasons[1]).toMatchObject({ number: 2, episodeCount: 13, name: 'Season 2' })
  })

  it('returns null episodeCount when missing from API', async () => {
    const seasonWithoutCount = [{ id: 1, number: 1, premiereDate: '2020-01-01', name: '' }]
    global.fetch = mockFetchOnce(seasonWithoutCount)
    const seasons = await getSeasons(999)
    expect(seasons[0].episodeCount).toBeNull()
  })

  it('returns [] on network failure (does not throw)', async () => {
    global.fetch = mockFetchReject('Network down')
    const seasons = await getSeasons(169)
    expect(seasons).toEqual([])
  })

  it('returns [] when API returns non-OK status', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve([]) })
    )
    const seasons = await getSeasons(99999)
    expect(seasons).toEqual([])
  })

  it('calls the correct TVMaze seasons endpoint', async () => {
    global.fetch = mockFetchOnce(SAMPLE_SEASONS)
    await getSeasons(169)
    expect(fetch).toHaveBeenCalledWith('https://api.tvmaze.com/shows/169/seasons')
  })
})

// ─── formatShowTopic ──────────────────────────────────────────────────────────

describe('formatShowTopic', () => {
  it('returns just the name when seasons array is empty', () => {
    expect(formatShowTopic('Breaking Bad', [])).toBe('Breaking Bad')
  })

  it('returns just the name when seasons is undefined', () => {
    expect(formatShowTopic('Breaking Bad', undefined)).toBe('Breaking Bad')
  })

  it('returns just the name when seasons is null', () => {
    expect(formatShowTopic('Breaking Bad', null)).toBe('Breaking Bad')
  })

  it('formats a single season correctly', () => {
    expect(formatShowTopic('Breaking Bad', [1])).toBe('Breaking Bad (S1)')
  })

  it('formats multiple seasons as S1, S2, S3', () => {
    expect(formatShowTopic('Breaking Bad', [1, 2, 3])).toBe('Breaking Bad (S1, S2, S3)')
  })

  it('handles non-consecutive seasons', () => {
    expect(formatShowTopic('My Show', [1, 3, 5])).toBe('My Show (S1, S3, S5)')
  })

  it('preserves the season order as given', () => {
    expect(formatShowTopic('Test Show', [3, 1, 2])).toBe('Test Show (S3, S1, S2)')
  })
})
