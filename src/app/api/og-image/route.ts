import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, string | null>()

async function extractOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
    })
    clearTimeout(timer)
    const html = await res.text()

    // og:image（複数パターン）
    const imgUrl =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      // twitter:image もフォールバックで試みる
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1] ??
      null

    if (!imgUrl) return null

    // 相対URLを絶対URLに変換
    if (imgUrl.startsWith('//')) return `https:${imgUrl}`
    if (imgUrl.startsWith('/')) {
      const base = new URL(url)
      return `${base.origin}${imgUrl}`
    }
    return imgUrl
  } catch {
    return null
  }
}

// Wikipedia画像APIで関連写真を検索（無料・キー不要）
async function fetchWikipediaImage(keyword: string): Promise<string | null> {
  // タイトルから最初の意味のある部分を抽出（長すぎると検索精度が落ちる）
  const query = keyword.replace(/[「」『』【】（）()]/g, '').slice(0, 20).trim()
  const langs = ['ja', 'en']

  for (const lang of langs) {
    try {
      const encoded = encodeURIComponent(query)
      const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&format=json&pithumbsize=400&origin=*`
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'NewsCuration/1.0 (news curation service)' },
      })
      const data = await res.json() as {
        query?: { pages?: Record<string, { thumbnail?: { source: string }; missing?: string }> }
      }
      const pages = data.query?.pages
      if (!pages) continue
      const page = Object.values(pages)[0]
      if (page && !('missing' in page) && page.thumbnail?.source) {
        return page.thumbnail.source
      }
    } catch {
      continue
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const keyword = req.nextUrl.searchParams.get('keyword') ?? ''
  if (!url) return NextResponse.json({ imageUrl: null })

  const cacheKey = url
  if (cache.has(cacheKey)) return NextResponse.json({ imageUrl: cache.get(cacheKey) ?? null })

  // 1. 記事ページのOGイメージを試みる
  let imageUrl = await extractOgImage(url)

  // 2. OGイメージが取れなければWikipedia画像検索にフォールバック
  if (!imageUrl && keyword) {
    imageUrl = await fetchWikipediaImage(keyword)
  }

  cache.set(cacheKey, imageUrl)
  return NextResponse.json({ imageUrl })
}
