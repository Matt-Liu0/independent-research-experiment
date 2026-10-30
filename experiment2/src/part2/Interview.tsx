import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { logEvent } from '../log/logEvent'
import { MAX_MESSAGE_CHARS, type ChatTurn, type ChatView, type Interviewer } from './interviewer'
import { BRIEFING } from './sessionText'
import type { Part2StageProps } from './stageProps'

export function Briefing({ advance }: Part2StageProps) {
  return (
    <main className="page page-wide">
      {BRIEFING.isDraft && <p className="notice notice-warn small">DRAFT briefing text. Review before launch.</p>}
      <h1>{BRIEFING.title}</h1>
      {BRIEFING.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
        {BRIEFING.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="page-spacer" />
      <button type="button" className="btn btn-study" onClick={() => advance()}>
        {BRIEFING.start}
      </button>
    </main>
  )
}

type Status = 'loading' | 'ready' | 'waiting' | 'error'

/**
 * New assistant messages appear a word at a time, as chat assistants stream their replies (about
 * 30 words a second). The text arrives whole; only its display is paced. 0 shows it at once (tests).
 */
export const CHAT_TIMING = { wordMs: 33 }

const words = (text: string) => text.match(/\S+\s*/g) ?? []

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Index just past the last participant turn: the messages the assistant has not yet streamed. */
function afterLastAnswer(turns: ChatTurn[]): number {
  for (let i = turns.length - 1; i >= 0; i--) if (turns[i].role === 'participant') return i + 1
  return 0
}

/**
 * The interview. The transcript lives on the server; this page only shows it. Only lengths and
 * timings are logged here, never the text.
 */
export function Chat({ advance, interviewer }: Part2StageProps & { interviewer: Interviewer }) {
  const [view, setView] = useState<ChatView | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState<string | null>(null)
  // Turns fully on screen, and how many words of the next one (an assistant message being streamed).
  const [shown, setShown] = useState(0)
  const [shownWords, setShownWords] = useState(0)
  const log = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  const load = () => {
    setStatus('loading')
    interviewer.send(null, 0).then(
      (v) => {
        // After a reload, earlier messages are shown at once; only the latest reply is streamed.
        setShown(afterLastAnswer(v.turns))
        setShownWords(0)
        setView(v)
        setStatus('ready')
      },
      (err) => {
        logEvent('error', { where: 'chat_load', message: String(err) })
        setStatus('error')
      },
    )
  }

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    load()
    // Once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const turns = view?.turns ?? []
  const visible = Math.min(shown, turns.length)
  const streaming = visible < turns.length

  // Participant turns appear at once; assistant turns a word at a time.
  useEffect(() => {
    if (!streaming) return
    const next = turns[visible]
    const total = words(next.text).length
    const finish = () => {
      setShown(visible + 1)
      setShownWords(0)
    }
    if (next.role === 'participant' || CHAT_TIMING.wordMs === 0 || reducedMotion()) return finish()
    // The last word lands in the finished message, so the streaming one never shows the full text.
    const t = setTimeout(() => (shownWords + 1 >= total ? finish() : setShownWords(shownWords + 1)), CHAT_TIMING.wordMs)
    return () => clearTimeout(t)
  }, [streaming, turns, visible, shownWords])

  // Keep the newest message in view by scrolling the conversation box only, never the page.
  useEffect(() => {
    const el = log.current
    if (el) el.scrollTop = el.scrollHeight
  }, [view, status, shown, shownWords])

  const send = (text: string) => {
    if (!view || !text.trim() || status === 'waiting' || streaming) return
    const started = performance.now()
    setStatus('waiting')
    setFailed(null)
    // Shown straight away; replaced by the server's copy when the reply comes.
    setView({ ...view, turns: [...view.turns, { role: 'participant', text: text.trim() }] })
    setDraft('')
    logEvent('chat', { event: 'sent', chars: text.trim().length, turn: view.turns.length })
    interviewer.send(text, view.turns.length).then(
      (next) => {
        logEvent('chat', { event: 'reply', ms: Math.round(performance.now() - started), done: next.done })
        setView(next)
        setStatus('ready')
      },
      (err) => {
        logEvent('chat', { event: 'error', message: String(err) })
        // Put the message back so it can be sent again.
        setView(view)
        setDraft(text)
        setFailed("The assistant couldn't reply. Please try sending again.")
        setStatus('ready')
      },
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(draft)
  }

  // Enter sends; Shift+Enter adds a line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(draft)
    }
  }

  if (status === 'error' && !view) {
    return (
      <main className="page page-wide">
        <h1>Chat with the assistant</h1>
        <p className="notice">We couldn't connect to the assistant. Check your connection and try again.</p>
        <button type="button" className="btn btn-study" onClick={load}>
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="page page-wide chat-page">
      <h1>Chat with the assistant</h1>
      <div ref={log} className="chat-log" role="log" aria-live="polite" aria-label="Conversation">
        {turns.slice(0, visible).map((t, i) => (
          <div key={i} className={`chat-bubble chat-${t.role}`}>
            <span className="visually-hidden">{t.role === 'interviewer' ? 'Assistant: ' : 'You: '}</span>
            {t.text}
          </div>
        ))}
        {streaming && shownWords > 0 && (
          // Hidden from screen readers until complete, so the message is read once, not word by word.
          <div className="chat-bubble chat-interviewer" aria-hidden="true">
            {words(turns[visible].text).slice(0, shownWords).join('')}
          </div>
        )}
        {(status === 'waiting' || status === 'loading' || (streaming && shownWords === 0)) && (
          <div className="chat-bubble chat-interviewer chat-typing" aria-label="The assistant is typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      {failed && (
        <p className="notice notice-warn small" role="alert">
          {failed}
        </p>
      )}
      {view?.done && !streaming ? (
        <button
          type="button"
          className="btn btn-study"
          onClick={() => {
            logEvent('chat', { event: 'continue', turns: view.turns.length })
            advance()
          }}
        >
          Continue
        </button>
      ) : (
        <form className="chat-form" onSubmit={onSubmit}>
          <label htmlFor="chat-input" className="visually-hidden">
            Your message
          </label>
          <textarea
            id="chat-input"
            className="input chat-input"
            rows={3}
            maxLength={MAX_MESSAGE_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your answer, then press Enter"
            disabled={!view}
          />
          <div className="row chat-actions">
            <span className="muted small">
              {draft.length > MAX_MESSAGE_CHARS - 200 ? `${MAX_MESSAGE_CHARS - draft.length} characters left` : ''}
            </span>
            <button type="submit" className="btn btn-study chat-send" disabled={!draft.trim() || status !== 'ready' || streaming}>
              Send
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
