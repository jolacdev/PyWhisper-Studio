# Checklist

## MVP implemented

- [x] Local file selection, model setup, progress, cancellation, and distinct terminal states.
- [x] Local model priority, compatible folder linking, explicit downloads, visible storage location.
- [x] Engine-neutral service and generated API/state contracts.
- [x] Timestamped segment view, source/processing details, copy, and native TXT/SRT/VTT export.
- [x] English / Spain Spanish, system/light/dark themes, shared UI primitives.
- [x] Persist model and interface preferences; warn before replacing a result.
- [x] Revalidate moved/deleted inputs on entry and window focus without losing the current transcript.
- [x] Estimated transcription time, floating notifications, neutral dark theme, compact screens, and segment copying.

## Next product iteration

- [ ] **Local history:** add a transcript repository behind the service, save completed `Transcript` objects, and add a sidebar destination with open/delete actions. Never copy source media implicitly.
- [ ] **Text editing:** edit segment text while preserving IDs and timings; keep original and corrected text separately, with explicit save/dirty state. Reuse the result toolbar and export formatter.
- [ ] Audio playback and seeking from timestamps; handle moved/deleted source files.
- [ ] Microphone recording and its permission/recording lifecycle.
- [ ] URL imports with explicit network behavior and provider-specific validation.
- [ ] Batch queue, per-item status, and queue cancellation.
- [ ] Speaker labels through an engine capability, without changing plain-transcription behavior.
- [ ] Model removal, storage usage, byte-level download progress, and faster cancellation if the download API supports it cleanly.
- [ ] GPU selection and capability reporting after CUDA/Apple platform validation.

## Verification and distribution

- [ ] Add the deferred unit suites for primitives, engine adapters, exports, and job transitions.
- [ ] Add persistent bridge integration tests for reloads, out-of-order snapshots, repeated jobs, and cancellation races.
- [ ] Visually verify both languages/themes at narrow and wide window sizes, keyboard navigation, and VoiceOver/NVDA.
- [ ] Native macOS/Windows smoke: first launch without cache, file/folder/save dialogs, clipboard, drag-and-drop, restart, offline inference, and model errors.
- [ ] Validate packaged binaries on clean macOS/Windows machines, including VAD assets and native inference libraries.
- [ ] Choose release version/bundle identifier; sign/notarize installers and publish releases.
- [ ] Align Vitest with Vite 7 when implementing the unit-test iteration; its mocker has a peer-version warning.
- [ ] Lock Python transitive dependencies and add CI gates for generated contracts, lint, types, builds, and integration checks.
