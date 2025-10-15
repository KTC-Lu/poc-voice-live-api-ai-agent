import fs from 'fs'
import path from 'path'

let cachedKnowledge: string | null = null

/**
 * テキストファイルから知識ベースコンテンツを読み込む
 * 初回実行時にキャッシュし、以降はキャッシュを返す
 */
export async function loadKnowledgeBase(): Promise<string> {
  // キャッシュがあればそれを返す
  if (cachedKnowledge) {
    return cachedKnowledge
  }

  try {
    // テキストファイルのパスを構築
    const knowledgePath = path.join(
      process.cwd(),
      'knowledge',
      'credit_card_faq.txt'
    )

    // ファイルが存在するか確認
    if (!fs.existsSync(knowledgePath)) {
      console.warn('Knowledge text file not found:', knowledgePath)
      return ''
    }

    // テキストファイルを読み込む
    const extractedText = fs.readFileSync(knowledgePath, 'utf-8')

    // キャッシュに保存
    cachedKnowledge = extractedText.trim()

    console.log('✅ Knowledge base loaded successfully')
    console.log(`📄 Loaded ${cachedKnowledge.length} characters from text file`)

    return cachedKnowledge
  } catch (error) {
    console.error('Error loading knowledge base:', error)
    return ''
  }
}

/**
 * キャッシュをクリアする（開発時のリロード用）
 */
export function clearKnowledgeCache() {
  cachedKnowledge = null
}
