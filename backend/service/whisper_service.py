import json
from fnmatch import fnmatch
from pathlib import Path
from threading import Event

import ctranslate2
from faster_whisper import WhisperModel
from faster_whisper.tokenizer import _LANGUAGE_CODES
from huggingface_hub import HfApi, hf_hub_download, snapshot_download
from huggingface_hub.errors import LocalEntryNotFoundError
from tokenizers import Tokenizer

from schemas.studio import EngineInfo, ModelInfo
from schemas.transcription import TranscriptionSegment
from service.engine import CancelledError, EngineResult, ProgressCallback

# Sizes describe approximate downloads, not RAM requirements.
MODEL_CATALOG = [
    ("tiny", "Tiny", "Fast drafts and short recordings.", "≈75 MB", "Systran/faster-whisper-tiny"),
    ("base", "Base", "A good place to start. Light and quick.", "≈145 MB", "Systran/faster-whisper-base"),
    (
        "small",
        "Small",
        "More accurate, with a little more patience.",
        "≈485 MB",
        "Systran/faster-whisper-small",
    ),
    (
        "medium",
        "Medium",
        "Detailed transcription. Slower on most computers.",
        "≈1.5 GB",
        "Systran/faster-whisper-medium",
    ),
    (
        "large-v3",
        "Large v3",
        "Highest quality; needs more memory and time.",
        "≈3.1 GB",
        "Systran/faster-whisper-large-v3",
    ),
    (
        "turbo",
        "Turbo",
        "A faster large model; still demanding on CPU.",
        "≈1.6 GB",
        "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
    ),
]
MODEL_FILES = ["config.json", "preprocessor_config.json", "model.bin", "tokenizer.json", "vocabulary.*"]


def check_cancelled(cancel: Event) -> None:
    """Check between native calls, which cannot be interrupted safely in a thread."""
    if cancel.is_set():
        raise CancelledError


def validate_model(directory: Path) -> None:
    """Require a local tokenizer so inference never falls back to an online download."""
    if not ctranslate2.contains_model(str(directory)):
        raise ValueError("Choose a Faster-Whisper model folder containing model.bin and config.json.")
    if not (directory / "tokenizer.json").is_file():
        raise ValueError("This model is missing tokenizer.json. Download a complete CTranslate2 model.")
    try:
        json.loads((directory / "config.json").read_text(encoding="utf-8"))
        Tokenizer.from_file(str(directory / "tokenizer.json"))
    except Exception as error:
        raise ValueError(
            "The model configuration or tokenizer is unreadable. Download the model again."
        ) from error


class FasterWhisperEngine:
    """Own every Faster-Whisper and Hugging Face detail used by the application."""

    info: EngineInfo = {
        "id": "faster-whisper",
        "name": "Faster-Whisper",
        "modelFormat": "Choose a CTranslate2 model folder with model.bin, config.json and tokenizer.json. "
        "OpenAI .pt and whisper.cpp .gguf files are not compatible.",
        # The pinned adapter owns this vendor-specific language catalog.
        "languages": [{"code": "auto", "name": "Detect automatically"}]
        + [{"code": code, "name": code} for code in _LANGUAGE_CODES],
    }

    def __init__(self) -> None:
        """Reuse one model, whose access is serialized by the job service."""
        self._model: WhisperModel | None = None
        self._model_path: str | None = None

    def list_models(self, directory: Path, local_paths: list[str]) -> list[ModelInfo]:
        """Find existing app and default Hub caches without any network request."""
        models: list[ModelInfo] = []
        for model_id, name, description, size, repo in MODEL_CATALOG:
            model_path = None
            for cache in (str(directory), None):
                try:
                    candidate = str(
                        snapshot_download(
                            repo, cache_dir=cache, allow_patterns=MODEL_FILES, local_files_only=True
                        )
                    )
                    validate_model(Path(candidate))
                    model_path = candidate
                    break
                except (LocalEntryNotFoundError, ValueError, OSError):
                    continue
            models.append(
                {
                    "id": model_id,
                    "name": name,
                    "description": description,
                    "sizeLabel": size,
                    "sourceUrl": f"https://huggingface.co/{repo}",
                    "path": model_path,
                    "isAvailable": model_path is not None,
                    "isRecommended": model_id == "base",
                }
            )
        for path in local_paths:
            model = self._local_model(Path(path))
            try:
                validate_model(Path(path))
            except (ValueError, OSError):
                model["isAvailable"] = False
                model["description"] = "Folder missing or incomplete. Choose the model folder again."
            models.append(model)
        return models

    def _local_model(self, directory: Path) -> ModelInfo:
        """Identify imported folders by path without copying their large weight files."""
        path = str(directory.resolve())
        return {
            "id": f"local:{path}",
            "name": directory.name,
            "description": "Model linked from your computer.",
            "sizeLabel": "Local folder",
            "sourceUrl": "",
            "path": path,
            "isAvailable": True,
            "isRecommended": False,
        }

    def import_model(self, directory: Path) -> ModelInfo:
        """Validate the selected folder before making it available to the UI."""
        validate_model(directory)
        return self._local_model(directory)

    def download_model(self, model_id: str, directory: Path, cancel: Event, report: ProgressCallback) -> None:
        """Download only model assets, preserving Hub caching and resumable partial files."""
        repo = next((entry[4] for entry in MODEL_CATALOG if entry[0] == model_id), None)
        if repo is None:
            raise ValueError("This model cannot be downloaded. Choose a model from the catalog.")
        info = HfApi().model_info(repo, files_metadata=False)
        files = [
            f.rfilename for f in info.siblings or [] if any(fnmatch(f.rfilename, p) for p in MODEL_FILES)
        ]
        for index, filename in enumerate(files):
            check_cancelled(cancel)
            # File sizes differ greatly, so a file count must not masquerade as a byte percentage.
            report(None, f"{filename} · {index + 1}/{len(files)}")
            hf_hub_download(repo, filename, revision=info.sha, cache_dir=directory)
        check_cancelled(cancel)
        path = snapshot_download(
            repo, revision=info.sha, cache_dir=directory, allow_patterns=MODEL_FILES, local_files_only=True
        )
        validate_model(Path(str(path)))
        # Keep discovery compatible with models previously downloaded by Faster-Whisper.
        ref = directory / f"models--{repo.replace('/', '--')}" / "refs" / "main"
        ref.parent.mkdir(parents=True, exist_ok=True)
        ref.write_text(str(info.sha), encoding="utf-8")

    def transcribe(
        self, file_path: str, model: ModelInfo, language: str, cancel: Event, report: ProgressCallback
    ) -> EngineResult:
        """Run local CPU inference and translate segments into the shared contract."""
        path = model["path"]
        if path is None:
            raise ValueError("Download a model or choose a local model folder first.")
        validate_model(Path(path))
        check_cancelled(cancel)
        if self._model is None or path != self._model_path:
            # Release the previous weights before allocating another large model.
            self._model = None
            self._model_path = None
            self._model = WhisperModel(path, device="cpu", compute_type="int8", local_files_only=True)
            self._model_path = path
        check_cancelled(cancel)
        report(None, "Reading audio and detecting speech…")
        raw_segments, info = self._model.transcribe(
            file_path,
            language=None if language == "auto" else language,
            vad_filter=True,
        )
        segments: list[TranscriptionSegment] = []
        iterator = iter(raw_segments)
        while True:
            check_cancelled(cancel)
            segment = next(iterator, None)
            check_cancelled(cancel)
            if segment is None:
                break
            segments.append(
                {"id": segment.id, "start": segment.start, "end": segment.end, "text": segment.text.strip()}
            )
            progress = min(99.0, segment.end / info.duration * 100) if info.duration > 0 else None
            report(progress, "Transcribing on your computer…")
        return {"segments": segments, "language": info.language, "duration": info.duration}
