# Architecture

## Entrypoints

- `backend/main.py`: creates the pywebview window, configures logging, and registers drag-and-drop events.
- `frontend/src/main.tsx`: mounts React inside `PyWebViewProvider`.
- Vite serves or builds the frontend; PyInstaller packages the desktop application for macOS/Windows.

## Layers and boundaries

- `backend/api/`: methods exposed to JavaScript. `backend/service/`: model loading and transcription.
- `backend/utils/`: media metadata, segment processing, time formatting. `backend/schemas/`: shared DTOs.
- `frontend/src/screens/`: screen composition. `features/`: file selection and transcription. `shared/`: reusable UI and hooks.
- `frontend/src/store/`: local navigation and selected-file state. Keep feature-specific logic near its feature.

## Python ↔ JavaScript bridge

- `create_window(js_api=PyWebViewApi())` exposes methods through `window.pywebview.api`; calls return promises.
- `PyWebViewProvider` waits for `pywebviewready`. Standalone browser mode uses `mockPyWebView.ts` instead.
- Python `window.state` and JavaScript `window.pywebview.state` synchronize top-level properties. React subscribes through `usePyWebViewState`.
- PyFlow-TS generates `pywebview-api.d.ts` from Python; `pywebview-state.ts` describes shared state manually. Keep names aligned.
- Python binds drag-and-drop handlers after `window.events.loaded` and writes the selected file to shared state.

## Transcription flow

- File selection updates shared state; `useSyncedTranscriptionFile` reflects it in Zustand.
- `useSyncedTranscription` calls `run_transcription` when the transcription screen mounts.
- Python reuses a faster-whisper model, consumes its segments, and publishes progress and remaining time.
- Cancel sets `isAbortRequested`; Python checks it between segments. The completed promise returns all segments to the result screen.
- The current UI requests one file at a time with the `base` model; inference is forced to CPU.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for known defects and proposed changes.
