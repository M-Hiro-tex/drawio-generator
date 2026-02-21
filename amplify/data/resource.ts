import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { generateDiagram } from '../functions/generate-diagram/resource'

const schema = a.schema({
  // カスタムクエリ: 図の生成
  generateDiagram: a
    .query()
    .arguments({
      prompt: a.string().required(),
      outputType: a.enum(['xml', 'mermaid']),
      context: a.string(),
    })
    .returns(
      a.customType({
        content: a.string().required(),
        outputType: a.string().required(),
        timestamp: a.string().required(),
      })
    )
    .handler(a.handler.function(generateDiagram))
    .authorization((allow) => [allow.publicApiKey()]),

  // 生成履歴の保存 (任意)
  DiagramHistory: a
    .model({
      prompt: a.string().required(),
      content: a.string().required(),
      outputType: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
})
