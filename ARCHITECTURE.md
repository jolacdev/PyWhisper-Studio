# Architecture

## Boundaries

- `backend/main.py`: composes the engine, application service, API, and native window.
- `backend/service/studio_service.py`: owns preferences, selected input, one active job, and the current result. No pywebview or inference-library imports.
- `backend/service/engine.py`: engine protocol and normalized inference output. `whisper_service.py` implements Faster-Whisper discovery, validation, download, and inference.
- `backend/api/api.py`: typed commands, native dialogs, drag-and-drop, and export. `schemas/` defines JSON contracts; `utils/` contains media and export helpers.
- React `App` coordinates navigation; `screens/` compose flows; `features/studio/` subscribes to backend state; `shared/` contains reusable presentation and utilities.
- Shared code cannot import features or screens; features cannot import screens. ESLint checks these boundaries.

## Python ↔ JavaScript

- `window.pywebview.api` exposes promise-based commands after `pywebviewready`.
- Python owns `window.state.studio`. React subscribes before requesting `get_state()` and ignores older revisions; it never writes shared state.
- `run_transcription` returns a `Job` immediately. A worker publishes progress at most four times per second, plus phase changes. Full segments travel once through `get_transcript`.
- One lock serializes state changes and job admission because pywebview invokes API methods on separate threads. Cancellation targets a job ID and takes effect between native operations.
- `pnpm gen-api` generates API methods, DTOs, and shared state from Python annotations. `pnpm check-api` detects drift. Unsupported annotations fail generation; no `any` fallback.
- Browser simulation requires development mode and `?preview`; production always uses the native bridge.

## Models and persistence

- Discover valid local app/Hub caches first. A native folder picker links external models without copying them.
- Downloads happen only through `download_model`. Inference receives a validated local directory with its tokenizer; it never downloads assets.
- JSON preferences persist model paths, selected model, spoken language, interface language, and appearance. The OS app-data directory owns this file and the managed model cache; `PYWHISPER_DATA_DIR` overrides it for isolated runs.
- One transcript stays in memory until replaced or the app closes. TXT/SRT/VTT exports use native save dialogs. History and editing remain deferred.

## Replacing the engine

1. Implement `TranscriptionEngine`: capability metadata, local discovery/validation, explicit download, and transcription.
2. Return `ModelInfo` and `EngineResult`; translate vendor output into timed `TranscriptionSegment` objects. Keep network/cache details inside the adapter.
3. Check cancellation between supported operations and report real progress, or `None` when unknown.
4. Inject the adapter in `main.py`; adjust dependencies and packaging assets. Add its explanatory copy to both locales.
5. Regenerate types only if the public contract changes. The job service, screens, copy, and exports remain reusable.

A provider needs timestamps to support subtitle export. A provider without them requires an explicit capability change, not fabricated timings.
