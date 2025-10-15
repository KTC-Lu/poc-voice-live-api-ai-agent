# POC Voice Live API AI Agent

音声を使って Azure OpenAI Realtime API と対話する**AIカスタマーサポートシステム**のプロトタイプ（POC）です。ブラウザから WebRTC を使って Azure OpenAI に直接接続し、リアルタイムでの音声対話によるナレッジベースQ&Aを実現します。

## 🎯 概要

このアプリケーションは、以下の機能を提供します：

- **音声対話**: ブラウザのマイクを使用してAIエージェントと日本語で対話
- **カスタマーサポート**: クレジットカード情報変更などに関する質問に回答
- **リアルタイム処理**: WebRTC を使用した低遅延の音声通信
- **ナレッジベースQ&A**: AIが必要に応じてナレッジベース(`credit_card_faq.txt`)から情報を取得して回答
- **プロアクティブ挨拶**: ユーザーが5秒間話さない場合、AIから自動的に会話を開始
- **情報提供のみ**: 実際の操作は行わず、情報相談のみを提供

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
   ```

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

4. **ブラウザでアクセス**

   http://localhost:3000 にアクセスして音声対話を開始

## 📱 使用方法

1. ホームページ (`http://localhost:3000`) にアクセス
2. 「開始」ボタンをクリックしてマイクアクセスを許可
3. AIカスタマーサポートエージェントと日本語で対話
4. クレジットカード情報変更などについて質問

### 対話の流れ

1. **自動挨拶**: 接続後、ユーザーが5秒間話さない場合、AIから自動的に挨拶
2. **質問**: ユーザーがクレジットカード関連の質問をする
3. **ナレッジ取得**: AIが`get_credit_card_knowledge`ツールを呼び出し、ナレッジベースから情報を取得
4. **回答**: AIがナレッジベースの情報を基に丁寧に回答
5. **転送案内**: 該当するナレッジがない場合や操作の代行が必要な場合は、有人オペレーターへの転送を案内

## 🏗️ アーキテクチャ

### ディレクトリ構成

```
app/
├── api/
│   ├── functions/                      # AI が呼び出す機能エンドポイント
│   │   ├── get_credit_card_knowledge/  # クレジットカードナレッジ取得
│   │   └── change_credit_card_info/    # (廃止、使用しない)
│   └── realtime/session/               # Azure Realtime セッション作成
├── realtime/                           # 音声対話UI
├── layout.tsx
└── page.tsx

lib/
├── knowledgeLoader.ts                  # ナレッジベース読み込み
└── cosmosClient.ts                     # (現在未使用)

knowledge/
└── credit_card_faq.txt                 # クレジットカードFAQナレッジベース
```

### データフロー

1. **セッション作成**: クライアントが `/api/realtime/session` でAzureセッションを作成（ツール登録を含む）
2. **WebRTC接続**: ブラウザとAzure間で音声ストリーミング接続を確立
3. **プロアクティブ挨拶**: ユーザーが5秒間話さない場合、AIから自動的に挨拶を開始
4. **音声処理**: ユーザーの音声 → Azure AI (音声認識) → テキスト化
5. **ナレッジ取得**: AIが適切なツール(`get_credit_card_knowledge`)を呼び出し、ナレッジベースから情報を取得
6. **回答生成**: AIがツールから得た情報を基に回答を生成 → 音声合成 → ユーザーへ再生

## 🛠️ 開発

### 利用可能なコマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm start        # 本番サーバー起動
npm run lint     # ESLint実行
```

### API エンドポイント

- `GET /api/realtime/session` - Azure Realtime セッション作成（AIツール登録を含む）
- `POST /api/functions/get_credit_card_knowledge` - クレジットカードナレッジ取得（AIから呼び出される）

### 技術スタック

- **フロントエンド**: Next.js 14+, React 18.2, TypeScript
- **音声技術**: WebRTC
- **AI**: Azure OpenAI Realtime API (GPT-4 Realtime)
- **ナレッジベース**: テキストファイル (`knowledge/credit_card_faq.txt`)
- **デプロイ**: Next.js アプリケーション

## 🔧 設定

### Azure OpenAI設定

1. Azure OpenAI リソースを作成
2. `gpt-realtime` モデルをデプロイ
3. API キーとエンドポイントを取得
4. `.env.local` に設定

### ナレッジベース設定

ナレッジベースは `knowledge/credit_card_faq.txt` に格納されています。

**ナレッジベースを更新する方法**:
1. `knowledge/credit_card_faq.txt` を編集
2. Q&A形式でコンテンツを追加・更新
3. アプリケーションを再起動すると自動的に反映

**新しいナレッジ領域を追加する方法**:
詳細は [AI_MECHANISM.md](../AI_MECHANISM.md) の「機能拡張方法」セクションを参照してください。

## 🚨 注意事項

### 重要な制限事項

- **情報提供のみ**: このシステムは情報相談のみを提供し、**実際の操作は一切行いません**
- **ナレッジベース範囲**: ナレッジベースに含まれる情報のみ回答可能
- **本人確認なし**: 実際のユーザー本人確認機能はありません
- **リアルタイムデータ不可**: アカウント残高、取引記録などのリアルタイムデータにはアクセスできません

### 技術的要件

- **本番環境**: HTTPS必須（WebRTC要件）
- **APIキー**: 本番環境ではAPIキーを適切に保護してください
- **ブラウザ互換性**: WebRTC対応ブラウザが必要
- **マイクアクセス**: ユーザーのマイクアクセス許可が必要

## 📚 関連ドキュメント

- [AI_MECHANISM.md](../AI_MECHANISM.md) - AIシステムの詳細な機構説明
  - AIができること・できないこと
  - ツールベースナレッジアーキテクチャ
  - プロアクティブ挨拶機能
  - 機能拡張方法

## 📄 ライセンス

このプロジェクトはPOC（概念実証）として作成されています。

## 🤝 貢献

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request