import { defineFunction } from '@aws-amplify/backend'

export const generateDiagram = defineFunction({
  name: 'generate-diagram',
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    MODEL_ID: 'ap.anthropic.claude-sonnet-4-5-20250929-v1:0',
  },
})
