// Audio transcription via Groq Whisper (OpenAI-compatible endpoint).
// Used by the Goal Discovery form's audio-upload affordances on block-0
// "Other" and the three Kinder questions.

const GROQ_TRANSCRIBE_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo'

// Reasonable client-side limit. Groq's Whisper endpoint accepts up to
// ~25 MB; we cap a bit below that to leave headroom and to keep the
// upload responsive on slow connections.
export const MAX_AUDIO_MB = 20

export class TranscribeError extends Error {
  constructor(public readonly kind: 'no-key' | 'too-large' | 'network' | 'api', message: string) {
    super(message)
    this.name = 'TranscribeError'
  }
}

export async function transcribeAudio(file: File, apiKey: string): Promise<string> {
  if (!apiKey) throw new TranscribeError('no-key', 'No Groq API key configured')
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > MAX_AUDIO_MB) {
    throw new TranscribeError('too-large', `File is ${sizeMB.toFixed(1)} MB; max ${MAX_AUDIO_MB} MB`)
  }

  const form = new FormData()
  form.append('file', file)
  form.append('model', GROQ_WHISPER_MODEL)
  // No language hint — Whisper auto-detects. Indian English + code-switching works.

  let res: Response
  try {
    res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
  } catch (err) {
    throw new TranscribeError('network', err instanceof Error ? err.message : 'Network error')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new TranscribeError('api', `Groq returned ${res.status}: ${body.slice(0, 200) || 'unknown error'}`)
  }

  const data = (await res.json()) as { text?: string }
  return (data.text ?? '').trim()
}
