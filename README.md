# AI カスタマーサポート - 音声対話システム

音声を使って Azure OpenAI Realtime API と対話するカスタマーサポートシステムのプロトタイプ（POC）です。ブラウザから WebRTC を使って Azure OpenAI に直接接続し、リアルタイムでの音声対話を実現します。

## 🎯 概要

このアプリケーションは、以下の機能を提供します：

- **音声対話**: ブラウザのマイクを使用してAIカスタマーサポートと日本語で対話
- **ツールベースナレッジシステム**: AIが質問内容に応じて適切なナレッジツールを呼び出し
- **クレジットカード情報Q&A**: クレジットカード情報の変更方法などをガイド（操作は行わない）
- **リアルタイム処理**: WebRTC を使用した低遅延の音声通信
- **プロアクティブな挨拶**: 5秒間ユーザーが話さない場合、AIから会話を開始
- **人工オペレーター転送**: 操作代行依頼や対応できない問い合わせは有人オペレーターへの転送を案内
- **拡張可能な設計**: 新しいナレッジ領域を簡単に追加できるモジュラー設計

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

5. **ブラウザでアクセス**

   http://localhost:3000/realtime にアクセスして音声対話を開始

## 📱 使用方法

1. `/realtime` ページにアクセス
2. 「開始」ボタンをクリックしてマイクアクセスを許可
3. AIカスタマーサポートと日本語で対話
4. クレジットカード情報変更などのお問い合わせを行う

### 対応可能な問い合わせ

AIカスタマーサポートは以下の問い合わせに対応します：

1. **クレジットカード情報変更**
   - 住所変更
   - 電話番号変更
   - メールアドレス変更

2. **その他の問い合わせ**
   - 上記以外の問い合わせは、有人オペレーターへの転送をご案内します

## 🏗️ アーキテクチャ

### ディレクトリ構成

```
app/
├── api/
│   ├── functions/                    # AI が呼び出す機能エンドポイント
│   │   └── change_credit_card_info/  # クレジットカード情報変更
│   └── realtime/session/             # Azure Realtime セッション作成
├── realtime/                         # 音声対話UI
├── layout.tsx
└── page.tsx
```

### データフロー

1. **セッション作成**: クライアントが `/api/realtime/session` でAzureセッションを作成
2. **WebRTC接続**: ブラウザとAzure間で音声ストリーミング接続を確立
3. **音声処理**: ユーザーの音声 → Azure AI → 機能呼び出し → レスポンス → 音声合成
4. **機能実行**: AIが必要に応じてローカルAPI（クレジットカード情報変更）を呼び出し

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
- `POST /api/functions/change_credit_card_info` - クレジットカード情報変更
  - パラメータ: `cardNumber`（カード番号下4桁）、`changeType`（変更種別: address/phone/email）、`newValue`（新しい値）

### 技術スタック

- **フロントエンド**: Next.js 14+, React 18.2, TypeScript
- **音声技術**: WebRTC, Web Audio API
- **AI**: Azure OpenAI Realtime API (GPT Realtime)
- **デプロイ**: Next.js アプリケーション

## 🔧 設定

### Azure OpenAI設定

1. Azure OpenAI リソースを作成
2. `gpt-realtime` モデルをデプロイ
3. API キーとエンドポイントを取得
4. `.env.local` に設定

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