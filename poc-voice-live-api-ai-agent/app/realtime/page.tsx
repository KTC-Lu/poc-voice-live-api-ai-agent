"use client"

import { useEffect, useRef, useState } from 'react'

export default function RealtimePage() {
  const [status, setStatus] = useState('idle')
  // transcripts now include speaker: 'user' | 'assistant', and partial flag
  const [transcripts, setTranscripts] = useState<Array<{id:string, speaker:'user'|'assistant', text:string, partial?:boolean}>>([])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const dcRef = useRef<any>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)


  // Utility: small sleep
  function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms))
  }

  // Safely send a JSON message on a RTCDataChannel, reject if channel not open
  async function safeSend(channel: RTCDataChannel | null, obj: any) {
    if (!channel) throw new Error('data channel missing')
    // Wait up to timeout for the channel to become open
    const timeoutMs = 1000
    const start = Date.now()
    while (true) {
      const ready = (channel as any).readyState
      if (ready === 'open' || ready === 1) break
      if (Date.now() - start > timeoutMs) throw new Error('data channel not open (timeout)')
      await sleep(100)
    }
    // send and let caller catch
    try {
      const json = JSON.stringify(obj)
      // log outgoing payload size to help diagnose datachannel closures
      try { console.debug('safeSend outgoing bytes:', new TextEncoder().encode(json).length, 'objType:', obj?.type || typeof obj) } catch (_) { console.debug('safeSend outgoing bytes: (encoder failed)') }
      channel.send(json)
    } catch (err) {
      console.error('safeSend failed to stringify/send object', { err, objSnippet: String(obj?.type || typeof obj) })
      throw err
    }
  }
  // autoscroll to bottom when transcripts update
  useEffect(() => {
    const el = chatContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [transcripts])

  // Upsert transcript helper: update matching partial by id, otherwise append.
  function upsertTranscript(speaker: 'user' | 'assistant', id: string, text: string, isFinal: boolean) {
    setTranscripts(prev => {
      const strId = String(id)
      // Find the last index with same speaker and same id
      for (let i = prev.length - 1; i >= 0; --i) {
        if (prev[i].speaker === speaker && String(prev[i].id) === strId) {
          // If existing entry is partial, update it
          if (prev[i].partial) {
            const copy = [...prev]
            copy[i] = { ...copy[i], text, partial: !isFinal }
            return copy
          }
          // If existing entry is final, append new message instead
          break
        }
      }
      // Not found matching partial -> append new
      return [...prev, { id: strId, speaker, text, partial: !isFinal }]
    })
  }

  async function start() {
    setStatus('getting-mic')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localStreamRef.current = stream

    setStatus('creating-pc')
    const pc = new RTCPeerConnection()
    pcRef.current = pc

    // Add local audio track
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream)

    // Create data channel for receiving events (transcripts, events)
    let dc: RTCDataChannel | null = null
    try {
      dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.onopen = () => console.log('data channel open')
      dc.onclose = () => console.log('data channel closed')
      dc.onerror = (ev) => console.error('data channel error', ev)
  dc.onmessage = async (ev) => {
        // DEBUG: raw datachannel message
        console.debug('datachannel raw message:', ev.data)
        // Try parse JSON, otherwise show raw text
        let payload: any = null
        try {
          const parsed = JSON.parse(ev.data)
          // If the server sends an array of events, pick the most relevant element
          if (Array.isArray(parsed)) {
            payload = parsed.find((p: any) => p && (p.content || p.transcript || p.name || p.type)) || parsed[0]
          } else {
            payload = parsed
          }
        } catch (_) {
          payload = { text: String(ev.data) }
        }
            // Diagnostic: explicitly detect tool_call shapes in payload and log them for debugging
            try {
              const hasToolCall = Boolean(payload && (payload.tool_call || payload.toolCall || payload.toolCallRequest || payload.tool_call_request || (payload.response && (payload.response.tool_call || payload.response.toolCall)) || (payload.item && payload.item.type === 'function_call') || Array.isArray(payload.output) && payload.output.some((o:any)=>o?.type === 'function_call')))
              if (hasToolCall) {
                console.info('Detected tool_call payload on datachannel:', payload)
              }
            } catch (_) {}
        // Prefer explicit transcripts in payload.content if available
        let text: string | null = extractTranscriptFromPayload(payload) || extractTextFromEvent(payload)

        // Sanitize: if extracted text looks like an event name or a single token (no spaces, only word/dot/hyphen), ignore it
        const maybeName = payload?.name || payload?.type || payload?.event || payload?.topic || null
        if (text && typeof text === 'string') {
          const trimmed = text.trim()
          if (typeof maybeName === 'string' && trimmed === maybeName.trim()) text = null
          else if (typeof payload?.type === 'string' && trimmed === payload.type) text = null
          else if (/^[\w.-]+$/.test(trimmed)) text = null
        }

        // New: handle conversation.item.audio_transcription.delta and completed explicitly
        const name = payload?.name || payload?.type || payload?.event || payload?.topic || null
        const isUserDelta = typeof name === 'string' && /conversation\.item\.audio_transcription\.delta/i.test(name)
        const isUserCompleted = typeof name === 'string' && /conversation\.item\.audio_transcription\.completed/i.test(name)

// If event is response.done or response.output_item.done, extract transcript(s) from payload.content
        const isResponseDone = typeof name === 'string' && /response\.done|response\.output_item\.done|response\.content_part|response\.content_part\.done/i.test(name)
        // If this is an output_item.done that contains a function_call item, process it per Zenn/MS pattern:
        // - find item.type === 'function_call'
        // - execute the local function (POST /api/functions/{name})
        // - send a conversation.item.create with type 'function_call_output' and the call_id + output
        // - send response.create to notify the server to continue
        const isOutputItemDone = isResponseDone
        if (isOutputItemDone) {
          // If the payload contains a function_call item, run the function
          const items = Array.isArray(payload?.content) ? payload.content : (payload?.output ? payload.output : (payload?.item ? [payload.item] : []))
          const functionItems = items.filter((it: any) => it && (it.type === 'function_call' || (it.item && it.item.type === 'function_call') || (it.output && Array.isArray(it.output) && it.output.some((o:any)=>o?.type==='function_call')) || (it.name && it.type === 'function_call')))
          if (functionItems && functionItems.length) {
            for (const fit of functionItems) {
              // normalize to an 'item' shape
              const item = fit.item || fit || (fit.output && fit.output.find((o:any)=>o?.type==='function_call'))
              console.debug('Handling function_call item:', item)
              const callId = item.call_id || item.callId || item.id || null
              const funcName = item.name || item.function?.name || null
              let args: any = {}
              try {
                if (typeof item.arguments === 'string' && item.arguments.trim()) args = JSON.parse(item.arguments)
                else if (typeof item.arguments === 'object') args = item.arguments
                else args = {}
              } catch (e) { args = { raw: item.arguments } }

              if (funcName && dc && (dc.readyState === 'open')) {
                // Call local function endpoint
                try {
                  console.debug('Calling local function', funcName, args)
                  const fnRes = await fetch(`/api/functions/${encodeURIComponent(funcName)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
                  const fnBodyText = await fnRes.text()
                  let fnBody: any = null
                  try { fnBody = JSON.parse(fnBodyText) } catch (_) { fnBody = { raw: fnBodyText } }

                  // Send conversation.item.create with function_call_output per Zenn sample
                  // Stringify function result to avoid sending large/complex objects over the datachannel
                  let fnOutputString: string
                  try {
                    fnOutputString = typeof fnBody === 'string' ? fnBody : JSON.stringify(fnBody)
                  } catch (_) {
                    fnOutputString = String(fnBody)
                  }
                  const convMsg = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      // use a single string payload under 'output' to match simple transport requirements
                      output: fnOutputString
                    }
                  }
                  try {
                    await safeSend(dc, convMsg)
                    console.debug('Sent conversation.item.create', convMsg)
                  } catch (e) { console.warn('Failed to send conversation.item.create', e) }

                  // After sending the function output, ask the service to create a response so the model continues
                  const respCreate = { type: 'response.create' }
                  try {
                    await sleep(500)
                    await safeSend(dc, respCreate)
                    console.debug('Sent response.create')
                  } catch (e) { console.warn('Failed to send response.create', e) }
                  // Also add assistant-visible transcript to UI
                  const outText = (typeof fnBody === 'object') ? (JSON.stringify(fnBody, null, 2)) : String(fnBody)
                  setTranscripts(prev => [...prev, { id: 'assistant-fn-' + String(Date.now()), speaker: 'assistant', text: outText, partial: false }])
                } catch (e) {
                  console.error('Function execution failed', e)
                }
              }
            }
            // we've handled function items; continue to extract any textual content below
          }
        }
        if (isResponseDone) {
          // payload.content is often an array of items with { type: 'audio'|'output_text', transcript: '...' }
          const contents = Array.isArray(payload?.content) ? payload.content : []
          const joined = contents.map((c: any) => (typeof c?.transcript === 'string' ? c.transcript : extractTextFromEvent(c) || '')).filter(Boolean).join('\n')
          if (joined) {
            setTranscripts(prev => [...prev, { id: 'assistant-done-' + String(Date.now()), speaker: 'assistant', text: joined, partial: false }])
          }
          return
        }

        if (typeof name === 'string' && /conversation\.item\.input_audio_transcription\.failed/i.test(name)) {
          console.debug('ondatachannel input_audio_transcription.failed payload:', payload)
          if (payload?.error) console.debug('ondatachannel input_audio_transcription.error:', payload.error)
        }

        // Ignore incoming user-side transcription events entirely (we only display assistant utterances)
        if (isUserDelta || isUserCompleted) {
          // intentionally no-op: do not add user transcripts to UI
          return
        }

        // Decide speaker: many realtime schemas emit "response.*" for assistant
        const eventType = payload?.type || payload?.event || payload?.name || null
        let speaker: 'user' | 'assistant' = 'assistant'
        if (eventType && /response|assistant|output_audio_transcript/i.test(String(eventType))) speaker = 'assistant'
        if (text) {
          // Upsert using explicit transcript id matching so we don't overwrite older final messages
          const isFinal = (!!payload?.is_final) || (!!payload?.final) || (!!payload?.committed)
          const id = payload?.transcript_id || payload?.id || (speaker + '-' + String(payload?.sequence || Date.now()))
          upsertTranscript(speaker, String(id), text, isFinal)
        }
      }
    } catch (e) {
      console.warn('createDataChannel failed', e)
    }

    // Remove Web Speech API recognition fallback: we intentionally do not add local user transcripts

    // Handle remote track (playback)
    pc.ontrack = (ev) => {
      const remoteStream = ev.streams && ev.streams[0]
      if (remoteStream) {
        const audioEl = document.getElementById('remote-audio') as HTMLAudioElement
        if (audioEl) {
          audioEl.srcObject = remoteStream
          audioEl.play().catch(() => {})
        }
      }
    }

    // In case the server opens a data channel to us
    pc.ondatachannel = (e) => {
      const channel = e.channel
      console.log('ondatachannel', channel.label)
      channel.onmessage = async (ev: any) => {
        // DEBUG: raw ondatachannel message
        console.debug('ondatachannel raw message:', ev.data)
        let payload: any = null
        try {
          const parsed = JSON.parse(ev.data)
          payload = Array.isArray(parsed) ? (parsed.find((p: any) => p && (p.content || p.transcript || p.name || p.type)) || parsed[0]) : parsed
        } catch (_) {
          payload = { text: String(ev.data) }
        }
        // Diagnostic: explicitly detect tool_call shapes in payload and log them for debugging
        try {
          const hasToolCall = Boolean(payload && (payload.tool_call || payload.toolCall || payload.toolCallRequest || payload.tool_call_request || (payload.response && (payload.response.tool_call || payload.response.toolCall))))
          if (hasToolCall) {
            console.info('Detected tool_call payload on ondatachannel:', payload)
          }
        } catch (_) {}
        const text = extractTranscriptFromPayload(payload) || extractTextFromEvent(payload)

        const name = payload?.name || payload?.type || payload?.event || payload?.topic || null
        const isUserDelta = typeof name === 'string' && /conversation\.item\.audio_transcription\.delta/i.test(name)
        const isUserCompleted = typeof name === 'string' && /conversation\.item\.audio_transcription\.completed/i.test(name)

// If event is response.done or response.output_item.done, first check for function_call items and handle them
        const isResponseDone = typeof name === 'string' && /response\.done|response\.output_item\.done|response\.content_part|response\.content_part\.done/i.test(name)
        // If this is an output_item.done that contains a function_call item, process it per Zenn/MS pattern
        if (isResponseDone) {
          const items = Array.isArray(payload?.content) ? payload.content : (payload?.output ? payload.output : (payload?.item ? [payload.item] : []))
          const functionItems = items.filter((it: any) => it && (it.type === 'function_call' || (it.item && it.item.type === 'function_call') || (it.output && Array.isArray(it.output) && it.output.some((o:any)=>o?.type==='function_call'))))
          if (functionItems && functionItems.length) {
            for (const fit of functionItems) {
              const item = fit.item || fit || (fit.output && fit.output.find((o:any)=>o?.type==='function_call'))
              const callId = item.call_id || item.callId || item.id || null
              const funcName = item.name || item.function?.name || null
              let args: any = {}
              try {
                if (typeof item.arguments === 'string' && item.arguments.trim()) args = JSON.parse(item.arguments)
                else if (typeof item.arguments === 'object') args = item.arguments
                else args = {}
              } catch (e) { args = { raw: item.arguments } }

              if (funcName && channel && (channel.readyState === 'open')) {
                try {
                  const fnRes = await fetch(`/api/functions/${encodeURIComponent(funcName)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
                  const fnBodyText = await fnRes.text()
                  let fnBody: any = null
                  try { fnBody = JSON.parse(fnBodyText) } catch (_) { fnBody = { raw: fnBodyText } }

                  const convMsg = { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: fnBody } }
                  try {
                    await safeSend(channel, convMsg)
                    console.debug('Sent conversation.item.create', convMsg)
                  } catch (e) { console.warn('Failed to send conversation.item.create', e) }

                  const respCreate = { type: 'response.create' }
                  try {
                    await sleep(500)
                    await safeSend(channel, respCreate)
                    console.debug('Sent response.create')
                  } catch (e) { console.warn('Failed to send response.create', e) }

                  const outText = (typeof fnBody === 'object') ? (JSON.stringify(fnBody, null, 2)) : String(fnBody)
                  setTranscripts(prev => [...prev, { id: 'assistant-fn-' + String(Date.now()), speaker: 'assistant', text: outText, partial: false }])
                } catch (e) {
                  console.error('Function execution failed', e)
                }
              }
            }
            // don't return here; allow textual extraction below
          }
          const contents = Array.isArray(payload?.content) ? payload.content : []
          const joined = contents.map((c: any) => (typeof c?.transcript === 'string' ? c.transcript : extractTextFromEvent(c) || '')).filter(Boolean).join('\n')
          if (joined) {
            setTranscripts(prev => [...prev, { id: 'assistant-done-' + String(Date.now()), speaker: 'assistant', text: joined, partial: false }])
          }
          return
        }

        // Ignore user transcription events
        if (isUserDelta || isUserCompleted) {
          return
        }

        const eventType = payload?.type || payload?.event || payload?.name || null
        let speaker: 'user' | 'assistant' = 'assistant'
        if (eventType && /response|assistant|output_audio_transcript/i.test(String(eventType))) speaker = 'assistant'
        const isFinal = (!!payload?.is_final) || (!!payload?.final) || (!!payload?.committed)
        const id = payload?.transcript_id || payload?.id || (speaker + '-' + String(payload?.sequence || Date.now()))
        if (text) {
          // use upsert to preserve chat history and only update matching partial by id
          upsertTranscript(speaker, String(id), text, isFinal)
        }
      }
    }

    setStatus('fetching-session')
    const res = await fetch('/api/realtime/session')
    if (!res.ok) {
      setStatus('session-failed')
      return
    }
    const session = await res.json()
    // DEBUG: expose the raw session object in console to inspect available fields
    console.debug('realtime session raw:', session?.raw ?? session)
    // Server returns normalized object: { raw, client_secret, realtimeUrl }
    const ephemeralKey = session?.client_secret
    const candidateRealtimeUrl = session?.realtimeUrl || null
    if (!ephemeralKey) {
      console.error('No ephemeral client_secret returned from server', session)
      setStatus('no-ephemeral')
      return
    }
  setStatus('creating-offer')
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Determine target realtime endpoint. Prefer server-provided realtimeUrl; otherwise construct from public region env.
    // Recommended region env: NEXT_PUBLIC_AZURE_OPENAI_REGION (e.g. 'eastus2')
    const region = (process.env.NEXT_PUBLIC_AZURE_OPENAI_REGION) || undefined
    let targetUrl = candidateRealtimeUrl
    if (!targetUrl) {
      if (!region) {
        console.error('No realtimeUrl from server and NEXT_PUBLIC_AZURE_OPENAI_REGION not set')
        setStatus('no-target')
        return
      }
      // Per docs: https://<region>.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=<deployment>
      const deployment = session?.raw?.deployment || session?.raw?.model || process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT
      if (!deployment) {
        console.error('No deployment/model found for realtime URL construction', session)
        setStatus('no-deployment')
        return
      }
      targetUrl = `https://${region}.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${encodeURIComponent(deployment)}`
    }

    const sdpResp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${ephemeralKey}`
      },
      body: offer.sdp
    })

    if (!sdpResp.ok) {
      setStatus('sdp-failed')
      return
    }
    const answerSdp = await sdpResp.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    setStatus('connected')
  }

  function stop() {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    setStatus('stopped')
  }

  return (
    <div style={{padding: 20}}>
      <h2>AI カスタマーサポート - 音声対話システム</h2>
      <p>ステータス: {status}</p>
      <div>
        <button onClick={start} disabled={status === 'connected' || status === 'creating-pc'}>開始</button>
        <button onClick={stop}>停止</button>
      </div>
      <audio id="remote-audio" autoPlay controls style={{marginTop: 12}} />
      <div style={{marginTop: 12}}>
        <small>クレジットカード情報変更など、お気軽にお問い合わせください。その他の問い合わせは有人オペレーターにおつなぎいたします。</small>
      </div>
      <div style={{marginTop:12}}>
        <h4>会話履歴</h4>
  <div ref={chatContainerRef} style={{border:'1px solid #ddd', padding:8, height:320, overflow:'auto', background:'#ffffff', display:'flex', flexDirection:'column', gap:8}}>
          {transcripts.length === 0 ? (
            <div style={{color:'#666', textAlign:'center', padding:12}}>No speech yet</div>
          ) : null}
          {/* Render only assistant transcripts */}
          {transcripts.filter(t => t.speaker === 'assistant').map(t => (
            <div key={t.id} style={{display:'flex', justifyContent: t.speaker === 'user' ? 'flex-end' : 'flex-start'}}>
              <div style={{maxWidth:'75%', padding:'10px 12px', borderRadius:12, background: t.speaker === 'user' ? '#0b86ff' : '#f1f5f9', color: t.speaker === 'user' ? '#fff' : '#111', boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12, marginBottom:6, opacity:0.8}}>{t.speaker === 'user' ? 'You' : 'Assistant'}</div>
                <div style={{whiteSpace:'pre-wrap'}}>{t.text}</div>
                {t.partial ? <div style={{fontSize:11, opacity:0.7, marginTop:6}}>(partial)</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Best-effort extraction of text from incoming data channel event payloads.
function extractTextFromEvent(obj: any): string | null {
  if (!obj) return null
  // Common fields used by different realtime event schemas
  if (typeof obj === 'string') return obj
  if (obj.text && typeof obj.text === 'string') return obj.text
  if (obj.transcript && typeof obj.transcript === 'string') return obj.transcript
  if (obj.payload) return extractTextFromEvent(obj.payload)
  if (obj.message) return extractTextFromEvent(obj.message)
  // Try to find any string deeply
  try {
    const stack = [obj]
    while (stack.length) {
      const cur = stack.pop()
      if (!cur) continue
      if (typeof cur === 'string') return cur
      if (Array.isArray(cur)) { for (const v of cur) stack.push(v) }
      else if (typeof cur === 'object') {
        for (const k of Object.keys(cur)) {
          const v = cur[k]
          if (typeof v === 'string') return v
          if (typeof v === 'object') stack.push(v)
        }
      }
    }
  } catch (_) {}
  return null
}

// Prefer transcripts from payload.content[*].transcript when present.
function extractTranscriptFromPayload(payload: any): string | null {
  if (!payload) return null
  try {
    // If payload.content is an array of items that include 'transcript', join them
    if (Array.isArray(payload.content) && payload.content.length > 0) {
      const pieces = payload.content.map((item: any) => {
        if (!item) return ''
        if (typeof item.transcript === 'string' && item.transcript.trim()) return item.transcript.trim()
        // sometimes the transcript is nested under 'payload' or 'message'
        if (item.payload) return extractTextFromEvent(item.payload) || ''
        if (item.message) return extractTextFromEvent(item.message) || ''
        // fallback: try to stringify any text-like parts
        return extractTextFromEvent(item) || ''
      }).filter(Boolean)
      if (pieces.length) return pieces.join('\n')
    }

    // Some realtime items embed at top level as payload.transcript or content[0].text
    if (typeof payload.transcript === 'string' && payload.transcript.trim()) return payload.transcript.trim()
    if (payload.content && typeof payload.content === 'string' && payload.content.trim()) return payload.content.trim()
  } catch (_) {}
  return null
}
