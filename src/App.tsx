import { useState } from 'react'
import { DiagramChat } from './components/DiagramChat'
import { DiagramViewer } from './components/DiagramViewer'
import { DiagramHistory } from './components/DiagramHistory'

interface DiagramEntry {
  id: string
  prompt: string
  content: string
  outputType: 'xml' | 'mermaid'
  timestamp: string
}

function App() {
  const [currentContent, setCurrentContent] = useState<string>('')
  const [currentOutputType, setCurrentOutputType] = useState<'xml' | 'mermaid'>('xml')
  const [history, setHistory] = useState<DiagramEntry[]>([])

  const handleDiagramGenerated = (
    content: string,
    outputType: 'xml' | 'mermaid',
    prompt: string
  ) => {
    setCurrentContent(content)
    setCurrentOutputType(outputType)

    const entry: DiagramEntry = {
      id: Date.now().toString(),
      prompt,
      content,
      outputType,
      timestamp: new Date().toISOString(),
    }
    setHistory((prev) => [entry, ...prev])
  }

  const handleSelectHistory = (entry: DiagramEntry) => {
    setCurrentContent(entry.content)
    setCurrentOutputType(entry.outputType)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <header
        style={{
          background: '#1e3a5f',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="#2d6cdf" />
          <rect x="6" y="8" width="8" height="6" rx="1" fill="white" />
          <rect x="18" y="8" width="8" height="6" rx="1" fill="white" />
          <rect x="6" y="18" width="8" height="6" rx="1" fill="white" />
          <rect x="18" y="18" width="8" height="6" rx="1" fill="white" />
          <line x1="14" y1="11" x2="18" y2="11" stroke="white" strokeWidth="1.5" />
          <line x1="16" y1="14" x2="16" y2="18" stroke="white" strokeWidth="1.5" />
          <line x1="14" y1="21" x2="18" y2="21" stroke="white" strokeWidth="1.5" />
        </svg>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Drawio Diagram Generator
          </h1>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Powered by Amazon Bedrock Claude
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左サイドバー: チャット + 履歴 */}
        <aside
          style={{
            width: '380px',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
            <DiagramChat
              onDiagramGenerated={handleDiagramGenerated}
              currentContent={currentContent}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <DiagramHistory history={history} onSelect={handleSelectHistory} />
          </div>
        </aside>

        {/* メイン: draw.io ビューワー */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <DiagramViewer xmlContent={currentContent} outputType={currentOutputType} />
        </main>
      </div>
    </div>
  )
}

export default App
