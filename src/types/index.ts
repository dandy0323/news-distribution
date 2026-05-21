export type Category =
  | 'すべて'
  | '政治'
  | '経済'
  | '社会'
  | 'テクノロジー'
  | 'エンタメ'
  | 'スポーツ'
  | '国際'
  | '科学'

export interface Article {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string
  description: string
  imageUrl?: string
  category?: Category
  topicId?: string
}

export interface Topic {
  id: string
  keyword: string
  category?: Category
  articleCount: number
  latestAt: string
  description?: string
}

export interface ReportingTrend {
  source: string
  tone: 'positive' | 'neutral' | 'negative' | 'critical'
  angle: string
  summary: string
}

export interface AiAnalysis {
  summary?: string
  trends?: ReportingTrend[]
  history?: string
}

export interface BrowsingHistoryItem {
  keyword: string
  topicId: string
  visitedAt: string
  category?: Category
}
