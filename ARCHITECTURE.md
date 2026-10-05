# Architecture

## Boundaries

- `backend/main.py`: composes the engine, application service, API, and native window.
- `backend/service/transcription_service.py`: owns preferences, selected input, one active job, and the current result. No pywebview or inference-library imports.
- `backend/service/engine.py`: engine protocol and normalized inference output. `whisper_service.py` implements Faster-Whisper discovery, validation, download, and inference.
- `backend/api/api.py`: typed commands, native dialogs, drag-and-drop, and export. `schemas/` defines JSON contracts; `utils/` contains media and export helpers.
- React `App` coordinates navigation; `screens/` compose flows; `features/transcription/` subscribes to backend state; `shared/` contains reusable presentation and utilities.
- Shared code cannot import features or screens; features cannot import screens. ESLint checks these boundaries.

## Python ↔ JavaScript

- `window.pywebview.api` exposes promise-based commands after `pywebviewready`.
- Python owns `window.state.app`. React subscribes before requesting `get_state()` and ignores older revisions; it never writes shared state.
- `schemas/app_state.py`, `TranscriptionService`, and `useTranscription` use domain names independent of product branding. Renaming code does not move existing user data.
- `run_transcription` returns a `Job` immediately. A worker publishes every advancing segment and phase change; repeated progress is limited to four updates per second. Full segments travel once through `get_transcript`.
- One lock serializes state changes and job admission because pywebview invokes API methods on separate threads. Cancellation targets a job ID and takes effect between native operations.
- `remainingSeconds` uses average inference speed after at least four advancing segments, five seconds of inference, and 0.5 percentage points of progress. The engine establishes a zero-progress baseline before consuming its lazy segment generator, excluding loading/decoding while including the first inference block. Unknown and terminal estimates are `None`.
- Completed transcripts retain model/engine names and measured `processingSeconds` alongside file size and recording duration. Processing time includes model loading, audio preparation, and inference; it uses a monotonic clock and stays tied to that result when preferences change.
- `pnpm gen-api` generates API methods, DTOs, and shared state from Python annotations. `pnpm check-api` detects drift. Unsupported annotations fail generation; no `any` fallback.
- Browser simulation requires development mode and `?preview`; production always uses the native bridge.

## Models and persistence

- Discover valid local app/Hub caches first. A native folder picker links external models without copying them. Linked folders appear separately from the model catalog; missing locations can be relinked in place, and links can be removed without deleting files. Removing the selected link chooses an available model or clears the selection.
- Downloads happen only through `download_model`. Inference receives a validated local directory with its tokenizer; it never downloads assets.
- `ModelInfo.caches` describes per-model app and shared Hub repositories for the deletion confirmation. `delete_model` runs only while idle, releases loaded weights before file removal, and removes only the confirmed catalog repositories using Hub cache cleanup. External links retain their files; cache copies that appear after confirmation require a refresh. Discovery and selection are refreshed even after partial deletion failure.
- JSON preferences persist model paths, selected model, spoken language, interface language, and appearance. `APP_NAME` is Syllentra, while `APP_DATA_NAME` retains the PyWhisper Studio OS data identity to preserve installations. `SYLLENTRA_DATA_DIR` overrides storage for isolated runs; `PYWHISPER_DATA_DIR` remains a fallback.
- One transcript stays in memory until replaced or the app closes. TXT/SRT/VTT exports use native save dialogs. History and editing remain deferred.
- Entering New transcription or refocusing that screen revalidates the selected path. Missing files clear only the input; completed transcripts remain available.

## Replacing the engine

1. Implement `TranscriptionEngine`: capability metadata, local discovery/validation, explicit download and cache deletion, and transcription.
2. Return `ModelInfo` and `EngineResult`; translate vendor output into timed `TranscriptionSegment` objects. Keep network/cache details inside the adapter.
3. Check cancellation between supported operations and report real progress, or `None` when unknown.
4. Inject the adapter in `main.py`; adjust dependencies and packaging assets. Add its explanatory copy to both locales.
5. Regenerate types only if the public contract changes. The job service, screens, copy, and exports remain reusable.

A provider needs timestamps to support subtitle export. A provider without them requires an explicit capability change, not fabricated timings.
