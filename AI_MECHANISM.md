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
└─────────────────────────────────────────────────────────────┘
```

---

## AIができること

### ✅ 1. 音声インタラクション
- **リアルタイム音声認識**: ユーザーの日本語音声をテキストに変換
- **自然言語理解**: ユーザーの意図とニーズを理解
- **音声合成**: AIの回答を音声に変換して再生
- **双方向リアルタイム通信**: スムーズな対話をサポート、待機不要

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

## 制限と注意事項

### 1. これはPOC（概念実証）です
- 本番環境対応システムではありません
- セキュリティとエラー処理が不足
- データの永続化なし

### 2. コスト考慮
- Realtime APIは分単位で課金
- 各対話でコストが発生

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
