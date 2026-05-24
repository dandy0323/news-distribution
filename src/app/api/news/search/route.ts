import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsByKeyword, fetchNewsByCategory, fetchTrendingTopics } from '@/lib/news'
import { Category } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const keyword = searchParams.get('q')?.trim()
  const category = searchParams.get('category') as Category | null
  // YYYY-MM-DD 文字列のままフィルタ関数に渡す（JST日付文字列比較）
  const fromStr = searchParams.get('from') ?? undefined
  const toStr = searchParams.get('to') ?? undefined

  try {
    if (!keyword && (!category || category === 'すべて')) {
      const articles = await fetchTrendingTopics(fromStr, toStr)
      return NextResponse.json({ articles })
    }

    if (keyword) {
      const query = category && category !== 'すべて' ? `${keyword} ${category}` : keyword
      const articles = await fetchNewsByKeyword(query, 20, fromStr, toStr)
      return NextResponse.json({ articles })
    }

    if (category && category !== 'すべて') {
      const articles = await fetchNewsByCategory(category as Exclude<Category, 'すべて'>, 20, fromStr, toStr)
      return NextResponse.json({ articles })
    }

    return NextResponse.json({ articles: [] })
  } catch (err) {
    console.error('[GET /api/news/search]', err)
    return NextResponse.json({ error: 'ニュースの取得に失敗しました' }, { status: 500 })
  }
}
