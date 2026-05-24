import { GoogleGenAI } from '@google/genai'
import { Article, ReportingTrend } from '@/types'

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')
  return new GoogleGenAI({ apiKey })
}

const MODEL = 'gemini-2.5-flash'

function articlesToText(articles: Article[]): string {
  return articles
    .slice(0, 10)
    .map((a, i) => `[${i + 1}] ${a.source}\nタイトル: ${a.title}\n概要: ${a.description}`)
    .join('\n\n')
}

export async function generateSummary(keyword: string, articles: Article[]): Promise<string> {
  const ai = getClient()
  const prompt = `以下は「${keyword}」に関するニュース記事の一覧です。
これらを踏まえ、トピックの現状を200〜300字で簡潔に要約してください。
箇条書きは使わず、自然な文章で書いてください。

${articlesToText(articles)}`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}

export async function analyzeReportingTrends(keyword: string, articles: Article[]): Promise<ReportingTrend[]> {
  const ai = getClient()
  const prompt = `以下は「${keyword}」について複数のメディアが報じた記事です。
各メディアの報道傾向（論調・切り口・注目点）を分析してください。

${articlesToText(articles)}

以下のJSON配列のみを返してください（他のテキスト不要）:
[
  {
    "source": "メディア名",
    "tone": "positive" | "neutral" | "negative" | "critical",
    "angle": "切り口（20字以内）",
    "summary": "報道の特徴（60字以内）"
  }
]`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const text = (response.text ?? '').replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(text) as ReportingTrend[]
  } catch {
    return []
  }
}

export async function generateTopicHistory(keyword: string, articles: Article[]): Promise<string> {
  const ai = getClient()
  const prompt = `以下は「${keyword}」に関するニュース記事です。
この記事群から読み取れる出来事の経緯・背景を時系列で整理し、
「このトピックをはじめて知る読者」向けに300〜400字でまとめてください。
見出しや箇条書きは使わず、流れるような文章でお願いします。

${articlesToText(articles)}`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}
