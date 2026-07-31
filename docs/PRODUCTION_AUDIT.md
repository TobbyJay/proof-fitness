# Production integration audit

Audit date: 2026-07-31

Audited baseline: `21dc980936b85482be490812fa964f35366cd019`

Environment: Linux, Node.js 20.20.2, npm 11.14.0, Vite production preview

Automated browser: Google Chrome 150.0.7871.181 through Playwright 1.62.1

## Release recommendation

**READY FOR DEVICE ACCEPTANCE TESTING**

The repository validation, production browser integration suite, accessibility scan, mobile viewport checks, bundle inspection, service-worker replacement test, and simulated-offline test pass. Installed-PWA behavior on physical iPhone and Android devices has not been tested and must not be represented as passed.

## Command record

The pre-change baseline was clean. These baseline commands passed:

| Command | Result |
| --- | --- |
| `npm install` | Passed; dependencies current, 0 vulnerabilities |
| `npm run programme:validate` | Passed; 44 exercises and 10 required templates |
| `npm run check` | Passed |
| `npm test` | Passed |
| `npm run build` | Passed |

Release-candidate results:

| Command | Result |
| --- | --- |
| `npm run programme:validate` | Passed; 44 exercises and 10 required templates |
| `npm run check` | Passed; structure, syntax, domain, and repository tests |
| `npm test` | Passed; 3 test files |
| `npm run build` | Passed; 43 modules transformed |
| `npm run test:integration` | Passed; 23 Chrome/Playwright tests |
| `npm run audit:bundle` | Passed |
| `git diff --check` | Passed |

## Scenario results

| Audit area | Status | Evidence / limitation |
| --- | --- | --- |
| Clean production installation | Automated and passed | Delayed bootstrap proves the loading shell precedes onboarding; all activity stores are empty; initial Foundation state and zero streak are asserted. |
| Partial onboarding recovery | Automated and passed | Every implemented checkpoint, reload, page recreation, persisted values, and failed atomic completion/retry are covered. |
| Completed onboarding recovery | Automated and passed | Reload and same-context page recreation return to Today; separate browser runs restart the preview server against persisted storage-state coverage. |
| Foundation rotation | Automated and passed | Domain rotation and persistence tests cover A → B → C → A, completion ordering, partial/discard behavior, and immutable IDs/versions. |
| Active strength-workout recovery | Automated and passed | Readiness, substitution, selected load, completed set, rest deadline, exact snapshot, reload, new page, and recreated context are asserted. |
| Failed workout persistence | Automated and passed | Injected IndexedDB failures cover set, substitution, selected load, and session completion; actions do not advance and retries do not duplicate. |
| Pull-up-bar lifecycle | Automated and passed | Domain tests cover all four statuses; browser coverage proves installed-and-confirmed resolution and active-snapshot immutability after temporary unavailability and reload. |
| Meals, feelings, and streak | Automated and passed | Planned, approved alternative, missed, other, check-in, reload, evidence rules, optional-session exclusion, and local-midnight/UTC divergence are covered. |
| Measurements and trends | Automated and passed | Empty trend, real weight average, waist/weight persistence, and multiple records are covered. Editing/deleting measurements is not a supported UI operation in this release. |
| Exercise progression | Automated and passed | Repository/domain tests cover the seven audited exercise identities, calibration, independent accepted/deferred/rejected state, no silent increase, and plate infeasibility. Recommendation decision controls are not yet surfaced as a general-purpose UI. |
| Week 4 review | Automated and passed | Browser tests create production-shaped evidence and assert ready, one-week, and two-week recommendations, separate decisions, reload, and retained history. |
| Four-day Lean Athletic transition | Automated and passed | Transition persistence and Lower A start are browser-tested; the complete Lower A → Upper A → Lower B → Upper B exercise contract is domain-tested. |
| Three-day Lean Athletic fallback | Automated and passed | Browser tests switch four-day → three-day → four-day and preserve week/history; transition records are asserted. Full fallback rotation is domain-tested. |
| Approved run–walk regression | Automated and passed | Exact 300-second warm-up, six 60/120-second rounds, 300-second cool-down, 1,680-second total, ten-second cues, audio references, and three modes are asserted. |
| Run persistence and recovery | Automated and passed | Visual guidance, pause, saved position, stale-position disclosure, reload, completion, version, and unique subsequent session IDs are covered. Physical lock-screen reliability remains a device check. |
| Export and restore | Automated and passed | Product/schema/programme manifests, two completed plus one partial workout snapshot, run, meals, check-in, measurements, progression, reset, restore, rotation, no duplicates, and corrupt import are covered. Future-schema rejection is covered by repository tests. |
| Reset | Automated and passed | Warning, cancel preservation, typed confirmation, deletion, onboarding return, backup restore access, and transactional failure behavior are covered. |
| Service-worker update | Automated and passed | A replacement worker removes a stale Proof cache while preserving onboarding, programme state, measurements, and an active workout. A true installed version-A/version-B upgrade remains a device acceptance check. |
| Offline operation | Automated and passed | After install caching, a forced network failure reloads the production shell and permits IndexedDB meal writes and run preview access. Physical-device cached audio playback remains required. |
| Production bundle | Automated and passed | `audit:bundle` rejects listed demo remnants, fixture hooks, cloud/analytics SDK signatures, credentials, and embedded base64 audio. |
| Accessibility basics | Automated and passed | Axe serious/critical scans including contrast pass for onboarding, dark Today, light Today, and reset dialog; dialog focus entry/return/trap, visible focus, labels, alerts, and reduced motion were inspected. Physical assistive-technology checks remain required. |
| Mobile viewports | Automated and passed | 320×568, 375×667, 390×844, 430×932, and 768×1024 cover Today, workout controls, run preview, and horizontal overflow. |

## Defects found and fixed

- First offline reload could miss hashed JavaScript/CSS because the worker cached HTML but did not discover the current build assets. Install now pre-caches assets referenced by the production HTML.
- Completed runs retained their session ID and could overwrite the prior run. Returning from a receipt now clears the ID.
- Recovered audio runs could complete at position zero. The persisted paused position now remains authoritative until media restores it.
- Audio-start failure left a misleading active record. It now persists an honest paused/start-failure state.
- Onboarding lacked the required persisted run-guidance checkpoint. Voice, chimes, and visual defaults are now part of resumable onboarding.
- Selected workout loads were not editable/recoverable, and substitution could drop prior load selections. Loads and achievable plate guidance are now persisted in immutable snapshots.
- Workout write failures had toast-only feedback. Active workout failures now provide an inline announced error without advancing state.
- “Something else” meals were described but could not be recorded. They now persist without counting as planned-meal adherence.
- Dialog Cancel buttons were not universally connected; focus was not trapped/restored. Dialog controls and focus management are now consistent.
- A reset user could not reach restore until completing onboarding again. Fresh onboarding now offers “Restore a backup”.
- Meal status dots used a prohibited ARIA attribute. They now expose a valid image role and label.

## Remaining limitations and device checks

- Physical iPhone/iOS installed-PWA installation, force-close recovery, lock-screen run audio, offline launch/audio, update preservation, export, and restore are not verified.
- Equivalent physical Android installed-PWA checks are not verified.
- Browser automation cannot prove OS media-session survival, storage eviction behavior, audio focus with other apps, headset controls, or real update prompts.
- The automated offline test forces all page network requests to fail while leaving the already-running service worker available. A cold OS-level offline launch must be checked on devices.
- Measurement editing/deleting is not offered. General progression recommendation decision controls are not exposed beyond the persisted domain/repository contract.

Use [MANUAL_PWA_TEST_CHECKLIST.md](MANUAL_PWA_TEST_CHECKLIST.md) for device acceptance. Do not change the category to **READY FOR PRODUCTION RELEASE** until those checks pass and are recorded.
