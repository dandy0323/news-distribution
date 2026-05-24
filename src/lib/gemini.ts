import { GoogleGenerativeAI } from '@google/generative-ai'
import { Article, ReportingTrend } from '@/types'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY が設定されていません')
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

function articlesToText(articles: Article[]): string {
  return articles
    .slice(0, 10)
    .map((a, i) => `[${i + 1}] ${a.source}\nタイトル: ${a.title}\n概要: ${a.description}`)
    .join('\n\n')
}

export async function generateSummary(keyword: string, articles: Article[]): Promise<string> {
  const context = articlesToText(articles)
  const prompt = `以下は「${keyword}」に関するニュース記事の一覧です。
これらを踏まえ、トピックの現状を200〜300字で簡潔に要約してください。
箇条書きは使わず、自然な文章で書いてください。

${context}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function analyzeReportingTrends(keyword: string, articles: Article[]): Promise<ReportingTrend[]> {
  const context = articlesToText(articles)
  const prompt = `以下は「${keyword}」について複数のメディアが報じた記事です。
各メディアの報道傾向（論調・切り口・注目点）を分析してください。

${context}

以下のJSON配列のみを返してください（他のテキスト不要）:
[
  {
    "source": "メディア名",
    "tone": "positive" | "neutral" | "negative" | "critical",
    "angle": "切り口（20字以内）",
    "summary": "報道の特徴（60字以内）"
  }
]`

  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(text) as ReportingTrend[]
  } catch {
    return []
  }
}

export async function generateTopicHistory(keyword: string, articles: Article[]): Promise<string> {
  const context = articlesToText(articles)
  const prompt = `以下は「${keyword}」に関するニュース記事です。
この記事群から読み取れる出来事の経緯・背景を時系列で整理し、
「このトピックをはじめて知る読者」向けに300〜400字でまとめてください。
見出しや箇条書きは使わず、流れるような文章でお願いします。

${context}`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
