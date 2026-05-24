import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsByKeyword, fetchNewsByCategory, fetchTrendingTopics } from '@/lib/news'
import { Category } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const keyword = searchParams.get('q')?.trim()
  const category = searchParams.get('category') as Category | null
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  // JST (UTC+9) で解釈：例 '2026-05-22' → 2026-05-22T00:00:00+09:00 〜 2026-05-22T23:59:59+09:00
  const dateFrom = fromStr ? new Date(fromStr + 'T00:00:00+09:00') : undefined
  const dateTo = toStr ? new Date(toStr + 'T23:59:59+09:00') : undefined

  try {
    if (!keyword && (!category || category === 'すべて')) {
      const articles = await fetchTrendingTopics(dateFrom, dateTo)
      return NextResponse.json({ articles })
    }

    if (keyword) {
      const query = category && category !== 'すべて' ? `${keyword} ${category}` : keyword
      const articles = await fetchNewsByKeyword(query, 20, dateFrom, dateTo)
      return NextResponse.json({ articles })
    }

    if (category && category !== 'すべて') {
      const articles = await fetchNewsByCategory(category as Exclude<Category, 'すべて'>, 20, dateFrom, dateTo)
      return NextResponse.json({ articles })
    }

    return NextResponse.json({ articles: [] })
  } catch (err) {
    console.error('[GET /api/news/search]', err)
    return NextResponse.json({ error: 'ニュースの取得に失敗しました' }, { status: 500 })
  }
}
