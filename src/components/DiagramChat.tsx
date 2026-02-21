import { useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

interface DiagramChatProps {
  onDiagramGenerated: (content: string, type: 'xml' | 'mermaid', prompt: string) => void
  currentContent: string
}

export function DiagramChat({ onDiagramGenerated, currentContent }: DiagramChatProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [outputType, setOutputType] = useState<'xml' | 'mermaid'>('xml')
  const [error, setError] = useState<string>('')

  const handleGenerate = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')

    try {
      const { data, errors } = await client.queries.generateDiagram({
        prompt: trimmed,
        outputType,
        context: currentContent || undefined,
      })

      if (errors && errors.length > 0) {
        setError(errors.map((e) => e.message).join(', '))
        return
      }

      if (data?.content) {
        onDiagramGenerated(data.content, outputType, trimmed)
        setPrompt('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e3a5f' }}>
        図を生成
      </h2>

      {/* 出力形式の選択 */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="radio"
            value="xml"
            checked={outputType === 'xml'}
            onChange={() => setOutputType('xml')}
          />
          draw.io XML
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="radio"
            value="mermaid"
            checked={outputType === 'mermaid'}
            onChange={() => setOutputType('mermaid')}
          />
          Mermaid
        </label>
      </div>

      {/* プロンプト入力 */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          currentContent
            ? '図の修正を指示してください（例: RDSをAuroraに変更して）'
            : '例: AWSの3層アーキテクチャ図を作成して。VPC内にALB、ECS、RDSを配置してください'
        }
        rows={5}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '13px',
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          outline: 'none',
          background: loading ? '#f5f5f5' : '#fff',
        }}
      />

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            background: '#fff0f0',
            border: '1px solid #ffcdd2',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#c62828',
          }}
        >
          {error}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        style={{
          background: loading || !prompt.trim() ? '#b0bec5' : '#2d6cdf',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background 0.2s',
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            生成中...
          </>
        ) : (
          <>図を生成 (Ctrl+Enter)</>
        )}
      </button>

      {currentContent && (
        <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>
          現在の図をコンテキストとして使用中。修正指示を入力できます。
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
