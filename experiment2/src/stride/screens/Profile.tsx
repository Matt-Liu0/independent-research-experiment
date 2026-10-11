import { SettingsList } from '../../core/SettingsList'
import { getName } from '../../study/name'

export function Profile() {
  const name = getName()
  return (
    <section className="screen">
      <h1 className="screen-title">Profile</h1>
      <div className="card row">
        <span className="avatar">{(name || 'You').slice(0, 1).toUpperCase()}</span>
        <div style={{ flex: 1 }}>
          <div className="strong">{name || 'Practice profile'}</div>
          <div className="muted small">Practice account · member since this week</div>
        </div>
      </div>
      <h2 className="section-title">Health and privacy settings</h2>
      <SettingsList />
    </section>
  )
}
