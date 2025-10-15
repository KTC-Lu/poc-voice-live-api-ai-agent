// Azure OpenAI (GPT-5) を使用してPDFコンテンツを抽出
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// .env.local を手動で読み込む
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env.local')

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  })
  console.log('✅ Loaded environment variables from .env.local')
} else {
  console.warn('⚠️  .env.local not found at:', envPath)
}

// PDFを画像 (PNG base64) に変換
async function convertPdfToImage(pdfPath: string): Promise<string> {
  console.log('🔄 Converting PDF to image...')

  const pdfBuffer = fs.readFileSync(pdfPath)
  // BufferをUint8Arrayに変換
  const pdfData = new Uint8Array(pdfBuffer)

  // PDFドキュメントを読み込む
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true
  })

  const pdfDocument = await loadingTask.promise
  console.log(`📄 PDF has ${pdfDocument.numPages} page(s)`)

  // 最初のページを取得
  const page = await pdfDocument.getPage(1)

  // 高品質な画像を得るためにスケールを設定
  const scale = 2.0
  const viewport = page.getViewport({ scale })

  // pdfDocument組み込みのcanvasFactoryを使用
  const canvasFactory = (pdfDocument as any).canvasFactory
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)

  // PDFページをcanvasにレンダリング (Node.js環境)
  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport: viewport
  }

  await page.render(renderContext as any).promise

  // PNG base64に変換
  const imageBuffer = canvasAndContext.canvas.toBuffer('image/png')
  const base64Image = imageBuffer.toString('base64')

  console.log('✅ PDF converted to image, size:', Math.round(imageBuffer.length / 1024), 'KB')

  // リソースをクリーンアップ
  page.cleanup()

  return base64Image
}

async function extractPdfContent() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  // 環境変数またはパラメータからデプロイ名を取得
  const deployment = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || 'gpt-5'

  if (!endpoint || !apiKey) {
    throw new Error('Missing AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY')
  }

  console.log('🔧 Using deployment:', deployment)

  // PDFファイル名の設定
  const pdfFileName = 'FireShot Capture 185 - 【共通】クレジットカードの情報変更 - ナレッジ - Salesforce - [kinto.lightning.force.com].pdf'
  // const pdfFileName = 'test2.pdf'
  const outputFileName = 'credit_card_faq_extracted.txt'

  // PDFファイルを読み込んで画像に変換
  const pdfPath = path.join(process.cwd(), 'knowledge', pdfFileName)

  // PDFを画像に変換
  const base64Image = await convertPdfToImage(pdfPath)

  console.log('🤖 Calling Azure OpenAI to extract text...\n')

  // Azure OpenAI v1 Responses APIを使用（画像入力をサポート）
  const baseUrl = endpoint.replace(/\/$/, '')
  const url = `${baseUrl}/openai/v1/responses`

  console.log('🔗 API URL:', url)
  console.log('🤖 Model:', deployment)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      model: deployment,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/png;base64,${base64Image}`
            },
            {
              type: 'input_text',
              text: 'このPDFファイルから、画像として表示されている日本語のテキストを全て抽出してください。このPDFはFireShotでキャプチャされたスクリーンショット画像なので、画像として表示されている可視的な日本語テキストを全て抽出してください。画像の品質が低くても、最大限の努力をして読み取れる日本語テキストを全て抽出してください。不確実な文字があっても、最も可能性の高い文字を推測して抽出してください。'
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ API Error:', errorText)
    throw new Error(`Azure OpenAI API error: ${response.status}`)
  }

  const result = await response.json()

  console.log('🔍 Full API Response:')
  console.log(JSON.stringify(result, null, 2))
  console.log('\n')

  // Responses APIの戻り形式: output_textを優先使用、なければoutput配列から検索
  let extractedText = result.output_text

  if (!extractedText) {
    const messageOutput = result.output?.find((item: any) => item.type === 'message')
    extractedText = messageOutput?.content?.[0]?.text
  }

  if (!extractedText) {
    console.warn('⚠️  Could not find text in expected format, using fallback')
    extractedText = JSON.stringify(result, null, 2)
  }

  console.log('✅ Text extraction completed!\n')
  console.log('📝 Extracted content:')
  console.log('═'.repeat(80))
  console.log(extractedText)
  console.log('═'.repeat(80))
  console.log('\n📊 Length:', extractedText.length, 'characters')

  // テキストファイルに保存
  const outputPath = path.join(process.cwd(), 'knowledge', outputFileName)
  fs.writeFileSync(outputPath, extractedText, 'utf-8')
  console.log('\n💾 Saved to:', outputPath)

  return extractedText
}

// 抽出を実行
extractPdfContent().catch(error => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
