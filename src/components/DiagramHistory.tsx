interface DiagramEntry {
  id: string
  prompt: string
  content: string
  outputType: 'xml' | 'mermaid'
  timestamp: string
}

interface DiagramHistoryProps {
  history: DiagramEntry[]
  onSelect: (entry: DiagramEntry) => void
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function DiagramHistory({ history, onSelect }: DiagramHistoryProps) {
  if (history.length === 0) {
    return (
      <div style={{ color: '#bbb', fontSize: '13px', textAlign: 'center', paddingTop: '16px' }}>
        履歴はまだありません
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#888', fontWeight: 600 }}>
        生成履歴 ({history.length})
      </h3>
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry)}
          style={{
            background: 'none',
            border: '1px solid #eee',
            borderRadius: '6px',
            padding: '8px 10px',
            textAlign: 'left',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0f4ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#333',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.prompt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                background: entry.outputType === 'xml' ? '#e3f0ff' : '#f3e8ff',
                color: entry.outputType === 'xml' ? '#2d6cdf' : '#7c3aed',
                borderRadius: '3px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {entry.outputType === 'xml' ? 'XML' : 'Mermaid'}
            </span>
            <span style={{ fontSize: '10px', color: '#bbb' }}>{formatTimestamp(entry.timestamp)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
