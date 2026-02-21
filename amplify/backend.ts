import { defineBackend } from '@aws-amplify/backend'
import { data } from './data/resource'
import { generateDiagram } from './functions/generate-diagram/resource'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam'

const backend = defineBackend({
  data,
  generateDiagram,
})

// Lambda に Bedrock 呼び出し権限を付与
const generateDiagramLambda = backend.generateDiagram.resources.lambda

generateDiagramLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0`,
    ],
  })
)
