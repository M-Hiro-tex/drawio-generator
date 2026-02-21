import { useState } from 'react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

interface GenerateOptions {
  prompt: string
  outputType?: 'xml' | 'mermaid'
  context?: string
}

interface GenerateResult {
  content: string
  outputType: string
  timestamp: string
}

export function useGenerateDiagram() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)

  const generate = async (options: GenerateOptions): Promise<GenerateResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, errors } = await client.queries.generateDiagram({
        prompt: options.prompt,
        outputType: options.outputType ?? 'xml',
        context: options.context,
      })

      if (errors && errors.length > 0) {
        const msg = errors.map((e) => e.message).join(', ')
        setError(msg)
        return null
      }

      if (!data?.content) {
        setError('レスポンスにコンテンツが含まれていません')
        return null
      }

      const res: GenerateResult = {
        content: data.content,
        outputType: data.outputType ?? options.outputType ?? 'xml',
        timestamp: data.timestamp ?? new Date().toISOString(),
      }
      setResult(res)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { generate, loading, error, result }
}
