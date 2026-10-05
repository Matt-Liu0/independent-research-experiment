import { useEffect, useId, useRef } from 'react'
import { useBramble, type DecisionSource } from './BrambleContext'
import { getFlow, levelOf } from './flows'
import type { FlowDef, FlowId, LevelDef } from './types'

/** Visual prominence of a choice button (see data-emphasis). */
export type Emphasis = 'primary' | 'secondary' | 'link' | 'plain'

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
  /** Options that can't be picked yet (e.g. Allow before choosing exact/general in neutral). */
  disabledOptions?: string[]
  /** Called after the choice is logged. */
  onChosen?: (value: string) => void
  /** Where the choice is made; 'rewards_page' when changing an answered offer. */
  source?: DecisionSource
}

/**
 * Draws one flow in the participant's friction level and logs every choice.
 * Prompts draw only their buttons (the screen shows the title); settings draw their own text.
 */
export function FlowChoice({ flowId, layout = 'stack', tone = 'green', disabledOptions = [], onChosen, source = 'prompt' }: Props) {
  const { friction, state, chooseFlow } = useBramble()
  const flow = getFlow(flowId)
  const level = levelOf(flow, friction)
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
        disabledOptions={disabledOptions}
        onChoose={choose}
      />
    )
  } else if (level.control === 'switch') {
    control = <SwitchSetting flow={flow} value={value} onChoose={choose} />
  } else if (level.control === 'checkbox') {
    control = <CheckboxSetting flow={flow} value={value} onChoose={choose} />
  } else {
    control = <SelectSetting flow={flow} value={value} onChoose={choose} />
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
  disabledOptions,
  onChoose,
}: {
  flow: FlowDef
  level: LevelDef
  layout: 'row' | 'stack'
  tone: 'green' | 'berry'
  disabledOptions: string[]
  onChoose: (value: string) => void
}) {
  // How prominent each option looks. Also written to data-emphasis, so the Experiment 4
  // harness can describe the screen ("primary" button) without reading visual styles.
  const emphasisFor = (option: string): Emphasis => {
    if (level.emphasis === null) return 'plain'
    if (option === level.emphasis) return 'primary'
    if (option === flow.privacyOption) return 'link'
    return 'secondary'
  }
  const classFor = (option: string) =>
    ({ primary: `btn btn-${tone}`, secondary: 'btn btn-outline', link: 'btn btn-link', plain: 'btn btn-equal' })[emphasisFor(option)]
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
          disabled={disabledOptions.includes(option)}
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

function SelectSetting({ flow, value, onChoose }: { flow: FlowDef; value: string | null; onChoose: (v: string) => void }) {
  const labelId = useId()
  return (
    <div className="setting setting-select" role="group" aria-labelledby={labelId}>
      <SettingText flow={flow} labelId={labelId} />
      <div className="select-buttons" data-flow-control>
        {flow.options.map((option) => (
          <button
            key={option}
            type="button"
            className="btn btn-equal"
            data-emphasis="plain"
            aria-pressed={value === option}
            onClick={() => onChoose(option)}
          >
            {flow.labels[option]}
          </button>
        ))}
      </div>
    </div>
  )
}
