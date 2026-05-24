import { NextRequest, NextResponse } from 'next/server'
import { generateSummary, analyzeReportingTrends, generateTopicHistory } from '@/lib/gemini'
import { Article } from '@/types'

// Vercel Hobby プランの最大実行時間を延長（デフォルト10秒 → 30秒）
export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が Vercel に設定されていません' }, { status: 500 })
  }

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
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/ai/summarize]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
