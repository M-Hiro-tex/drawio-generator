# Drawio Diagram App

## Tech Stack
- Frontend: React + Vite + TypeScript
- Backend: Amplify Gen 2 (AppSync + Lambda)
- AI: Amazon Bedrock Claude Sonnet 4.5
- Diagram: draw.io embed (iframe postMessage API)

## Commands
- `npm run dev` — ローカルフロントエンド起動
- `npx ampx sandbox` — クラウドサンドボックス起動
- `npm run build` — プロダクションビルド

## Architecture Rules
- Lambda関数は `amplify/functions/` 配下に配置
- draw.io XMLの生成はすべてBedrock Lambda経由
- フロントエンドからBedrock直接呼び出し禁止（IAM認証のため）