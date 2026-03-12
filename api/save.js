const REPO = 'vagarwalla/tv-mindmap'
const FILE = 'mindmap-assets/TV SHOWS MINDMAP MINDMUP TELEVISION'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const { data } = req.body
  if (!data) {
    return res.status(400).json({ error: 'Missing data' })
  }

  try {
    const encodedPath = encodeURIComponent(FILE)
    const apiBase = `https://api.github.com/repos/${REPO}/contents/${encodedPath}`
    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    }

    // Get current file SHA
    const metaRes = await fetch(apiBase, { headers })
    if (!metaRes.ok) throw new Error(`Failed to fetch file metadata: ${metaRes.status}`)
    const meta = await metaRes.json()

    // Base64-encode content (handles Unicode show titles)
    const content = JSON.stringify(data, null, 2)
    const b64 = Buffer.from(content, 'utf8').toString('base64')

    // Commit updated file
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: 'Update TV shows mind map via editor',
        content: b64,
        sha: meta.sha,
      }),
    })

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      throw new Error(err.message || `GitHub API error: ${putRes.status}`)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
