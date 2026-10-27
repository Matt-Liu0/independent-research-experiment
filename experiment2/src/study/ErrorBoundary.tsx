import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logEvent } from '../log/logEvent'
import { Message } from './Message'

const FAILURES_KEY = 'bramble.failures'

function failureCount(): number {
  try {
    return Number(sessionStorage.getItem(FAILURES_KEY) ?? 0)
  } catch {
    return 0
  }
}

function recordFailure(): void {
  try {
    sessionStorage.setItem(FAILURES_KEY, String(failureCount() + 1))
  } catch {
    // ignore
  }
}

interface State {
  error: Error | null
}

/** Logs the crash, then offers a reload, which resumes from the last saved stage. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordFailure()
    logEvent('error', { where: 'render', message: error.message, stack: info.componentStack?.slice(0, 2000) })
  }

  render() {
    if (!this.state.error) return this.props.children
    // After repeated crashes, tell the participant to stop here; they are still paid for their time.
    if (failureCount() >= 3) {
      return (
        <Message title="Sorry, something isn't working">
          <p>This seems to be a problem on our side. Please contact the researchers. You'll be paid for your time.</p>
        </Message>
      )
    }
    return (
      <Message title="Something went wrong">
        <p>Your progress is saved.</p>
        <button className="btn btn-study" onClick={() => window.location.reload()}>
          Tap to continue
        </button>
      </Message>
    )
  }
}
