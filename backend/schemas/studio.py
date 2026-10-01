from typing import Literal, TypedDict

from schemas.file_metadata import FileMetadata
from schemas.transcription import TranscriptionSegment

JobStatus = Literal["idle", "loading", "running", "cancelling", "completed", "cancelled", "error"]
JobKind = Literal["transcription", "download"]
ExportFormat = Literal["txt", "srt", "vtt"]
Theme = Literal["system", "light", "dark"]
InterfaceLanguage = Literal["system", "en", "es-ES"]


class ModelInfo(TypedDict):
    """Describe a model without exposing engine-specific objects to React."""

    id: str
    name: str
    description: str
    sizeLabel: str
    sourceUrl: str
    path: str | None
    isAvailable: bool
    isRecommended: bool


class Language(TypedDict):
    """Describe a language accepted by the active engine."""

    code: str
    name: str


class EngineInfo(TypedDict):
    """Provide the capabilities and model instructions displayed by the UI."""

    id: str
    name: str
    modelFormat: str
    languages: list[Language]


class Preferences(TypedDict):
    """Persist selection preferences without retaining media or transcripts."""

    modelId: str
    language: str
    localModelPaths: list[str]
    theme: Theme
    interfaceLanguage: InterfaceLanguage


class Job(TypedDict):
    """Keep progress, cancellation, failure, and completion unambiguous."""

    id: str
    kind: JobKind
    status: JobStatus
    progress: float | None
    message: str
    error: str | None
    modelId: str
    startedAt: str


class Transcript(TypedDict):
    """Keep an engine-neutral result ready for export and future history."""

    id: str
    createdAt: str
    file: FileMetadata
    engineId: str
    modelId: str
    language: str
    duration: float
    segments: list[TranscriptionSegment]


class AppState(TypedDict):
    """Publish a small snapshot; full transcript content is fetched separately."""

    revision: int
    engine: EngineInfo
    models: list[ModelInfo]
    modelsDirectory: str
    preferences: Preferences
    transcriptionFile: FileMetadata | None
    job: Job
    notice: str | None
    transcriptId: str | None


class BridgeState(TypedDict):
    """Define the shared state contract generated alongside the API."""

    studio: AppState
