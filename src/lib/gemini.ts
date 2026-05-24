import { GoogleGenAI } from '@google/genai'
import { Article, ReportingTrend, TopicHistory, OutlookItem, ChatMessage } from '@/types'

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')
  return new GoogleGenAI({ apiKey })
}

const MODEL = 'gemini-2.5-flash'

function articlesToText(articles: Article[]): string {
  return articles
    .slice(0, 10)
    .map((a, i) => `[${i + 1}] ${a.source}\nタイトル: ${a.title}\n概要: ${a.description}\nURL: ${a.url}`)
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

const DAY_JP = ['日', '月', '火', '水', '木', '金', '土']

function todayJp(): string {
  const d = new Date()
  const day = DAY_JP[d.getDay()]
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}(${day})`
}

export async function generateTopicHistory(keyword: string, articles: Article[]): Promise<TopicHistory> {
  const ai = getClient()
  const prompt = `以下は「${keyword}」に関するニュース記事です（本日: ${todayJp()}）。
記事の内容をもとに、以下のJSON形式のみで回答してください（他のテキスト不要）。

{
  "timeline": [
    {
      "date": "yyyy/m/d(aaa) 形式。犯行・会見など時刻が重要な場合は yyyy/m/d(aaa) HH:MM も可",
      "event": "その日の出来事を80字以内で具体的に記述",
      "url": "その経緯に最も関連する記事URLを1つ（下記記事一覧から選択。不明なら省略）"
    }
  ],
  "cause": "事件なら動機、事故なら発生原因、政策なら背景事情を150字以内。不明なら「現時点では詳細不明」",
  "scheduleOutlook": [
    {
      "date": "今後の具体的な予定日・期日。yyyy/m/d(aaa) 形式",
      "event": "予定・決定済みの動向を60字以内で記述（確定情報のみ）"
    }
  ],
  "forecastOutlook": "今後の方向性の予測（推測）と、誰・何への影響を200字以内で記述。推測である旨がわかる表現を使うこと"
}

timelineは5〜8項目（古い順）。scheduleOutlookは確定している予定のみ（不明な場合は空配列）。

${articlesToText(articles)}`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  const text = (response.text ?? '').replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(text) as TopicHistory
  } catch {
    return {
      timeline: [],
      cause: '解析に失敗しました',
      scheduleOutlook: [] as OutlookItem[],
      forecastOutlook: '解析に失敗しました',
    }
  }
}

export async function chatWithAi(
  keyword: string,
  articles: Article[],
  messages: ChatMessage[],
): Promise<string> {
  const ai = getClient()
  const context = articlesToText(articles)
  const history = messages
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n')

  const prompt = `あなたはニュースアナリストです。「${keyword}」に関する以下の記事情報をもとに、ユーザーの質問に日本語で回答してください。

【記事情報】
${context}

【会話履歴】
${history}

上記の会話を踏まえ、最後のユーザーの質問に対して200字以内で簡潔に回答してください。`

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt })
  return response.text ?? ''
}
