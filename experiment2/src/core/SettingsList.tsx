import { useEngine } from './engine'
import type { FlowDef } from './flowTypes'

/** Every flow of the running app on its settings page (Account, Profile). Same in both levels. */
export function SettingsList() {
  const { app } = useEngine()
  return (
    <div className="card settings-card">
      {app.registry.flows.map((flow) => (
        <SettingsRow key={flow.id} flow={flow} />
      ))}
    </div>
  )
}

/** A flow can be changed here once it has been answered (or, for settings, shown). */
function SettingsRow({ flow }: { flow: FlowDef }) {
  const { app, state, chooseFlow } = useEngine()
  const applicable = app.registry.isApplicable(flow.id, state.flows)
  const value = state.flows[flow.id]
  const editable =
    applicable && (state.settled.includes(flow.id) || (flow.kind === 'setting' && state.shown.includes(flow.id)))

  let note: string | null = null
  if (!applicable && flow.dependsOn) note = `Needs ${app.registry.getFlow(flow.dependsOn.flowId).account.label.toLowerCase()} on`
  else if (!editable) note = 'Not set yet'

  return (
    <div className="account-row" role="group" aria-label={flow.account.label}>
      <div className="account-label">{flow.account.label}</div>
      {note ? (
        <div className="muted small">{note}</div>
      ) : (
        <div className="segmented">
          {flow.options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => value !== option && chooseFlow(flow.id, option, 'account_page')}
            >
              {flow.account.labels[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
