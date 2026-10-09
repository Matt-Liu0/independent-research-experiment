import { useEffect, useId, useRef } from 'react'
import { useBramble, type DecisionSource } from './BrambleContext'
import { getFlow, levelOf } from './flows'
import type { FlowDef, FlowId, LevelDef } from './types'

/** Visual prominence of a choice button (see data-emphasis). */
export type Emphasis = 'primary' | 'plain'

/** Logs prompt_shown when the element first scrolls into view (immediately where IntersectionObserver is missing). */
export function useShownWhenVisible(id: FlowId) {
  const { showFlow } = useBramble()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      showFlow(id)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          showFlow(id)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [id, showFlow])
  return ref
}

interface Props {
  flowId: FlowId
  /** Prompt buttons side by side (Rewards, background location) or stacked (sheets). */
  layout?: 'row' | 'stack'
  /** Filled-button color for the emphasized option. */
  tone?: 'green' | 'berry'
  /** Called after the choice is logged. */
  onChosen?: (value: string) => void
  /** Where the choice is made; 'rewards_page' when changing an answered offer. */
  source?: DecisionSource
}

/**
 * Draws one flow at the participant's friction level for its screen, and logs every choice.
 * Prompts draw only their buttons (the screen shows the title); settings draw their own text.
 */
export function FlowChoice({ flowId, layout = 'stack', tone = 'green', onChosen, source = 'prompt' }: Props) {
  const { frictionOf, state, chooseFlow } = useBramble()
  const flow = getFlow(flowId)
  const level = levelOf(flow, frictionOf(flowId))
  const ref = useShownWhenVisible(flowId)
  const value = state.flows[flowId] ?? level.default

  const choose = (next: string) => {
    chooseFlow(flowId, next, source)
    onChosen?.(next)
  }

  let control
  if (flow.kind === 'prompt') {
    control = (
      <PromptButtons
        flow={flow}
        level={level}
        layout={layout}
        tone={tone}
        onChoose={choose}
      />
    )
  } else if (level.control === 'switch') {
    control = <SwitchSetting flow={flow} value={value} onChoose={choose} />
  } else if (level.control === 'checkbox') {
    control = <CheckboxSetting flow={flow} value={value} onChoose={choose} />
  } else {
    throw new Error(`Setting ${flowId} needs a switch or checkbox control`)
  }

  return (
    <div ref={ref} className={`flow flow-${flow.kind}`} data-flow={flowId}>
      {control}
    </div>
  )
}

function PromptButtons({
  flow,
  level,
  layout,
  tone,
  onChoose,
}: {
  flow: FlowDef
  level: LevelDef
  layout: 'row' | 'stack'
  tone: 'green' | 'berry'
  onChoose: (value: string) => void
}) {
  // As in Utz et al. (2019): only the emphasized (sharing) option is highlighted; every other
  // option looks exactly like a non-nudging button. Also written to data-emphasis, so the
  // Experiment 4 harness can describe the screen ("primary" button) without reading styles.
  const emphasisFor = (option: string): Emphasis => (level.emphasis !== null && option === level.emphasis ? 'primary' : 'plain')
  const classFor = (option: string) => (emphasisFor(option) === 'primary' ? `btn btn-${tone}` : 'btn btn-equal')
  // Nudged puts the emphasized option first; neutral keeps the config order.
  const options =
    level.emphasis === null ? flow.options : [level.emphasis, ...flow.options.filter((o) => o !== level.emphasis)]
  return (
    <div className={`prompt-buttons prompt-buttons-${layout}`} data-flow-control>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={classFor(option)}
          data-emphasis={emphasisFor(option)}
          onClick={() => onChoose(option)}
        >
          {flow.labels[option]}
        </button>
      ))}
    </div>
  )
}

function SettingText({ flow, labelId }: { flow: FlowDef; labelId: string }) {
  return (
    <div className="setting-text">
      <div id={labelId} className="setting-title">
        {flow.title}
      </div>
      {flow.description && <div className="setting-description">{flow.description}</div>}
    </div>
  )
}

function SwitchSetting({ flow, value, onChoose }: { flow: FlowDef; value: string | null; onChoose: (v: string) => void }) {
  const labelId = useId()
  const [onOption, offOption] = flow.options
  const on = value === onOption
  return (
    <div className="setting setting-switch">
      <SettingText flow={flow} labelId={labelId} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        className="switch"
        data-flow-control
        onClick={() => onChoose(on ? offOption : onOption)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  )
}

function CheckboxSetting({ flow, value, onChoose }: { flow: FlowDef; value: string | null; onChoose: (v: string) => void }) {
  const id = useId()
  const [checkedOption, uncheckedOption] = flow.options
  const checked = value === checkedOption
  return (
    <div className="setting setting-checkbox">
      <input
        id={id}
        type="checkbox"
        className="checkbox"
        checked={checked}
        data-flow-control
        onChange={() => onChoose(checked ? uncheckedOption : checkedOption)}
      />
      <label htmlFor={id}>{flow.title}</label>
    </div>
  )
}
