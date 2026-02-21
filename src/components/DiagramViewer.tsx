import { useRef, useEffect, useState } from 'react'

interface DiagramViewerProps {
  xmlContent: string
  outputType: 'xml' | 'mermaid'
}

export function DiagramViewer({ xmlContent, outputType }: DiagramViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeReady, setIframeReady] = useState(false)

  // draw.io の postMessage API で図を送信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'ready') {
        setIframeReady(true)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (!xmlContent || !iframeRef.current || !iframeReady) return

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({
        action: 'load',
        xml: xmlContent,
      }),
      '*'
    )
  }, [xmlContent, iframeReady])

  // iframeがリロードされたらreadyフラグをリセット
  const handleIframeLoad = () => {
    setIframeReady(false)
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <div
        style={{
          padding: '8px 16px',
          background: '#f8f8f8',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#555',
        }}
      >
        <span>プレビュー</span>
        {xmlContent && (
          <>
            <span style={{ color: '#bbb' }}>|</span>
            <span
              style={{
                background: outputType === 'xml' ? '#2d6cdf' : '#7c3aed',
                color: '#fff',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
              }}
            >
              {outputType === 'xml' ? 'draw.io XML' : 'Mermaid'}
            </span>
          </>
        )}
      </div>

      {/* iframe / プレースホルダー */}
      <div style={{ flex: 1, position: 'relative' }}>
        {xmlContent ? (
          <iframe
            ref={iframeRef}
            src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&hide-pages=1"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Diagram Viewer"
            onLoad={handleIframeLoad}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#aaa',
              gap: '16px',
            }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect x="10" y="10" width="24" height="18" rx="3" stroke="#ccc" strokeWidth="2" fill="none" />
              <rect x="46" y="10" width="24" height="18" rx="3" stroke="#ccc" strokeWidth="2" fill="none" />
              <rect x="28" y="52" width="24" height="18" rx="3" stroke="#ccc" strokeWidth="2" fill="none" />
              <line x1="34" y1="19" x2="46" y2="19" stroke="#ccc" strokeWidth="2" />
              <line x1="40" y1="28" x2="40" y2="52" stroke="#ccc" strokeWidth="2" />
            </svg>
            <p style={{ margin: 0, fontSize: '15px' }}>
              左のチャットから図を生成してください
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
              例: 「AWSの3層アーキテクチャ図を作成して」
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
