from collections.abc import Callable
from pathlib import Path
from threading import Event
from typing import Protocol, TypedDict

from schemas.studio import EngineInfo, ModelInfo
from schemas.transcription import TranscriptionSegment

ProgressCallback = Callable[[float | None, str], None]


class CancelledError(Exception):
    """Stop a job at an engine-supported cancellation boundary."""


class EngineResult(TypedDict):
    """Normalize inference output before it reaches application logic."""

    language: str
    duration: float
    segments: list[TranscriptionSegment]


class TranscriptionEngine(Protocol):
    """Isolate model discovery, downloads, and inference behind one adapter."""

    info: EngineInfo

    def list_models(self, directory: Path, local_paths: list[str]) -> list[ModelInfo]: ...

    def import_model(self, directory: Path) -> ModelInfo: ...

    def download_model(
        self, model_id: str, directory: Path, cancel: Event, report: ProgressCallback
    ) -> None: ...

    def transcribe(
        self, file_path: str, model: ModelInfo, language: str, cancel: Event, report: ProgressCallback
    ) -> EngineResult: ...
