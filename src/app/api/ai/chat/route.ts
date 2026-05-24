import { NextRequest, NextResponse } from 'next/server'
import { chatWithAi } from '@/lib/gemini'
import { Article, ChatMessage } from '@/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 })
  }
  try {
    const body = await req.json() as { keyword: string; articles: Article[]; messages: ChatMessage[] }
    const { keyword, articles, messages } = body
    if (!keyword || !messages?.length) {
      return NextResponse.json({ error: 'keyword と messages は必須です' }, { status: 400 })
    }
    const reply = await chatWithAi(keyword, articles ?? [], messages)
    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/ai/chat]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
