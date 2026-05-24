import { NextRequest, NextResponse } from 'next/server'

// サーバーサイドのメモリキャッシュ（プロセス再起動でリセット）
const cache = new Map<string, string | null>()

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ imageUrl: null })

  if (cache.has(url)) return NextResponse.json({ imageUrl: cache.get(url) ?? null })

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsCuration/1.0)',
        'Accept': 'text/html',
      },
    })
    clearTimeout(timer)
    const html = await res.text()

    // og:image を2パターンで抽出
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    const imageUrl = match?.[1]?.trim() ?? null

    cache.set(url, imageUrl)
    return NextResponse.json({ imageUrl })
  } catch {
    cache.set(url, null)
    return NextResponse.json({ imageUrl: null })
  }
}
