import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { logEvent } from '../log/logEvent'
import type { StageProps } from './stageProps'
import type { DeviceInfo } from './types'

interface Props extends StageProps {
  detect: () => DeviceInfo
  /** Testing on a computer (&anydevice=1, local or emulator runs only). */
  skipCheck?: boolean
}

export function DeviceCheck({ detect, skipCheck = false, mode, update, advance }: Props) {
  // A skipped check is recorded, so test runs are easy to find and drop.
  const [device] = useState(() => {
    const detected = detect()
    return skipCheck && !detected.passedCheck ? { ...detected, checkSkipped: true } : detected
  })
  // Demo links are for researchers, who may preview on a computer.
  const failed = !device.passedCheck && mode !== 'demo' && !device.checkSkipped
  const [qr, setQr] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    logEvent('stage', { name: 'device_check', passed: device.passedCheck, skipped: device.checkSkipped === true })
    if (failed) update({ device })
    else advance({ device })
  }, [device, failed, update, advance])

  useEffect(() => {
    if (!failed) return
    QRCode.toDataURL(window.location.href, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null))
  }, [failed])

  if (!failed) return null

  return (
    <main className="page">
      <h1>Please open this on your phone</h1>
      <p>This part of the study only works on a smartphone. Scan this code with your phone's camera to open the same link there.</p>
      {qr && <img src={qr} alt="QR code for this study link" width={220} height={220} style={{ alignSelf: 'center' }} />}
      <p className="muted small">If you can't scan it, open Prolific on your phone and start the study from there.</p>
    </main>
  )
}
