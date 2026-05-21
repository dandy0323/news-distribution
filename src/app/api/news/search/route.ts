import { NextRequest, NextResponse } from 'next/server'
import { fetchNewsByKeyword, fetchNewsByCategory, fetchTrendingTopics } from '@/lib/news'
import { Category } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const keyword = searchParams.get('q')?.trim()
  const category = searchParams.get('category') as Category | null

  try {
    if (!keyword && (!category || category === 'すべて')) {
      const articles = await fetchTrendingTopics()
      return NextResponse.json({ articles })
    }

    if (keyword) {
      const query = category && category !== 'すべて' ? `${keyword} ${category}` : keyword
      const articles = await fetchNewsByKeyword(query)
      return NextResponse.json({ articles })
    }

    if (category && category !== 'すべて') {
      const articles = await fetchNewsByCategory(category as Exclude<Category, 'すべて'>)
      return NextResponse.json({ articles })
    }

    return NextResponse.json({ articles: [] })
  } catch (err) {
    console.error('[GET /api/news/search]', err)
    return NextResponse.json({ error: 'ニュースの取得に失敗しました' }, { status: 500 })
  }
}
