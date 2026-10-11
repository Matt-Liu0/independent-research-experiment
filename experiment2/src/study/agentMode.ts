// Experiment 4: AI agents use the same app through an MCP harness that drives a browser.
// An agent link starts a fresh episode straight at the tasks, with the given nudged-screen
// pattern (usually the matched participant's) and task order. Data stays in the page; the harness reads it from
// window.__brambleAgent and saves it. Nothing on screen reveals the level or that this is an episode.
import type { StudyEvent } from '../log/logEvent'
import { patternKey } from '../core/units'
import { detectDevice } from './device'
import type { AgentEntry } from './prolific'
import { MemoryStore } from './store'
import { newParticipant, type ParticipantDoc } from './types'

export function agentParticipant(agent: AgentEntry, now = new Date()): ParticipantDoc {
  return {
    ...newParticipant({ prolificPid: `AGENT-${agent.episodeId}`, studyId: 'AGENT', sessionId: agent.episodeId }, now),
    stage: 'tasks',
    pattern: patternKey(agent.nudgedUnits),
    taskOrder: agent.taskOrder,
    device: detectDevice(),
    agent: {
      episodeId: agent.episodeId,
      model: agent.model,
      condition: agent.condition,
      run: agent.run,
      participant: agent.participant,
    },
  }
}

export function createAgentStore(agent: AgentEntry): MemoryStore {
  return new MemoryStore({ preset: agentParticipant(agent) })
}

/** What the harness can read from the page. Versioned so the harness can check compatibility. */
export interface AgentApi {
  apiVersion: 1
  episodeId: string
  /** True once the sixth task is finished. */
  isDone(): boolean
  /** The participant-style record: pattern, task order, task outcomes, final app state. */
  getRecord(): ParticipantDoc | null
  /** Every event, in order, in the same format as for participants. */
  getEvents(): StudyEvent[]
}

export function exposeAgentApi(store: MemoryStore, agent: AgentEntry, win: Window = window): AgentApi {
  const api: AgentApi = {
    apiVersion: 1,
    episodeId: agent.episodeId,
    isDone: () => store.participant?.stage === 'done',
    getRecord: () => (store.participant ? structuredClone(store.participant) : null),
    getEvents: () => structuredClone(store.events),
  }
  ;(win as Window & { __brambleAgent?: AgentApi }).__brambleAgent = api
  return api
}
