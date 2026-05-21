import { NextRequest, NextResponse } from 'next/server'
import { generateSummary, analyzeReportingTrends, generateTopicHistory } from '@/lib/gemini'
import { Article } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { keyword: string; articles: Article[]; type: 'summary' | 'trends' | 'history' }
    const { keyword, articles, type } = body

    if (!keyword || !articles?.length) {
      return NextResponse.json({ error: 'keyword と articles は必須です' }, { status: 400 })
    }

    let result: string | object
    if (type === 'summary') {
      result = await generateSummary(keyword, articles)
    } else if (type === 'trends') {
      result = await analyzeReportingTrends(keyword, articles)
    } else if (type === 'history') {
      result = await generateTopicHistory(keyword, articles)
    } else {
      return NextResponse.json({ error: '不正なtype' }, { status: 400 })
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('[POST /api/ai/summarize]', err)
    return NextResponse.json({ error: 'AI分析に失敗しました' }, { status: 500 })
  }
}
