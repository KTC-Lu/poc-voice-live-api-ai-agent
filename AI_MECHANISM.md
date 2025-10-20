# 音声対話AIシステム機構説明

## システム概要

これは、Azure OpenAI Realtime APIをベースとした音声対話AIシステムで、カスタマーサービスシナリオに対応します。

---

## コアアーキテクチャ

### 1. 技術スタック
- **フロントエンド**: Next.js (React) + TypeScript
- **バックエンド**: Next.js API Routes
- **AIサービス**: Azure OpenAI Realtime API (GPT-4 Realtime)
- **通信方式**: WebRTC (リアルタイム音声通信)

### 2. 主要コンポーネント

```
┌─────────────────────────────────────────────────────────────┐
│                     ユーザーインターフェース                   │
│              (app/realtime/page.tsx)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  会話履歴表示                                         │  │
│  │  ・ユーザー発話（Azure転写でリアルタイム表示）        │  │
│  │  ・AI応答（テキスト+音声）                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Token使用統計パネル                                  │  │
│  │  ・入力/出力/キャッシュ Tokens                        │  │
│  │  ・Text/Audio 内訳                                    │  │
│  │  ・リアルタイムコスト推定                             │  │
│  │  ・応答履歴詳細                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │ WebRTC
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                  セッション管理 API                           │
│         (app/api/realtime/session/route.ts)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              Azure OpenAI Realtime API                       │
│                  (音声認識 + 対話生成)                        │
│                ↓ response.done イベント                      │
│            Token使用情報を含む                                │
└─────────────────────────────────────────────────────────────┘
```

---

## AIができること

### ✅ 1. 音声インタラクション
- **リアルタイム音声認識**: ユーザーの日本語音声をテキストに変換
- **自然言語理解**: ユーザーの意図とニーズを理解
- **音声合成**: AIの回答を音声に変換して再生
- **双方向リアルタイム通信**: スムーズな対話をサポート、待機不要
- **会話履歴のテキスト表示**: ユーザーの音声入力とAI応答をリアルタイムでUI上に表示

### ✅ 2. カスタマーサービス対話
- **丁寧でプロフェッショナルな対話**: 敬語と丁寧な言葉遣いを使用
- **文脈理解**: 対話履歴を記憶し、文脈を理解
- **簡潔で明確な説明**: 顧客が複雑な情報を理解できるようサポート
- **正確な情報提供**: ナレッジベースに基づいた信頼できる回答

### ✅ 3. ナレッジベースQ&A相談

#### 現在の機能：
**ナレッジベースに基づく情報提供**
- クレジットカード関連のよくある質問に回答
- 正確な手順説明とガイダンスを提供
- **情報提供のみ、いかなる操作も実行しない**

**動作方法（Tool-based Architecture）：**
1. AIがユーザーの質問を受信
2. AIが質問内容を分析し、適切なナレッジ取得ツールを判断
3. AIが対応するツール（例：`get_credit_card_knowledge`）を呼び出す
4. ツールがナレッジベース（`credit_card_faq.txt`）から情報を取得
5. AIがツールから得た情報に基づいて回答を生成
6. 該当するツールがない場合、オペレーターへの転送を案内

**ナレッジベースアーキテクチャ：**
- **ツール方式**: 各ナレッジ領域に対応する専用のfunctionツール
- **ローダー**: `lib/knowledgeLoader.ts`
- **ナレッジファイル**: `knowledge/credit_card_faq.txt`
- **API Endpoint**: `app/api/functions/get_credit_card_knowledge/route.ts`
- **動的読み込み**: AIの判断により必要な時のみナレッジを取得

---

## AIができないこと

### ❌ 1. あらゆる操作の実行
AIは**情報相談のみ提供**し、いかなる実際の操作も実行できません：
- **変更不可**: クレジットカード情報、アカウント情報
- **手続き不可**: カード発行、解約、紛失届
- **操作不可**: データ変更が必要な業務

操作が必要なリクエストの場合、AIは有人カスタマーサービスへの転送を案内します

### ❌ 2. ナレッジベース範囲外のコンテンツ
AIはナレッジベースに含まれる情報のみ回答可能：
- **回答可能**: `credit_card_faq.txt` に記載されている内容
- **回答不可**:
  - ナレッジベース外の質問
  - リアルタイムデータ（請求書、ポイント残高など）
  - 個人アカウントの具体的な情報

範囲外のリクエストの場合、AIは以下のように案内します：
```
「大変申し訳ございません。その件につきましては、
専門のオペレーターにおつなぎいたします。少々お待ちください。」
```

### ❌ 3. リアルタイムデータへのアクセス
- アカウント残高の照会不可
- 取引記録の照会不可
- ポイント情報の照会不可
- データベースへのアクセス不可

### ❌ 4. 本人確認
- 実際のユーザー本人確認なし
- ユーザーの身元確認不可
- 顧客個人情報へのアクセス不可

### ❌ 5. ファイル処理
- ファイルのアップロード/ダウンロード不可
- 画像/PDFの処理不可
- メール送信不可

---

## コア設定

### 1. AI指示 (Instructions)
場所: `app/api/realtime/session/route.ts` (44-95行目)

```typescript
instructions: `あなたはカスタマーサポートの自動応答システムです。

# あなたの役割
- 情報提供と質問への回答のみを行います
- 一切の操作や手続きは行いません

# 利用可能なツール
- get_credit_card_knowledge: クレジットカード情報の変更、登録、更新などに関する情報を取得

お客様の質問内容に応じて、適切なツールを呼び出してナレッジを取得し、
その情報を基に回答してください。

どのツールも該当しない質問の場合は、有人オペレーターへの転送を案内してください。

# 対応方法
1. お客様の質問を理解し、適切なナレッジ取得ツールを呼び出す
2. 操作方法を知りたい場合は、手順を丁寧に説明
3. 操作の代行を依頼された場合は、有人オペレーターへ転送
4. 該当するツールがない場合は、有人オペレーターへ転送
```

### 2. 利用可能なツール (Tools)
場所: `app/api/realtime/session/route.ts` (97-113行目)

```typescript
tools: [
  {
    type: 'function',
    name: 'get_credit_card_knowledge',
    description: 'クレジットカード情報の変更、登録、更新などに関するナレッジを取得',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'お客様の質問内容'
        }
      },
      required: ['query']
    }
  }
]
```

### 3. 音声設定
- **入力音声書き起こし**: 有効、言語は日本語に設定 (`ja`)
- **出力音声**: 日本語音声を自動合成
- **モデル**: GPT-4 Realtime モデル

---

## データフロー

### 完全な対話フロー（Tool-based Knowledge Architecture）

```
1. ユーザーが話す
   ↓ (WebRTC音声ストリーム)
2. Azure OpenAI リアルタイム音声認識
   ↓ (テキストに書き起こし)
3. GPT-4が質問を理解
   ↓
4. GPT-4が適切なナレッジツールを判断
   ↓
5. ツール呼び出し: get_credit_card_knowledge(query: "...")
   ↓
6. Function endpoint が呼ばれる
   ├→ app/api/functions/get_credit_card_knowledge/route.ts
   ├→ loadKnowledgeBase() を呼び出し
   ├→ knowledge/credit_card_faq.txt から情報を読み込む
   └→ JSON形式で知識を返す
   ↓
7. GPT-4がツールの結果を受信
   ↓
8. ツールから得た情報に基づいて回答を生成
   ↓
9. テキストから音声へ変換 (TTS)
   ↓ (WebRTC音声ストリーム)
10. ユーザーが回答を聞く
```

### ツールベースナレッジアーキテクチャ

```javascript
// フロントエンド: ツール呼び出しの検出と実行
dc.onmessage = async (ev) => {
  const payload = JSON.parse(ev.data)

  // Function call を検出
  if (payload.type === 'response.output_item.done') {
    const functionItem = payload.item
    if (functionItem.type === 'function_call') {
      const funcName = functionItem.name // 'get_credit_card_knowledge'
      const args = JSON.parse(functionItem.arguments)

      // ローカルAPIエンドポイントを呼び出し
      const response = await fetch(`/api/functions/${funcName}`, {
        method: 'POST',
        body: JSON.stringify(args)
      })
      const result = await response.json()

      // 結果をAIに返す
      await safeSend(dc, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: functionItem.call_id,
          output: JSON.stringify(result)
        }
      })

      // AIに応答生成を依頼
      await safeSend(dc, { type: 'response.create' })
    }
  }
}

// バックエンド: ナレッジ取得エンドポイント
// app/api/functions/get_credit_card_knowledge/route.ts
export async function POST(req: NextRequest) {
  const { query } = await req.json()
  const knowledgeBase = await loadKnowledgeBase()

  return NextResponse.json({
    success: true,
    knowledge: knowledgeBase,
    category: 'credit_card'
  })
}
```

---

## 主要ファイル説明

### フロントエンド
- `app/realtime/page.tsx` - メインインターフェース、WebRTC接続とUI処理

### バックエンドAPI
- `app/api/realtime/session/route.ts` - Realtime Sessionを作成し、ツールを登録
- `app/api/functions/get_credit_card_knowledge/route.ts` - クレジットカード関連ナレッジを取得（✅ 使用中）
- `app/api/functions/change_credit_card_info/route.ts` - （廃止、使用しない）

### ユーティリティクラス
- `lib/knowledgeLoader.ts` - ナレッジベーステキストを読み込む（✅ ツールから呼び出される）

### ナレッジベース
- `knowledge/credit_card_faq.txt` - FAQドキュメント（✅ ツール経由でアクセス）

### スクリプト（開発用）
- `scripts/extract-pdf-with-gpt.ts` - PDF抽出ツール（予備保管）
- `scripts/test-pdf.ts` - テストスクリプト

---

## 会話履歴表示メカニズム

### 概要

システムは、ユーザーの音声入力とAIの応答をリアルタイムでUI上にテキスト表示します。これにより、音声対話の透明性を高め、ユーザーが自分の発言とAIの応答を視覚的に確認できます。

### 実装方式

#### ユーザー音声入力の表示

ユーザーの音声は **Azure OpenAI Realtime API の `input_audio_transcription` 機能**を使用して自動的にテキスト化されます。

**設定場所**: `app/api/realtime/session/route.ts`
```typescript
input_audio_transcription: {
  model: deployment || 'gpt-realtime',
  language: "ja"  // 日本語に設定
}
```

**データフロー**:
```
1. ユーザーが話す
   ↓ (WebRTC音声ストリーム)
2. Azure OpenAI がリアルタイムで音声認識
   ↓
3. conversation.item.input_audio_transcription.completed イベント送信
   ├─ type: 'conversation.item.input_audio_transcription.completed'
   ├─ transcript: 'ユーザーの発話内容'
   └─ item_id: '一意のID'
   ↓
4. フロントエンドがイベントを受信・表示 (page.tsx)
   ↓
5. UI右側に青色の吹き出しで表示（"You"）
```

**実装詳細**: `app/realtime/page.tsx`
```typescript
// ユーザー転写イベントの検出
const isUserCompleted = typeof name === 'string' &&
  /conversation\.item\.(input_)?audio_transcription\.completed/i.test(name)

if (isUserCompleted) {
  const userText = payload?.transcript || extractTextFromEvent(payload)
  if (userText) {
    const id = payload?.item_id || payload?.id || ('user-' + String(Date.now()))
    upsertTranscript('user', String(id), userText, true)
  }
}
```

#### AI応答の表示

AIの応答は **`response.audio_transcript.done` イベント**から抽出されます。

**データフロー**:
```
1. AIが応答を生成
   ↓
2. response.audio_transcript.done イベント送信
   ├─ type: 'response.audio_transcript.done'
   ├─ content: [{ transcript: 'AIの応答内容' }]
   └─ usage: { /* Token使用情報 */ }
   ↓
3. フロントエンドがイベントを受信・表示
   ↓
4. UI左側に灰色の吹き出しで表示（"Assistant"）
```

### UIレイアウト

```
┌─────────────────────────────────────────────────────┐
│  会話履歴                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────┐                       │
│  │ Assistant               │                       │
│  │ こんにちは。どのような  │                       │
│  │ ご用件でしょうか？      │                       │
│  └─────────────────────────┘                       │
│                                                     │
│                       ┌─────────────────────────┐  │
│                       │ You                     │  │
│                       │ クレジットカードを      │  │
│                       │ 変更したい              │  │
│                       └─────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────┐                       │
│  │ Assistant               │                       │
│  │ かしこまりました。      │                       │
│  │ MyKINTOでの変更手順を   │                       │
│  │ ご案内いたします...     │                       │
│  └─────────────────────────┘                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 主な特徴

1. **リアルタイム表示**: 音声認識と同時に文字が表示される
2. **性能への影響最小**: Azure側で自動処理されるため、クライアント側の負荷なし
3. **高精度**: Azure OpenAIの音声認識エンジンによる正確な転写
4. **日本語対応**: `language: "ja"` 設定により日本語に最適化

### 技術的な利点

- **統合された転写**: AIが聞く内容と同じテキストを表示（完全な一貫性）
- **追加コストなし**: `input_audio_transcription` は Realtime API の標準機能
- **自動同期**: 音声とテキストが常に同期
- **エラー処理**: 転写失敗時も音声対話は継続

---

## Token使用追跡メカニズム

### 概要

システムは `response.done` イベントから Token 使用情報を自動抽出し、リアルタイムで統計とコスト推定を表示します。

### Token の種類

Azure OpenAI Realtime API は以下の Token タイプを区別します：

#### 1. 入力 Tokens (Input Tokens)
AIに送信される内容で消費される Tokens：
- **Text Tokens**: システム指令、ツール定義、対話履歴、ユーザーメッセージのテキスト
- **Audio Tokens**: ユーザーの音声入力（音声データ）

#### 2. 出力 Tokens (Output Tokens)
AIが生成する内容で消費される Tokens：
- **Text Tokens**: AI の回答テキスト、ツール呼び出し、推論内容
- **Audio Tokens**: AI の音声合成（TTS）

#### 3. キャッシュ Tokens (Cached Tokens)
再利用される入力 Tokens（コスト削減）：
- **Cached Text Tokens**: キャッシュされたシステム指令やツール定義
- **Cached Audio Tokens**: キャッシュされた音声パターン（稀）

### データフロー

```
1. ユーザーが話す
   ↓
2. Azure がリアルタイム音声認識 (Audio Tokens 消費)
   ↓
3. システム指令 + ツール定義 + 対話履歴を送信 (Text Tokens 消費)
   ↓ (一部がキャッシュされる場合あり)
4. GPT-4 が応答を生成 (Output Text Tokens 消費)
   ↓
5. 音声合成 (Output Audio Tokens 消費)
   ↓
6. response.done イベント発生
   ├─ usage.input_tokens (合計入力)
   ├─ usage.output_tokens (合計出力)
   ├─ usage.input_token_details
   │  ├─ text_tokens (入力テキスト)
   │  ├─ audio_tokens (入力オーディオ)
   │  ├─ cached_tokens (キャッシュ合計)
   │  └─ cached_tokens_details
   │     ├─ text_tokens (キャッシュテキスト)
   │     └─ audio_tokens (キャッシュオーディオ)
   └─ usage.output_token_details
      ├─ text_tokens (出力テキスト)
      └─ audio_tokens (出力オーディオ)
   ↓
7. フロントエンドが使用情報を抽出・集計
   ↓
8. UI に統計とコストを表示
```

### 実装詳細

#### 1. Token 情報の抽出
場所: `app/realtime/page.tsx`

```typescript
// response.done イベントを検出
if (typeof name === 'string' && name === 'response.done' && payload?.response?.usage) {
  const usage = payload.response.usage

  // 総計
  const inputTokens = usage?.input_tokens || 0
  const outputTokens = usage?.output_tokens || 0
  const cachedTokens = usage?.input_token_details?.cached_tokens || 0

  // Text/Audio 内訳
  const inputTextTokens = usage?.input_token_details?.text_tokens || 0
  const inputAudioTokens = usage?.input_token_details?.audio_tokens || 0
  const outputTextTokens = usage?.output_token_details?.text_tokens || 0
  const outputAudioTokens = usage?.output_token_details?.audio_tokens || 0
  const cachedTextTokens = usage?.input_token_details?.cached_tokens_details?.text_tokens || 0
  const cachedAudioTokens = usage?.input_token_details?.cached_tokens_details?.audio_tokens || 0

  // State に保存
  setTokenUsage(prev => [...prev, { /* 詳細データ */ }])
  setTotalTokens(prev => ({ /* 累計更新 */ }))
}
```

#### 2. コスト計算
Azure OpenAI 公式価格（100万 Tokens あたり、円）：

```typescript
const pricing = {
  inputText: 598.03,      // テキスト入力
  inputAudio: 4784.17,    // オーディオ入力
  cachedInput: 59.81,     // キャッシュ入力 (90%削減!)
  outputText: 2392.09,    // テキスト出力
  outputAudio: 9568.33    // オーディオ出力
}

// コスト計算式
const cost = (
  (inputTextTokens / 1_000_000) * pricing.inputText +
  (inputAudioTokens / 1_000_000) * pricing.inputAudio +
  (cachedTokens / 1_000_000) * pricing.cachedInput +
  (outputTextTokens / 1_000_000) * pricing.outputText +
  (outputAudioTokens / 1_000_000) * pricing.outputAudio
)
```

#### 3. UI 表示
- **サマリーカード**: 入力/出力/キャッシュの総計と Text/Audio 内訳
- **コストパネル**: 各タイプの推定コストと合計
- **詳細履歴**: 各応答ごとの Token 使用とコスト（展開可能）

### キャッシュメカニズム

#### キャッシュされるもの
1. **システム指令** (Instructions)
   - 初回: 通常の Text Input Tokens として課金
   - 2回目以降: Cached Tokens として課金（約90%削減）

2. **ツール定義** (Tools)
   - Function の name, description, parameters
   - 対話中は変更されないため高いキャッシュ率

3. **対話履歴** (一部)
   - 長時間変更されない古い対話内容

#### キャッシュの効果
典型的なシナリオ：
```
初回対話:
- Input Text: 2000 tokens (システム指令 + ツール定義)
- コスト: 2000/1M × ¥598.03 = ¥0.0012

2回目対話:
- Input Text: 500 tokens (新しいユーザーメッセージのみ)
- Cached: 1500 tokens (システム指令 + ツール定義)
- コスト: 500/1M × ¥598.03 + 1500/1M × ¥59.81
        = ¥0.0003 + ¥0.0001 = ¥0.0004
- 削減率: 約67% 🎉
```

### 最適化のベストプラクティス

#### 1. システム指令の安定化
```typescript
// ❌ 悪い例: 毎回変更
instructions: `現在時刻: ${new Date()} ...`

// ✅ 良い例: 安定した内容
instructions: `あなたはカスタマーサポートです...`
```

#### 2. ツール定義の最小化
```typescript
// 必要なツールのみ登録
tools: [
  { name: 'get_credit_card_knowledge', ... }
  // 使わないツールは削除
]
```

#### 3. 対話履歴の管理
- 長時間の対話では定期的にセッションをリセット
- 不要な履歴を蓄積しない

### 注意事項

1. **推定値の扱い**
   - UI に表示されるコストは推定値です
   - 実際の課金は Azure Portal で確認してください

2. **課金メトリクス**
   - Portal の `processed_prompt_tokens` と `generated_completion_tokens` が実際の課金対象
   - Realtime API の usage 情報は参考値として扱う

3. **イメージ Tokens**
   - 現在 Realtime API はイメージ入力をサポート
   - イメージ Tokens は `text_tokens` に含まれます（独立フィールドなし）
   - 1 イメージあたり約 85-1200 tokens（サイズとモードに依存）

---

## 制限と注意事項

### 1. これはPOC（概念実証）です
- 本番環境対応システムではありません
- セキュリティとエラー処理が不足
- データの永続化なし

### 2. コスト考慮
- Realtime API は Token ベースで課金
- 各対話でコストが発生（音声は特に高コスト）
- **Token 使用統計パネル**でリアルタイムに使用量とコストを確認可能
- キャッシュメカニズムを活用することで約90%のコスト削減が可能

### 3. パフォーマンス制限
- ネットワーク品質に依存
- WebRTC接続が不安定な場合がある
- 音声認識に遅延が発生する可能性

### 4. 機能制限
- 情報相談のみ提供、いかなる操作も実行しない
- 回答範囲はナレッジベースの内容に制限
- リアルタイムデータやデータベースにアクセス不可

---

## 機能拡張方法

### 既存ナレッジベースコンテンツの更新

1. **ナレッジベースファイルを編集**
   ```bash
   # ファイルを編集
   vi knowledge/credit_card_faq.txt

   # 新しいQ&Aコンテンツを追加
   ```

2. **自動反映**
   - ツールが呼び出される度に最新のファイルを読み込む
   - コードの変更不要
   - アプリケーション再起動後に有効

### 新しいナレッジ領域の追加（例：保険、車両メンテナンス）

1. **ナレッジファイルを作成**
   ```bash
   # 新しいナレッジファイルを作成
   vi knowledge/insurance_faq.txt
   ```

2. **Function endpointを作成**
   ```typescript
   // app/api/functions/get_insurance_knowledge/route.ts
   import { NextRequest, NextResponse } from 'next/server'
   import fs from 'fs'
   import path from 'path'

   export async function POST(req: NextRequest) {
     try {
       const { query } = await req.json()

       // 保険ナレッジを読み込む
       const knowledgePath = path.join(
         process.cwd(),
         'knowledge',
         'insurance_faq.txt'
       )
       const knowledge = fs.readFileSync(knowledgePath, 'utf-8')

       return NextResponse.json({
         success: true,
         knowledge: knowledge,
         category: 'insurance'
       })
     } catch (error) {
       return NextResponse.json(
         {
           success: false,
           message: '有人オペレーターにおつなぎする必要があります。'
         },
         { status: 500 }
       )
     }
   }
   ```

3. **セッション設定でツールを登録**
   ```typescript
   // app/api/realtime/session/route.ts
   tools: [
     {
       type: 'function',
       name: 'get_credit_card_knowledge',
       description: 'クレジットカード情報の変更、登録、更新などに関するナレッジを取得',
       parameters: {
         type: 'object',
         properties: {
           query: { type: 'string', description: 'お客様の質問内容' }
         },
         required: ['query']
       }
     },
     {
       type: 'function',
       name: 'get_insurance_knowledge',
       description: '保険に関するナレッジを取得します。保険関連の質問があった場合に使用してください。',
       parameters: {
         type: 'object',
         properties: {
           query: { type: 'string', description: 'お客様の質問内容' }
         },
         required: ['query']
       }
     }
   ]
   ```

4. **Instructionsを更新**
   ```typescript
   instructions: `
   ...
   # 利用可能なツール
   - get_credit_card_knowledge: クレジットカード情報の変更、登録、更新などに関する情報を取得
   - get_insurance_knowledge: 保険に関する情報を取得

   お客様の質問内容に応じて、適切なツールを呼び出してナレッジを取得し、
   その情報を基に回答してください。
   ...
   `
   ```

### 操作機能の追加（必要な場合）

将来、実行可能な操作（クレジットカード変更など）を追加する必要がある場合は、
上記と同様の手順でfunction endpointを作成し、実際のビジネスロジックを実装します。

---

## まとめ

### AIのコア能力
✅ リアルタイム音声対話（日本語）
✅ ユーザーの質問を理解
✅ ナレッジベースに基づく正確な情報提供
✅ 丁寧でプロフェッショナルなカスタマーサービス対話
✅ **相談のみ提供、いかなる操作も実行しない**

### 現在の状態
✅ ツールベースナレッジアーキテクチャ採用
✅ クレジットカードナレッジツール実装済み（`get_credit_card_knowledge`）
✅ 純粋なQ&Aモード、操作機能なし
✅ 拡張可能な設計（新しいナレッジ領域を簡単に追加可能）
🟡 回答範囲はナレッジツールでカバーされる内容に制限
🔴 本人確認とセキュリティメカニズムなし
🔴 リアルタイムデータにアクセス不可

### 適用シナリオ
✅ よくある質問相談（FAQ）
✅ 手順説明とガイダンス
✅ デモと概念実証
❌ 実際の操作実行（情報変更など）
❌ リアルタイムデータ照会（残高、取引記録など）
❌ 機密操作の処理
