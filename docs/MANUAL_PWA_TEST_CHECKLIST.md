# Manual installed-PWA verification checklist

Record device model, OS version, browser version, build/commit, tester, date, and the result of every item. Preserve a backup before destructive/update checks. A checked item means it was performed on the named physical device—not inferred from desktop automation.

## iPhone / iOS

- [ ] Open the production HTTPS URL in Safari and use **Share → Add to Home Screen**.
- [ ] Launch from the Home Screen and confirm standalone display, icon, theme color, and safe-area layout.
- [ ] Complete goal details, force-close, reopen, and confirm the next setup step and prior values.
- [ ] Repeat recovery after schedule, equipment/pull-up, baseline measurements, and audio preference.
- [ ] Complete onboarding, force-close, reopen, and confirm Today opens at Foundation Week 1 / Full Body A with zero history and streak.
- [ ] Start a workout; record readiness, a substitution, load, sets, and an active rest. Lock/unlock and confirm the snapshot is unchanged.
- [ ] Force-close during that workout; reopen and test Resume. Repeat with End as partial and Discard on separate sessions.
- [ ] Start the run coach with voice guidance. Lock for several phase changes; verify warnings, phase timing, media controls, and recovery position.
- [ ] Repeat run checks with chimes-only and visual-only modes; confirm visual-only makes no lock-screen reliability promise.
- [ ] Download the selected run audio, enable Airplane Mode, force-close, launch from Home Screen, open Today/programme/run preview, and confirm local writes and expected cached audio work.
- [ ] With saved onboarding, workouts, meals, measurements, progression, run history, and an active workout, install the next build; accept/reload the update and verify every record remains.
- [ ] Export a backup to Files, reset with typed confirmation, restore from Files from the onboarding screen, reopen, and compare rotation/history/measurements/progression.
- [ ] Check keyboard/switch navigation where available, VoiceOver labels, focus order, light/dark contrast, larger text, reduced motion, and timer states not conveyed only by colour.

## Android

- [ ] Open the production HTTPS URL in Chrome and use **Install app** / **Add to Home screen**.
- [ ] Launch from the installed icon and confirm standalone display, icon, theme color, and system-bar layout.
- [ ] Complete goal details, close from Recents, reopen, and confirm the next setup step and prior values.
- [ ] Repeat recovery after schedule, equipment/pull-up, baseline measurements, and audio preference.
- [ ] Complete onboarding, close from Recents, reopen, and confirm Today opens at Foundation Week 1 / Full Body A with zero history and streak.
- [ ] Start a workout; record readiness, a substitution, load, sets, and active rest. Lock/unlock and confirm restoration.
- [ ] Swipe the app away; reopen and test Resume. Repeat End as partial and Discard on separate sessions.
- [ ] Test voice coach through lock/unlock, notification/media controls, Bluetooth/headset controls, and several phase transitions.
- [ ] Repeat chimes-only and visual-only guidance.
- [ ] Download run audio, enable Airplane Mode, close from Recents, launch, open Today/programme/run preview, record local data, and confirm expected cached audio.
- [ ] Update an installed build containing real saved data and an active workout; verify IndexedDB and recovery survive activation/reload.
- [ ] Export to device storage/Drive, reset with typed confirmation, restore from onboarding, reopen, and compare all records.
- [ ] Check TalkBack, keyboard/switch access, focus, light/dark contrast, font scaling, reduced motion, and timer/status alternatives to colour.

## Result record

| Platform/device | Build | Passed | Failed | Blockers / evidence |
| --- | --- | --- | --- | --- |
| iPhone | Not tested | 0 | 0 | Requires physical-device verification |
| Android | Not tested | 0 | 0 | Requires physical-device verification |
