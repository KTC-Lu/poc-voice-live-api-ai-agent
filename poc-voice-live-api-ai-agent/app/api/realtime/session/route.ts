import { headers } from 'next/headers'
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
    instructions: `レンタカーの予約窓口のオペレーターです。対応中のお客様の名前は'しろくま'です。用意されているツールを利用し、お客様のレンタカー予約管理を行ってください。
    
    # 仕事の流れ
    1. どの店舗で利用したいか、利用場所を明確にしましょう
    2. 利用日時をヒアリングしましょう
    3. 車両の種類を確認しましょう。
    4. 利用できる車種があるかどうか、確認しましょう。
    5. 予約登録しましょう。

    # ルール
    - レンタカーの予約の際は、必ず開始時刻と返却日時を明確にしましょう。
    - ツール実行している間も、会話を途切れないように、「少々お待ちください。」や「お調べ中です」などと会話をしましょう。`,
    // Azure Realtime expects tool declarations under `tools`.
    // Use type: 'function' for embedded callable functions.
    tools: [
      {
        type: 'function',
        name: 'list_locations',
        description: 'Return list of rental locations (id, name, address, phone)',
        parameters: { type: 'object', properties: {}, required: [] }
      },
      {
        type: 'function',
        name: 'get_availability',
        description: 'Get available vehicles for a location and date range',
        parameters: {
          type: 'object',
          properties: {
            locationId: { type: 'string' },
            startDate: { type: 'string', description: 'ISO8601 start datetime' },
            endDate: { type: 'string', description: 'ISO8601 end datetime' },
            vehicleType: { type: 'string', description: 'Optional vehicle type filter' }
          },
          required: ['locationId', 'startDate', 'endDate']
        }
      },
      {
        type: 'function',
        name: 'create_reservation',
        description: 'Create a reservation in the rent-a-car system',
        parameters: {
          type: 'object',
          properties: {
            locationId: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            customerName: { type: 'string' },
            customerContact: { type: 'object' },
            vehicleType: { type: 'string' },
            vehicleId: { type: 'string' }
          },
          required: ['locationId', 'startDate', 'endDate', 'customerName']
        }
      },
      {
        type: 'function',
        name: 'get_reservation_status',
        description: 'Get reservations by customer name',
        parameters: {
          type: 'object',
          properties: { customerName: { type: 'string' } },
          required: ['customerName']
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
