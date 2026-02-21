import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'
import type { Schema } from '../../data/resource'

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION })
const MODEL_ID =
  process.env.MODEL_ID ?? 'anthropic.claude-sonnet-4-5-20250929-v1:0'

const SYSTEM_PROMPT = `あなたはdraw.io (mxGraph) XMLを生成する専門家です。
ユーザーの要件に基づいて、美しく読みやすいアーキテクチャ図、フローチャート、
シーケンス図、ER図などをdraw.io XML形式またはMermaid記法で生成してください。

ルール:
1. draw.io XML を出力する場合は必ず有効なmxGraph XMLを出力すること（<mxGraphModel>で始まる）
2. ノードは適切に配置し、重なりがないようにすること
3. 色やスタイルを活用して見やすくすること
4. AWSアーキテクチャ図の場合はAWSアイコンスタイルを使用
5. 日本語ラベルに対応すること
6. XMLまたはMermaidコードのみを出力し、説明文や\`\`\`コードフェンスは含めないこと

出力形式: outputType が "xml" の場合はmxGraph XML、
"mermaid" の場合はMermaid記法で出力してください。`

export const handler: Schema['generateDiagram']['functionHandler'] = async (
  event
) => {
  const { prompt, outputType = 'xml', context } = event.arguments

  const userMessage = context
    ? `前回の図のコンテキスト:\n${context}\n\n新しい要件:\n${prompt}\n\n出力形式: ${outputType}`
    : `${prompt}\n\n出力形式: ${outputType}`

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    temperature: 0.3,
  })

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  })

  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body)) as {
    content: Array<{ text: string }>
  }
  const diagramContent = result.content[0].text

  return {
    content: diagramContent,
    outputType: outputType ?? 'xml',
    timestamp: new Date().toISOString(),
  }
}
