# drawio-generator
DRawio MCP Serverツールを使用したDrawio描画用のシステム

# Drawio MCP 図生成アプリ — Amplify デプロイガイド

## アーキテクチャ概要

ユーザーが自然言語で図の説明を入力すると、Claude（Bedrock経由）がdraw.io XML/Mermaidを生成し、フロントエンドでdraw.ioの図としてレンダリング・編集可能にするWebアプリです。

```
┌─────────────────────────────────────────────────────────────────┐
│  Amplify Hosting (React + Vite)                                 │
│  ┌───────────────┐  ┌──────────────────────────────────────┐    │
│  │ チャットUI     │  │ draw.io Embed Viewer (iframe)        │    │
│  │ (入力フォーム) │→ │ 生成されたXML/Mermaidを表示・編集可能 │    │
│  └───────┬───────┘  └──────────────────────────────────────┘    │
│          │ GraphQL (AppSync)                                     │
└──────────┼───────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│  Amplify Data (AppSync + Lambda)             │
│  ┌────────────────────────────────────────┐  │
│  │ generateDiagram (Custom Query)          │  │
│  │  → Lambda Function                      │  │
│  │    1. ユーザーの指示を受け取る            │  │
│  │    2. Bedrock Claude を呼び出し           │  │
│  │    3. draw.io XML/Mermaid を生成          │  │
│  │    4. レスポンスとして返す                 │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ Amazon Bedrock                          │  │
│  │  Claude Sonnet 4.5                      │  │
│  │  (図生成に特化したシステムプロンプト)     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 技術選定の根拠

| 要素 | 選定 | 根拠・出典 |
|------|------|-----------|
| フロントエンド | React + Vite | ユーザー指定 |
| ホスティング | AWS Amplify Gen 2 | Next.js 12-15 SSR対応、React SPAも対応（[AWS Amplify Hosting Docs](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html), 2025年更新） |
| API | Amplify Data (AppSync GraphQL) | カスタムクエリでLambdaをハンドラとして呼び出し可能（[Amplify Gen 2 Docs - Custom queries](https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/), 2025年2月更新） |
| バックエンド | Amplify Functions (Lambda) | `defineFunction`でTypeScript Lambda定義、Bedrockとの接続に最適（[Amplify Gen 2 Docs - Functions](https://docs.amplify.aws/react/build-a-backend/functions/set-up-function/), 2025年3月更新） |
| AIモデル | Amazon Bedrock Claude Sonnet 4.5 | AWS内完結、IAM認証でAPIキー不要（[Amplify Gen 2 - Bedrock連携ガイド](https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/connect-bedrock/), 2025年更新） |
| 図表示 | draw.io Embed (iframe) | draw.ioはiframe埋め込みモードをサポート、XMLから直接レンダリング可能 |
| 図生成方式 | Claude → XML/Mermaid直接生成 | MCPサーバーのHTTPトランスポートをLambdaに載せるのはまだ課題が多い（[ranthebuilder.cloud](https://www.ranthebuilder.cloud/post/mcp-server-on-aws-lambda), 2025年7月）。代わりにClaudeにdraw.io XMLを直接生成させる方がシンプルかつ安定 |

---

## なぜ「MCPサーバーをAmplifyにそのままホスト」ではないのか

重要な設計判断があります。Drawio MCPサーバー（`drawio-mcp-server` by lgazo）は以下の制約があります:

1. **ブラウザ拡張が必須**: MCPサーバーはWebSocketでブラウザ拡張経由のdraw.ioデスクトップアプリと通信する設計（[GitHub - lgazo/drawio-mcp-server](https://github.com/lgazo/drawio-mcp-server), 2025年）
2. **Lambda上のMCPはまだ不安定**: AWS Lambda上でのMCP HTTPサーバー運用は「DX・コールドスタート・セッション管理に課題あり」と報告されている（[ranthebuilder.cloud](https://www.ranthebuilder.cloud/post/mcp-server-on-aws-lambda), 2025年7月）
3. **セッション管理の制約**: ステートフルMCPサーバーのスケーリングには、公式SDKがまだ外部セッション永続化（Redis/DynamoDB）をサポートしていない（[aws-samples/sample-serverless-mcp-servers](https://github.com/aws-samples/sample-serverless-mcp-servers), 2025年5月）

**推奨アプローチ**: MCPプロトコルを介さず、Claudeに直接draw.io XML（mxGraph形式）やMermaidを生成させ、フロントエンドのdraw.io埋め込みビューワーでレンダリングする。これにより:
- MCPサーバーの運用コスト・複雑性を排除
- Lambda 1関数で完結
- draw.ioの全機能（エクスポート、編集）をフロントエンドで利用可能

---

## プロジェクト構成

```
drawio-diagram-app/
├── amplify/
│   ├── backend.ts                    # バックエンド定義
│   ├── data/
│   │   └── resource.ts               # AppSync スキーマ + カスタムクエリ
│   ├── functions/
│   │   └── generate-diagram/
│   │       ├── resource.ts            # Lambda定義
│   │       └── handler.ts             # Bedrock呼び出し + XML生成ロジック
│   └── auth/
│       └── resource.ts                # Cognito認証 (任意)
├── src/
│   ├── App.tsx                        # メインアプリ
│   ├── components/
│   │   ├── DiagramChat.tsx            # チャット入力UI
│   │   ├── DiagramViewer.tsx          # draw.io iframe埋め込み
│   │   └── DiagramHistory.tsx         # 生成履歴
│   ├── hooks/
│   │   └── useGenerateDiagram.ts      # Amplify Data clientフック
│   └── main.tsx
├── index.html
├── vite.config.ts
├── package.json
├── amplify.yml                        # ビルド設定
└── tsconfig.json
```

---

## 実装手順

### Step 1: プロジェクト初期化

```bash
# React + Vite プロジェクト作成
npm create vite@latest drawio-diagram-app -- --template react-ts
cd drawio-diagram-app

# Amplify Gen 2 初期化
npm create amplify@latest
# → 既存プロジェクトに追加

# 必要パッケージ
npm install aws-amplify @aws-amplify/ui-react
```

### Step 2: バックエンド — Lambda関数定義

**`amplify/functions/generate-diagram/resource.ts`**:
```typescript
import { defineFunction } from '@aws-amplify/backend';

export const generateDiagram = defineFunction({
  name: 'generate-diagram',
  timeoutSeconds: 60,  // Claudeの応答時間を考慮
  memoryMB: 512,
});
```

**`amplify/functions/generate-diagram/handler.ts`**:
```typescript
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { Schema } from '../../data/resource';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0';

const SYSTEM_PROMPT = `あなたはdraw.io (mxGraph) XMLを生成する専門家です。
ユーザーの要件に基づいて、美しく読みやすいアーキテクチャ図、フローチャート、
シーケンス図、ER図などをdraw.io XML形式で生成してください。

ルール:
1. 必ず有効なmxGraph XMLを出力すること（<mxGraphModel>で始まる）
2. ノードは適切に配置し、重なりがないようにすること
3. 色やスタイルを活用して見やすくすること
4. AWSアーキテクチャ図の場合はAWSアイコンスタイルを使用
5. 日本語ラベルに対応すること
6. XMLのみを出力し、説明文は含めないこと

出力形式: outputType が "xml" の場合はmxGraph XML、
"mermaid" の場合はMermaid記法で出力してください。`;

export const handler: Schema['generateDiagram']['functionHandler'] =
  async (event) => {
    const { prompt, outputType = 'xml', context } = event.arguments;

    const userMessage = context
      ? `前回の図のコンテキスト:\n${context}\n\n新しい要件:\n${prompt}`
      : prompt;

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3,  // 構造化出力なので低めに
    });

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const diagramContent = result.content[0].text;

    return {
      content: diagramContent,
      outputType,
      timestamp: new Date().toISOString(),
    };
  };
```

### Step 3: AppSync スキーマ定義

**`amplify/data/resource.ts`**:
```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateDiagram } from '../functions/generate-diagram/resource';

const schema = a.schema({
  // カスタムクエリ: 図の生成
  generateDiagram: a
    .query()
    .arguments({
      prompt: a.string().required(),
      outputType: a.enum(['xml', 'mermaid']),
      context: a.string(),  // 前回の図XMLを渡して修正指示に使う
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
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
```

### Step 4: バックエンド統合 + Bedrock IAMポリシー

**`amplify/backend.ts`**:
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { generateDiagram } from './functions/generate-diagram/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  data,
  generateDiagram,
});

// Lambda に Bedrock 呼び出し権限を付与
const generateDiagramLambda = backend.generateDiagram.resources.lambda;
generateDiagramLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:*::foundation-model/${
        'anthropic.claude-sonnet-4-5-20250929-v1:0'
      }`,
    ],
  })
);
```

### Step 5: フロントエンド — draw.io ビューワー

**`src/components/DiagramViewer.tsx`**:
```tsx
import { useState, useRef, useEffect } from 'react';

interface DiagramViewerProps {
  xmlContent: string;
  outputType: 'xml' | 'mermaid';
}

export function DiagramViewer({ xmlContent, outputType }: DiagramViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // draw.io の埋め込みモードURL
  const getDrawioUrl = () => {
    if (outputType === 'xml') {
      // XMLを圧縮してURLに埋め込む
      const encoded = encodeURIComponent(xmlContent);
      return `https://embed.diagrams.net/?edit=_blank&layers=1&nav=1#R${encoded}`;
    }
    // Mermaidの場合はdraw.ioのMermaid変換機能を使う
    return `https://embed.diagrams.net/?edit=_blank&layers=1&nav=1`;
  };

  // draw.io の postMessage API で図を送信
  useEffect(() => {
    if (!xmlContent || !iframeRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'ready') {
        // draw.io エディタが準備完了
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            action: 'load',
            xml: xmlContent,
          }),
          '*'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [xmlContent]);

  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid #ccc' }}>
      {xmlContent ? (
        <iframe
          ref={iframeRef}
          src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Diagram Viewer"
        />
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#888'
        }}>
          図を生成すると、ここに表示されます
        </div>
      )}
    </div>
  );
}
```

**`src/components/DiagramChat.tsx`**:
```tsx
import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface DiagramChatProps {
  onDiagramGenerated: (content: string, type: 'xml' | 'mermaid') => void;
}

export function DiagramChat({ onDiagramGenerated }: DiagramChatProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [outputType, setOutputType] = useState<'xml' | 'mermaid'>('xml');
  const [previousXml, setPreviousXml] = useState<string>('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const { data, errors } = await client.queries.generateDiagram({
        prompt,
        outputType,
        context: previousXml || undefined,
      });

      if (errors) {
        console.error('Errors:', errors);
        return;
      }

      if (data?.content) {
        onDiagramGenerated(data.content, outputType);
        setPreviousXml(data.content);  // 修正指示用に保持
      }
    } catch (error) {
      console.error('Generate failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <label>
          <input
            type="radio"
            value="xml"
            checked={outputType === 'xml'}
            onChange={() => setOutputType('xml')}
          /> draw.io XML
        </label>
        <label style={{ marginLeft: '16px' }}>
          <input
            type="radio"
            value="mermaid"
            checked={outputType === 'mermaid'}
            onChange={() => setOutputType('mermaid')}
          /> Mermaid
        </label>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="例: AWSの3層アーキテクチャ図を作成して。VPC内にALB、ECS、RDS を配置し、CloudFrontを前段に置いてください"
        rows={4}
        style={{ width: '100%', padding: '8px' }}
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? '生成中...' : '図を生成'}
      </button>
    </div>
  );
}
```

### Step 6: ビルド設定

**`amplify.yml`**:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 7: デプロイ

```bash
# ローカル開発（サンドボックス）
npx ampx sandbox

# Git リポジトリにプッシュして Amplify コンソールからデプロイ
git add .
git commit -m "Initial drawio diagram app"
git push origin main

# Amplify コンソール → Create new app → GitHub → リポジトリ選択 → Deploy
```

### MCP サーバーを Claude Code に追加して開発補助

ローカル開発時にdraw.io MCPサーバーをClaude Codeに接続して、生成されるXMLの品質検証に活用できます:

```bash
# Claude Code に drawio MCP を追加
claude mcp add drawio --scope project -- npx -y @drawio/mcp
```

これにより、Claude Codeが生成したdraw.io XMLをローカルで即座にプレビュー・検証できます（開発補助用であり、本番アプリのアーキテクチャには含みません）。

---

## Bedrock モデルアクセスの有効化

Amplify デプロイ前に、Bedrock コンソールでモデルアクセスを有効にする必要があります:

1. AWS コンソール → Amazon Bedrock → Model access
2. `Anthropic` → `Claude Sonnet 4.5` を有効化（リージョン確認: `us-east-1` or `us-west-2` 推奨）
3. Amplify アプリのリージョンと Bedrock モデルのリージョンを一致させる

---

## コスト見積もり

| 項目 | 無料枠 | 超過時の目安 |
|------|--------|-------------|
| Amplify Hosting | 5GB/月ストレージ、15GB/月転送量 | $0.023/GB |
| Amplify Build | 1000分/月 | $0.01/分 |
| Lambda | 100万リクエスト/月 + 40万GB秒 | $0.20/100万リクエスト |
| AppSync | 25万クエリ/月 | $4.00/100万クエリ |
| Bedrock (Claude Sonnet 4.5) | なし | 入力 $3/100万トークン、出力 $15/100万トークン |

図1枚あたりの生成コスト目安: 入力約1000トークン + 出力約3000トークンとして、約 **$0.05/回** 程度。

---

## 発展的な拡張

1. **Cognito認証追加**: ユーザーごとの生成履歴管理
2. **S3エクスポート**: 生成した図をPNG/SVGとしてS3に保存
3. **ストリーミング応答**: Bedrock のストリーミングAPIを使い、生成中にプログレス表示
4. **テンプレート機能**: よく使うアーキテクチャパターンのプリセット
5. **draw.io MCPサーバー連携（将来）**: AWS ECS上にMCPサーバーを配置してステートフルな図編集セッションを実現（現時点ではステートフルMCPのスケーリング課題により非推奨）