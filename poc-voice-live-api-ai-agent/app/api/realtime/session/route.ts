import { NextResponse } from 'next/server'

function ensureUrlHasProtocol(u?: string) {
  if (!u) return false
  return /^https?:\/\//i.test(u)
}

async function createRealtimeSession() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  if (!endpoint || !apiKey) {
    throw new Error('Missing AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_KEY')
  }

  if (!ensureUrlHasProtocol(endpoint)) {
    throw new Error('AZURE_OPENAI_ENDPOINT must include protocol (https://)')
  }

  // Per docs, sessions URL should use the Realtime sessions path and API version 2025-04-01-preview
  // Example: https://<resource>.openai.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview
  const trimmed = endpoint.replace(/\/+$/, '')

  // If the endpoint looks like a Cognitive Services endpoint, it's not the Azure OpenAI resource endpoint
  if (trimmed.includes('cognitiveservices.azure.com')) {
    throw new Error('AZURE_OPENAI_ENDPOINT appears to be a Cognitive Services endpoint (cognitiveservices.azure.com). The Realtime WebRTC sessions API requires an Azure OpenAI resource endpoint like https://<name>.openai.azure.com. Create an Azure OpenAI resource or use its endpoint.')
  }

  const url = trimmed.includes('/openai')
    ? `${trimmed}/realtimeapi/sessions?api-version=2025-04-01-preview`
    : `${trimmed}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT

  // Build request body; allow user to pass additional session options via
  // AZURE_OPENAI_SESSION_OPTIONS (JSON string) so features like input transcription
  // can be enabled without changing code. Example env value:
  // AZURE_OPENAI_SESSION_OPTIONS='{"transcription": {"enable_input": true}}'
  const baseBody: any = {
    model: deployment || 'gpt-realtime',
    input_audio_transcription: {
      model: deployment || 'gpt-realtime',
      language: "ja"
    },
    instructions: `あなたはカスタマーサポートの自動応答システムです。お客様からの問い合わせに丁寧に対応してください。

    # あなたの役割
    - 情報提供と質問への回答のみを行います
    - 一切の操作や手続きは行いません
    - 必要に応じて有人オペレーターへの転送を案内します

    # 利用可能なツール
    お客様の質問に回答するために、以下のナレッジ取得ツールを使用できます：

    - **get_credit_card_knowledge**: クレジットカード情報の変更方法に関するナレッジを取得。お客様ご自身がMyKINTOで変更する手順を案内するための情報です。

    お客様の質問内容に応じて、適切なツールを呼び出してナレッジを取得し、その情報を基に回答してください。

    **重要**: どのツールも該当しない質問の場合は、有人オペレーターへの転送を案内してください。

    # 対応方法
    1. **お客様の質問を理解する**
       - お客様が何について質問しているか判断します
       - 適切なナレッジ取得ツールがあれば、それを呼び出します
       - ツールから得た情報を基に、丁寧に回答します

    2. **お客様が操作方法を知りたい場合**
       - お客様が「〜したい」「〜する方法は？」と質問した場合
       - ナレッジツールから取得した情報を基に、お客様ご自身で操作する方法を丁寧に説明してください
       - 例：「クレジットカード情報を変更したい」→ get_credit_card_knowledgeを呼び出し → MyKINTOでの変更手順を案内

    3. **お客様が操作の代行を依頼する場合**
       以下の場合は必ず有人オペレーターへの転送をご案内してください：
       - お客様が「代わりにやってほしい」「自分でやりたくない」「やってください」など、操作の代行を依頼した場合
       - 操作方法を案内した後、お客様が「自分ではできない」「難しい」などと言った場合
       - お客様が直接「人工客服」「有人対応」「オペレーター」などを要求した場合

       **重要：操作方法を案内してもお客様が「自分でやりたくない」「代わりにやってほしい」という意思を示された場合は、
       説明を繰り返さず、直ちに有人オペレーターへ転送してください。**

       転送時は以下のように簡潔に案内してください：
       「かしこまりました。有人オペレーターにおつなぎいたします。少々お待ちください。」

    4. **該当するツールがない場合**
       - 利用可能なナレッジツールで対応できない質問の場合は、有人オペレーターへの転送を案内してください
       - 例：「保険について知りたい」など、クレジットカード以外のトピックの場合

    # ルール
    - 常に丁寧な言葉遣いを心がけてください
    - お客様の質問に応じて、適切なナレッジツールを必ず呼び出してください
    - ツールから得た情報のみを基に回答し、推測や不確実な情報は提供しないでください
    - お客様が「〜したい」と質問した場合は、まず操作方法を案内してください（代行依頼ではない限り）
    - お客様が操作の代行を明確に依頼した場合のみ、有人オペレーターへ転送してください
    - 該当するツールがない質問の場合は、有人オペレーターへ転送してください
    - 転送の案内は簡潔に、余計な説明を加えないでください
    - 同じ説明を繰り返さないでください。お客様が納得していない場合は有人オペレーターへ転送してください`,
    // ナレッジ取得ツールを登録
    tools: [
      {
        type: 'function',
        name: 'get_credit_card_knowledge',
        description: 'クレジットカード情報の変更方法に関するナレッジを取得します。お客様ご自身がMyKINTOで変更する手順を案内するための情報を提供します。クレジットカード関連の質問があった場合に使用してください。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'お客様の質問内容（将来的な検索機能のため）'
            }
          },
          required: ['query']
        }
      }
    ]
  }
  const rawOptions = process.env.AZURE_OPENAI_SESSION_OPTIONS
  if (rawOptions) {
    try {
      const parsed = JSON.parse(rawOptions)
      // Sanitize parsed options to avoid sending unknown parameters that Azure will reject.
      // Known safe subkeys for input_audio_transcription: model, language, prompt
      function sanitizeOptions(obj: any) {
        if (!obj || typeof obj !== 'object') return {}
        const out: any = {}
        // Explicitly forbid keys that Azure sessions API does not accept here
        const forbidden = new Set(['functions', 'tools', 'mcp'])
        for (const k of Object.keys(obj)) {
          try {
            if (forbidden.has(k)) {
              // skip unsupported top-level keys
              continue
            }
            if (k === 'input_audio_transcription' && obj[k] && typeof obj[k] === 'object') {
              const allowed = ['model', 'language', 'prompt']
              out[k] = {}
              for (const kk of allowed) {
                if (kk in obj[k]) out[k][kk] = obj[k][kk]
              }
              if (Object.keys(out[k]).length === 0) delete out[k]
            } else if (k === 'transcription' && obj[k] && typeof obj[k] === 'object') {
              const allowed = ['model', 'language', 'prompt']
              out[k] = {}
              for (const kk of allowed) {
                if (kk in obj[k]) out[k][kk] = obj[k][kk]
              }
              if (Object.keys(out[k]).length === 0) delete out[k]
            } else {
              const v = obj[k]
              if (v === null) continue
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || Array.isArray(v) || typeof v === 'object') {
                out[k] = v
              }
            }
          } catch (_) {
            // skip problematic key
          }
        }
        return out
      }

      const safeOpts = sanitizeOptions(parsed)
      // warn if something was dropped
      const dropped = Object.keys(parsed).filter(k => !(k in safeOpts))
      if (dropped.length) console.warn('Dropped unsupported session options:', dropped)
      Object.assign(baseBody, safeOpts)
    } catch (e) {
      console.warn('AZURE_OPENAI_SESSION_OPTIONS is not valid JSON, ignoring:', rawOptions)
    }
  }

  let resp: Response
  try {
    // DEBUG: log the outgoing session body (without API key) to inspect tools format
    try {
      console.debug('Realtime session body:', JSON.stringify(baseBody, null, 2))
    } catch (_) {}

    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      // Use deployment name (may differ from model name) per docs
      body: JSON.stringify(baseBody)
    })
  } catch (fetchErr: any) {
    // Network or other fetch-level error
    throw new Error(`Failed to fetch Azure Realtime endpoint: ${fetchErr?.message || String(fetchErr)}`)
  }

  const text = await resp.text()
  if (!resp.ok) {
    // If 404 and deployment is provided, try deployment-specific path as a fallback (older variants)
    if (resp.status === 404 && deployment) {
      const altUrl = trimmed.includes('/openai')
        ? `${trimmed}/deployments/${deployment}/realtime?api-version=2025-04-01-preview`
        : `${trimmed}/openai/deployments/${deployment}/realtime?api-version=2025-04-01-preview`

      try {
        const altResp = await fetch(altUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({ model: deployment })
        })
        const altText = await altResp.text()
        if (!altResp.ok) {
          // still failing; include both responses for debugging
          throw new Error(`Azure alt error ${altResp.status}: ${altText} (original 404: ${text})`)
        }
        try {
          return JSON.parse(altText)
        } catch (_) {
          return { body: altText }
        }
      } catch (altErr: any) {
        throw new Error(`Fallback attempt failed: ${altErr?.message || String(altErr)} (original 404: ${text})`)
      }
    }
    // Include status and body text to aid debugging (do not include secrets)
    // If 404, provide actionable hint about endpoint formatting or resource type
    if (resp.status === 404) {
      throw new Error(`Azure error 404: ${text} — check AZURE_OPENAI_ENDPOINT (must be your Azure OpenAI resource endpoint, e.g. https://<name>.openai.azure.com) and ensure you have deployed a realtime-capable model and are using API version 2025-04-01-preview.`)
    }
    throw new Error(`Azure error ${resp.status}: ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch (e) {
    // If response is not JSON, return raw text in an object
    return { body: text }
  }
}

export async function GET() {
  try {
    const session = await createRealtimeSession()
    // Normalize response: expose client_secret.value and a candidate realtimeUrl for client use
    const clientSecret = session?.client_secret?.value || session?.client_secret_value || session?.client_secret?.secret
    // session may contain joinUrl, sessionUrl, or other endpoints from Azure -- prefer them
    const realtimeUrl = session?.sessionUrl || session?.joinUrl || session?.realtimeUrl || null

    const safe = {
      raw: session,
      client_secret: clientSecret,
      realtimeUrl,
    }

    return NextResponse.json(safe)
  } catch (err: any) {
    // Log the error server-side for diagnostics (won't expose API key)
    console.error('realtime session error:', err)
    const safeMessage = typeof err?.message === 'string' ? err.message : 'Unknown error'
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
