'use client'

import { useMemo, useState } from 'react'

type Props = {
  columns: string[]
  rows: Array<Record<string, unknown>>
}

export default function DataTable({ columns, rows }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState('')
  // Continuous table (no pagination)

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows
    const f = filter.toLowerCase()
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(f))
    )
  }, [rows, filter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = a[sortKey!]
      const bv = b[sortKey!]
      if (av === bv) return 0
      return (String(av) < String(bv) ? -1 : 1) * (sortAsc ? 1 : -1)
    })
    return copy
  }, [filtered, sortKey, sortAsc])

  const paged = sorted

  const exportCsv = () => {
    const cols = columns
    const header = cols.join(',')
    const lines = paged.map((r) =>
      cols
        .map((c) => {
          const raw = r[c]
          const val = typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : String(raw ?? '')
          const escaped = '"' + val.replace(/"/g, '""') + '"'
          return escaped
        })
        .join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'table.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Filter..."
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
          }}
          className="h-8 w-full rounded-md border border-primary/15 bg-background p-2 text-xs md:w-56"
        />
        <button
          className="h-8 rounded-md border border-primary/15 bg-background px-2 text-xs hover:bg-accent"
          onClick={exportCsv}
          title="Export current page as CSV"
        >
          Export CSV
        </button>
      </div>
      <div className="max-h-[50vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="cursor-pointer border-b border-primary/15 px-2 py-1 text-left text-xs"
                  onClick={() => {
                    if (sortKey === c) setSortAsc((s) => !s)
                    else {
                      setSortKey(c)
                      setSortAsc(true)
                    }
                  }}
                >
                  {c}
                  {sortKey === c ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={i} className="odd:bg-background">
                {columns.map((c) => (
                  <td key={c} className="border-b border-primary/10 px-2 py-1 text-secondary">
                    {(() => {
                      const v = r[c]
                      return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')
                    })()}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td className="px-2 py-3 text-xs text-secondary" colSpan={columns.length}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-right text-xs text-secondary">{sorted.length} rows</div>
    </div>
  )
}


