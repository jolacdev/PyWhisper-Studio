# Revamp decisions

## Agreed MVP

One local audio/video file → choose or download a model → transcribe with progress/cancellation → read/copy → export TXT/SRT/VTT. English and Spain Spanish; system appearance with light/dark overrides. No history or editing yet.

## Problems addressed

| Previous limitation | Change and reason |
| --- | --- |
| Errors returned an empty segment list | Separate error, cancellation, completion, and successful no-speech states. |
| Screen mounting started inference | Explicit commands start backend-owned jobs; reloads only hydrate state. |
| Work and cancellation state crossed several stores | One locked service owns jobs; job IDs prevent stale cancellation. |
| Whisper types and cache behavior leaked into application logic | One engine protocol isolates vendor-specific behavior. |
| First transcription could download silently | Separate, explicit model downloads; local inference only. |
| Existing models were difficult to locate | App/Hub cache discovery, validated folder linking, visible storage path and model instructions. |
| Shared state was typed manually; generated DTOs contained `any` | A small annotation generator covers the entire JSON contract and rejects unsupported types. |
| No durable output | Native TXT/SRT/VTT export and copy; replacement warning before discarding the current result. |
| Fragmented visual primitives and theme values | Shared components, MDI registry, `cn`, five palette roles, readable opacity variants. |
| Shell-based Python scripts and PyFlow intermediate output | One argument-based launcher; enforced Python ≥3.13; direct declaration generation. |
| Moved inputs stayed selected | Revalidate on screen entry and window focus; clear unavailable input while retaining the completed result. |
| Brand-specific internal names | `TranscriptionService`, `useTranscription`, `app_state.py`, and generated `state.app`; existing data paths stay stable. |
| Verbose screens and inconsistent controls | Direct EN/ES copy, neutral dark surfaces, shared Select geometry, compact sidebar, and no decorative breadcrumb bar. |
| Transcript segments resembled unrelated paragraphs | Continuous text/TXT export, aligned timestamp rows with segment copy, and scrollable content with persistent controls. |
| Feedback shifted the layout | Floating react-hot-toast notifications; persistent dismissible errors and timed success messages. |
| Native macOS title overlapped window controls | Hide the native title before showing the window and disable window tabbing; retain native traffic-light controls and sidebar branding. |

## Product and technical tradeoffs

- CPU/int8 is the portable default. GPU support needs platform-specific validation.
- Cancellation waits for the current inference operation; downloads stop between files. Loading/decoding may take time before the next cancellation check.
- Remaining time is an estimate from measured inference progress, available after two advancing samples. It excludes loading/decoding and can change with speech density or processing speed.
- Download progress names the current file; it does not imply a byte percentage. Failed downloads can be retried explicitly and reuse cached files.
- Model validation checks local assets and tokenizer readability; incompatible or damaged weights can still fail when loaded, with a visible error.
- Native file selection is always available. If pywebview 6.1 DOM binding fails, the UI offers browsing instead of advertising unavailable drag-and-drop.
- Results already use stable IDs, timestamps, source metadata, and normalized segments. Add persistence/editing to this contract later; do not put them in the engine adapter.

## Verification — 2026-10-01

- macOS arm64 / Python 3.13: initialization, production frontend build, generated-contract check, ESLint/TypeScript, Ruff/MyPy, and existing tests pass.
- Temporary integration checks covered model setup, repeat jobs, cancellation, errors, empty speech, EN/ES, copy/export, preference persistence, and an alternative engine adapter.
- Downloaded Tiny into an isolated temporary cache, restarted the service, and transcribed real speech with Python socket connections blocked. Existing Base cache discovery and offline silent audio also passed.
- PyInstaller produced and launched a macOS bundle; VAD assets were included. Native source startup reached bridge readiness without the earlier DOM exception.
- Visual inspection and native dialog interaction could not run because computer-control tools were unavailable. Windows, clean-machine packaging, accessibility review, and permanent integration coverage remain in `CHECKLIST.md`.

UX follow-up: reviewed supplied macOS screenshots. Regression checks cover moved inputs, retained results, metadata refresh, ETA/cancellation, segment copying, floating feedback, EN/ES, and exports. Updated native startup passes; final visual appearance still needs manual confirmation.

## References

- [GoWhisper](https://gowhisper.io/): short file/model/export flow and local-processing emphasis.
- [Backloggd Plus reference branch](https://github.com/jolacdev/backloggd-plus/tree/feature/game-collection-export-redesign): `cn`, grouped classes, restrained tokens, shared typography, and MDI source slugs.
- [react-hot-toast](https://react-hot-toast.com/docs/toaster): floating feedback with custom styles and MDI icons; declared as a frontend runtime dependency.
- [NSWindow title visibility](https://developer.apple.com/documentation/appkit/nswindow/titlevisibility): native title treatment without replacing macOS window controls.
- [pywebview bridge](https://pywebview.flowrl.com/guide/interdomain.html): promise commands, threaded API calls, and top-level shared-state updates.
- [Faster-Whisper](https://github.com/SYSTRAN/faster-whisper): local CTranslate2 models, bundled media decoding, and CPU/int8 inference.
- [Hugging Face downloads](https://huggingface.co/docs/huggingface_hub/guides/download): cached snapshots and file filters. Discovery filters model assets so missing repository documentation does not invalidate an existing model.
