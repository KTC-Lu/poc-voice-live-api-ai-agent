import { NextRequest, NextResponse } from 'next/server'
import { loadKnowledgeBase } from '../../../../lib/knowledgeLoader'

/**
 * クレジットカード関連の知識を取得するFunction
 *
 * このfunctionは実際の操作を行わず、知識ベースから情報を取得して返すのみです。
 * AIはこの情報を基に、お客様の質問に回答します。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query } = body

    // ナレッジベースを読み込む
    const knowledgeBase = await loadKnowledgeBase()

    // 知識ベースの内容を返す
    // 将来的には、queryに基づいてフィルタリングやベクトル検索を実装できます
    return NextResponse.json({
      success: true,
      knowledge: knowledgeBase,
      category: 'credit_card',
      message: 'クレジットカード関連の知識を取得しました。'
    })
  } catch (error) {
    console.error('Failed to load credit card knowledge:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'ナレッジベースの読み込みに失敗しました。',
        message: 'この件につきましては、有人オペレーターにおつなぎする必要があります。'
      },
      { status: 500 }
    )
  }
}
