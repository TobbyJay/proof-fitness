# Requirements Amendment v0.2 — Media and Rest Alerts

Approved prototype changes requested after Gate 5:

## Form resources

- Each warm-up and exercise form screen uses a direct YouTube watch URL as the primary action.
- The user may leave the PWA to watch in the YouTube app or website.
- A written NHS, ACE or Mayo Clinic resource remains visible as the secondary action.
- The production PWA may offer an inline YouTube player on supported deployed origins, but must always retain an **Open in YouTube** fallback.
- Form cues are stored locally and remain usable offline.

## Rest-complete alerts

- Rest-complete sound is part of the MVP, not an optional future feature.
- The user can select Double bell, Digital beep or Soft chime and can mute the alert.
- The app must prime/resume audio from a user gesture and expose a Test alert action.
- Natural timer expiry plays the selected sound; manual rest completion does not.
- Vibration is attempted where supported and enabled.
- The timer uses a deadline rather than decrement-only counting to correct ordinary timer drift.
- Background/locked-device execution is platform-dependent; production adds a system-notification fallback where supported, but must not claim guaranteed custom ringtone delivery while the browser process is suspended.
