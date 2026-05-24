import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsByKeyword, fetchNewsByCategory, fetchTrendingTopics } from '@/lib/news'
import { Category } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const keyword = searchParams.get('q')?.trim()
  const category = searchParams.get('category') as Category | null
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const dateFrom = fromStr ? new Date(fromStr) : undefined
  const dateTo = toStr ? (() => { const d = new Date(toStr); d.setHours(23, 59, 59, 999); return d })() : undefined

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
