'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

export type DateFilterType = 'today' | 'week' | 'custom'

export interface DateRange {
  from: string
  to: string
}

interface Props {
  value: DateFilterType
  customRange: DateRange
  onChange: (type: DateFilterType, range: DateRange) => void
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr() { return toLocalDateString(new Date()) }
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalDateString(d)
}
function weekAgoStr() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return toLocalDateString(d)
}

const PRESETS = [
  { key: 'today' as DateFilterType, label: '前日・当日' },
  { key: 'week' as DateFilterType, label: '直近1週間' },
  { key: 'custom' as DateFilterType, label: '期間指定' },
]

export default function DateFilter({ value, customRange, onChange }: Props) {
  const [localRange, setLocalRange] = useState<DateRange>(customRange)

  const handlePreset = (type: DateFilterType) => {
    if (type === 'today') {
      onChange('today', { from: yesterdayStr(), to: todayStr() })
    } else if (type === 'week') {
      onChange('week', { from: weekAgoStr(), to: todayStr() })
    } else {
      onChange('custom', localRange)
    }
  }

  const handleCustomChange = (field: 'from' | 'to', val: string) => {
    const next = { ...localRange, [field]: val }
    setLocalRange(next)
    if (next.from && next.to) onChange('custom', next)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              value === p.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {p.key === 'custom' && <Calendar size={13} />}
            {p.label}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={localRange.from}
            max={localRange.to || todayStr()}
            onChange={e => handleCustomChange('from', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">〜</span>
          <input
            type="date"
            value={localRange.to}
            min={localRange.from}
            max={todayStr()}
            onChange={e => handleCustomChange('to', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  )
}
