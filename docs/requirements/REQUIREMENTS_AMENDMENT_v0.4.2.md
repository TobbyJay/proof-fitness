# Requirements Amendment v0.4.2 — Lock-Screen Run Coaching

## Approved correction
A running session must not depend on a foreground JavaScript countdown or a single phase chime. The user may be outdoors, wearing an earpiece, and using a locked phone.

## Run structure
- 5-minute comfortable-to-brisk warm-up walk.
- 6 rounds of 1-minute conversational running and 2-minute brisk recovery walking.
- 5-minute easy cool-down walk.
- Total coached media duration: approximately 28 minutes.

## Guidance modes
1. Voice coach, recommended: spoken phase names, round numbers, ten-second warnings, pace and posture cues, and completion instruction.
2. Phase chimes: continuous media track with distinct warnings and transition tones.
3. Visual only: requires the app to remain visible; may request Screen Wake Lock where supported.

## Technical requirement
- Voice coaching is a single continuous downloadable audio programme played through an HTML media element.
- Audio currentTime is the authoritative session clock; JavaScript timers only render the interface.
- Media Session metadata and play/pause/seek handlers are provided where supported.
- The run continues when the user minimises Proof; minimising does not pause audio.
- Calls, audio-route changes, browser suspension, and unsupported operating systems must be handled as interruptions, not falsely counted completion.
- The first run requires an audible test and recommends a brief user-verified lock-screen test.
- No plain PWA may promise reliable background speech on every browser or iPhone. If device validation fails, use screen-awake mode or a future native wrapper.

## Safety and accessibility
- Spoken instructions identify exactly when to run, walk, warm up, and cool down.
- Running remains conversational; recovery walks remain brisk but comfortable.
- Audio volume must permit environmental awareness.
- The app never instructs the user to cross roads or ignore surroundings.
- Visual text and timers remain available if audio is unavailable.
