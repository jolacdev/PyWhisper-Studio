# Syllentra

A local transcription desktop app built with Python, pywebview, React, and Faster-Whisper.

## Use

1. Choose an audio or video file.
2. Link an existing compatible folder under **Linked models**, or download a model from the **Model catalog**. Existing app and Hugging Face caches are detected first.
3. Select the spoken language or use automatic detection, then transcribe.
4. Read or copy the result, or export TXT, SRT, or VTT.

Models are speech recognition packs. Downloads need internet; transcription uses local files and never uploads recordings. Start with **Base** for a small model, or **Tiny** for faster drafts. Compatible local folders contain CTranslate2 weights (`model.bin`), `config.json`, and `tokenizer.json`.

This MVP processes one file at a time on the CPU. Cancellation takes effect between audio operations, or between download files. Transcripts stay in memory: export before closing the app or starting another transcription. History and editing are planned in [CHECKLIST.md](CHECKLIST.md).

The interface supports English and Spanish from Spain, with system, light, and dark appearances. The Models screen separates linked folders from the download catalog. Missing folders can be relinked, replacing the saved location, or removed from the list without deleting files. **Open downloads folder** reveals the app's managed storage.

Cached catalog models have a **Delete model** bin button. The confirmation lists the folders that will be cleared, including any shared Hugging Face cache used by other apps. Deletion removes all downloaded versions of that model, including incomplete downloads; the catalog entry remains available to download again. Linked folders outside those caches are left in place. Deleting the selected model chooses another available model or clears the selection. Model changes are disabled during active jobs.

Syllentra was previously named PyWhisper Studio. Its data-directory identity stays unchanged so existing models and preferences remain available after the rebrand.

## Development

Requires Python ≥3.13, Node ≥22.12, and pnpm ≥10. Python's version is checked by the launcher. `initialize` installs `requirements-dev.txt`, which includes the runtime-only `requirements.txt`.

`initialize` reuses an existing `.venv`. For a new environment, set `PYTHON` if the default command points to an older interpreter, for example `PYTHON=python3.13 pnpm initialize` on macOS/Linux.

| Command | Purpose |
| --- | --- |
| `pnpm initialize` | Install dependencies and create `.venv`. |
| `pnpm start` | Build the frontend and run the native app. |
| `pnpm dev:frontend` | Start Vite on port 3000. |
| `pnpm dev:backend` | Run the native app against Vite. |
| `pnpm gen-api` | Generate TypeScript API, DTO, and state declarations from Python. |
| `pnpm check-api` | Fail if generated declarations are stale. |
| `pnpm build` | Package the app on the current platform. |
| `pnpm --dir frontend lint:no-fix` | Check TypeScript and ESLint. |
| `pnpm --dir frontend test` | Run the existing unit tests. |

For browser-only UI development, open `http://localhost:3000/?preview`. It is explicitly labelled as simulated and is unavailable in production. `?preview=ready`, `?preview=error`, and `?preview=empty` exercise other states. `?preview=models` includes both a linked folder and a missing folder for model-management checks. Native dialogs and export require the desktop app.

Use `SYLLENTRA_DATA_DIR` to isolate preferences and managed downloads during development. The legacy `PYWHISPER_DATA_DIR` override remains supported; the Syllentra override takes precedence when both are set. It does not hide the global Hugging Face cache. Python checks: `.venv/bin/ruff check backend` and `PYTHONPATH=backend .venv/bin/mypy --config-file backend/pyproject.toml --explicit-package-bases backend` (use the corresponding `.venv\Scripts` paths on Windows).

See [ARCHITECTURE.md](ARCHITECTURE.md), [CODE_STYLE.md](CODE_STYLE.md), and [IMPROVEMENTS.md](IMPROVEMENTS.md) for boundaries, conventions, and design decisions. [PROJECT_STATUS.md](PROJECT_STATUS.md) is the earlier historical audit, not the current implementation status.
