// テストスクリプト：PDFコンテンツ抽出の検証
import { loadKnowledgeBase } from '../lib/knowledgeLoader'

async function test() {
  console.log('🔍 Testing PDF knowledge extraction...\n')

  const content = await loadKnowledgeBase()

  if (content) {
    console.log('✅ PDF content extracted successfully!\n')
    console.log('📊 Content length:', content.length, 'characters\n')
    console.log('📄 First 500 characters:')
    console.log('─'.repeat(60))
    console.log(content.substring(0, 500))
    console.log('─'.repeat(60))
  } else {
    console.log('❌ Failed to extract PDF content')
  }
}

test().catch(console.error)
