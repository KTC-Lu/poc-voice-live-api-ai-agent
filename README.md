# POC Voice Live API AI Agent

音声を使って Azure OpenAI Realtime API と対話するレンタカー予約システムのプロトタイプ（POC）です。ブラウザから WebRTC を使って Azure OpenAI に直接接続し、リアルタイムでの音声対話を実現します。

## 🎯 概要

このアプリケーションは、以下の機能を提供します：

- **音声対話**: ブラウザのマイクを使用してAIエージェントと日本語で対話
- **レンタカー予約**: AIエージェントがレンタカーの予約手続きをサポート
- **リアルタイム処理**: WebRTC を使用した低遅延の音声通信
- **関数呼び出し**: AIが必要に応じてバックエンドAPI（店舗検索、空車確認、予約作成など）を呼び出し
- **フォールバック機能**: Cosmos DB が利用できない場合はサンプルデータで動作
- **MCP 統合**: Azure Functions ベースの MCP (Model Context Protocol) サーバーサポート

## 🚀 クイックスタート

### 前提条件

- Node.js 18.x 以上
- Azure OpenAI リソース（Realtime API 対応）

### セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd poc-voice-live-api-ai-agent
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **環境変数の設定**

   `.env.local.example` を `.env.local` にコピーして必要な値を設定：

   ```bash
   cp .env.local.example .env.local
   ```

   **必須の環境変数：**
   ```
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
   AZURE_OPENAI_API_KEY=<your-api-key>
   ```

   **オプションの環境変数：**
   ```
   AZURE_OPENAI_DEPLOYMENT=gpt-realtime
   NEXT_PUBLIC_AZURE_OPENAI_REGION=eastus2

   # Cosmos DB（設定しない場合はサンプルデータを使用）
   COSMOS_ENDPOINT=<cosmos-endpoint>
   COSMOS_KEY=<cosmos-key>
   COSMOS_DB=rentacar-db
   COSMOS_LOCATIONS_CONTAINER=locations
   ```

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

5. **ブラウザでアクセス**

   http://localhost:3000/realtime にアクセスして音声対話を開始

## 📱 使用方法

1. `/realtime` ページにアクセス
2. 「Start」ボタンをクリックしてマイクアクセスを許可
3. AIエージェント（レンタカー予約オペレーター）と日本語で対話
4. レンタカーの予約手続きを進める

### 対話の流れ

AIエージェントが以下の手順で予約をサポートします：

1. 利用場所の確認
2. 利用日時のヒアリング
3. 車種の確認
4. 空車状況の確認
5. 予約の登録

## 🏗️ アーキテクチャ

### ディレクトリ構成

```
app/
├── api/
│   ├── functions/           # AI が呼び出す機能エンドポイント
│   │   ├── create_reservation/
│   │   ├── get_availability/
│   │   ├── get_reservation_status/
│   │   └── list_locations/
│   └── realtime/session/    # Azure Realtime セッション作成
├── realtime/               # 音声対話UI
├── layout.tsx
└── page.tsx

lib/
└── cosmosClient.ts         # Cosmos DB クライアント

azure-functions-mcp-managed-id/  # Azure Functions MCP サーバー (オプション)
├── function_app.py         # MCP トリガーとHTTPトリガーの定義
├── functions/
│   ├── mcpTriggers/
│   │   └── rentacar_mcp.py # レンタカー機能のMCP実装
│   └── httpTriggers/
├── dataset/rentacar/       # サンプルデータとインポートスクリプト
└── infra/                  # Azure インフラ用 Bicep テンプレート
```

### データフロー

1. **セッション作成**: クライアントが `/api/realtime/session` でAzureセッションを作成
2. **WebRTC接続**: ブラウザとAzure間で音声ストリーミング接続を確立
3. **音声処理**: ユーザーの音声 → Azure AI → 機能呼び出し → レスポンス → 音声合成
4. **機能実行**: AIが必要に応じてローカルAPI（店舗検索、予約作成など）を呼び出し

## 🛠️ 開発

### 利用可能なコマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm start        # 本番サーバー起動
npm run lint     # ESLint実行
```

### API エンドポイント

- `GET /api/realtime/session` - Azure Realtime セッション作成
- `POST /api/functions/list_locations` - 店舗一覧取得
- `POST /api/functions/get_availability` - 空車状況確認
- `POST /api/functions/create_reservation` - 予約作成
- `POST /api/functions/get_reservation_status` - 予約状況確認

### 技術スタック

- **フロントエンド**: Next.js 14+, React 18.2, TypeScript
- **音声技術**: WebRTC, Web Audio API
- **AI**: Azure OpenAI Realtime API (GPT Realtime)
- **データベース**: Azure Cosmos DB (オプション)
- **デプロイ**: Next.js アプリケーション

## 🔧 Azure Functions MCP サーバー (オプション)

このプロジェクトには、Azure Functions ベースの MCP (Model Context Protocol) サーバーが含まれています。これは Next.js アプリケーションの代替として、またはより高度な機能のために使用できます。

### 特徴

- **Azure Functions**: Python 3.11 ベースのサーバーレス実装
- **MCP Protocol**: Claude Code や他の MCP クライアントと連携可能
- **Cosmos DB 統合**: Azure Cosmos DB との直接連携
- **マネージド ID**: セキュアな認証機能
- **Infrastructure as Code**: Bicep テンプレートによる自動デプロイ

### MCP ツール

| ツール名 | 説明 | パラメータ |
|---------|------|-----------|
| `list_rentacar_locations` | 店舗一覧取得 | なし |
| `get_rentacar_availability` | 空車状況確認 | locationId*, startDate*, endDate*, vehicleType? |
| `create_rentacar_reservation` | 予約作成 | locationId*, startDate*, endDate*, customerName*, vehicleType*, vehicleId?, customerContact? |
| `get_rentacar_reservation_status` | 予約状況確認 | customerName* |

### セットアップ (Azure Functions MCP)

1. **Azure Functions Core Tools のインストール**
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

2. **Python 依存関係のインストール**
   ```bash
   cd azure-functions-mcp-managed-id
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1  # Windows
   pip install -r requirements.txt
   ```

3. **環境変数の設定**

   `.env` ファイルを作成して以下を設定：
   ```
   COSMOS_ENDPOINT=<cosmos-endpoint>
   COSMOS_KEY=<cosmos-key>
   COSMOS_DB=rentacar-db
   COSMOS_LOCATIONS_CONTAINER=locations
   COSMOS_RESERVATIONS_CONTAINER=reservations
   ```

4. **サンプルデータのインポート**
   ```bash
   python .\dataset\rentacar\import_to_cosmos.py
   ```

5. **Functions の起動**
   ```bash
   func host start
   ```

### デプロイ (Azure)

Azure Developer CLI を使用してインフラをデプロイ：

```bash
cd azure-functions-mcp-managed-id
azd init --template .
azd env new dev
azd up
```

## 🔧 設定

### Azure OpenAI設定

1. Azure OpenAI リソースを作成
2. `gpt-realtime` モデルをデプロイ
3. API キーとエンドポイントを取得
4. `.env.local` に設定

### Cosmos DB設定（オプション）

1. Azure Cosmos DB アカウントを作成
2. データベース `rentacar-db` を作成
3. コンテナ `locations` を作成
4. 接続情報を `.env.local` に設定

設定しない場合、アプリケーションはサンプルデータで動作します。

## 🚨 注意事項

- **本番環境**: HTTPS必須（WebRTC要件）
- **APIキー**: 本番環境ではAPIキーを適切に保護してください
- **ブラウザ互換性**: WebRTC対応ブラウザが必要
- **マイクアクセス**: ユーザーのマイクアクセス許可が必要

## 📄 ライセンス

このプロジェクトはPOC（概念実証）として作成されています。

## 🤝 貢献

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request