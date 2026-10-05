import json
import logging
from collections.abc import Callable
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from threading import Event, RLock, Thread
from time import monotonic
from uuid import uuid4

from schemas.app_state import (
    AppState,
    InterfaceLanguage,
    Job,
    JobKind,
    ModelInfo,
    Preferences,
    Theme,
    Transcript,
)
from schemas.file_metadata import FileMetadata
from service.engine import CancelledError, TranscriptionEngine
from utils.media_utils import get_file_metadata_from_path, is_media_file

logger = logging.getLogger(__name__)
ACTIVE_STATUSES = {"loading", "running", "cancelling"}
PROGRESS_INTERVAL_SECONDS = 0.25
ESTIMATE_MIN_SEGMENTS = 4
ESTIMATE_MIN_SECONDS = 5.0
ESTIMATE_MIN_PROGRESS = 0.5


def empty_job() -> Job:
    """Create the initial job without conflating idle with successful empty output."""
    return {
        "id": "",
        "kind": "transcription",
        "status": "idle",
        "progress": None,
        "remainingSeconds": None,
        "message": "",
        "error": None,
        "modelId": "",
        "startedAt": "",
    }


class TranscriptionService:
    """Own preferences and one active job independently of the UI and inference library."""

    def __init__(self, engine: TranscriptionEngine, directory: Path) -> None:
        """Load only preferences and model metadata; weights stay unloaded until needed."""
        self.engine = engine
        self.directory = directory
        self.models_directory = directory / "models"
        self.models_directory.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._cancel = Event()
        self._publish_callback: Callable[[AppState], None] | None = None
        self._result: Transcript | None = None
        self._last_report = 0.0
        self._progress_origin: tuple[float, float] | None = None
        self._progress_samples = 0
        self._last_progress = 0.0
        preferences, notice = self._read_preferences()
        models = engine.list_models(self.models_directory, preferences["localModelPaths"])
        if not any(m["id"] == preferences["modelId"] and m["isAvailable"] for m in models):
            preferences["modelId"] = next((m["id"] for m in models if m["isAvailable"]), "")
        self._state: AppState = {
            "revision": 0,
            "engine": engine.info,
            "models": models,
            "modelsDirectory": str(self.models_directory),
            "preferences": preferences,
            "transcriptionFile": None,
            "job": empty_job(),
            "notice": notice,
            "transcriptId": None,
        }

    def _read_preferences(self) -> tuple[Preferences, str | None]:
        """Recover from malformed settings without deleting the user's original file."""
        preferences: Preferences = {
            "modelId": "",
            "language": "auto",
            "localModelPaths": [],
            "theme": "system",
            "interfaceLanguage": "system",
        }
        path = self.directory / "preferences.json"
        if not path.exists():
            return preferences, None
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(value, dict):
                raise ValueError("Invalid preferences")
            if isinstance(value.get("modelId"), str):
                preferences["modelId"] = value["modelId"]
            if isinstance(value.get("language"), str):
                preferences["language"] = value["language"]
            if value.get("theme") in ("system", "light", "dark"):
                preferences["theme"] = value["theme"]
            if value.get("interfaceLanguage") in ("system", "en", "es-ES"):
                preferences["interfaceLanguage"] = value["interfaceLanguage"]
            paths = value.get("localModelPaths", [])
            if not isinstance(paths, list):
                raise ValueError("Invalid model paths")
            preferences["localModelPaths"] = [p for p in paths if isinstance(p, str)]
            if preferences["language"] not in {item["code"] for item in self.engine.info["languages"]}:
                preferences["language"] = "auto"
            return preferences, None
        except (ValueError, OSError, TypeError):
            logger.exception("Could not read preferences")
            return preferences, "Saved preferences could not be read. Select your model and language again."

    def _save_preferences(self) -> None:
        """Replace settings atomically so an interrupted write cannot truncate them."""
        path = self.directory / "preferences.json"
        temporary = path.with_suffix(".tmp")
        temporary.write_text(
            json.dumps(self._state["preferences"], ensure_ascii=False, indent=2), encoding="utf-8"
        )
        temporary.replace(path)

    def subscribe(self, callback: Callable[[AppState], None]) -> None:
        """Attach the transport without introducing pywebview into application logic."""
        with self._lock:
            self._publish_callback = callback

    def snapshot(self) -> AppState:
        """Return a copy so concurrent bridge serialization sees a consistent revision."""
        with self._lock:
            return deepcopy(self._state)

    def _publish(self) -> None:
        """Publish complete metadata snapshots in order while holding the state lock."""
        self._state["revision"] += 1
        if self._publish_callback:
            self._publish_callback(deepcopy(self._state))

    def _require_idle(self) -> None:
        """Reject overlapping jobs because native model execution is not thread-safe."""
        if self._state["job"]["status"] in ACTIVE_STATUSES:
            raise ValueError("Wait for the current task to finish or cancel it first.")

    def _find_model(self, model_id: str) -> ModelInfo:
        """Accept only catalog entries and folders the user has explicitly registered."""
        model = next((m for m in self._state["models"] if m["id"] == model_id), None)
        if model is None:
            raise ValueError("Choose an available model first.")
        return model

    def select_file(self, path: str | None) -> FileMetadata | None:
        """Validate local input and keep an existing result until another job starts."""
        with self._lock:
            self._require_idle()
            metadata = None
            if path:
                if not Path(path).is_file():
                    raise ValueError(
                        "The file was moved or deleted. Choose it again from its current location."
                    )
                if not is_media_file(path):
                    raise ValueError("Choose a supported audio or video file on your computer.")
                metadata = get_file_metadata_from_path(path)
                if metadata is None or metadata["size"] == 0:
                    raise ValueError("The selected file is empty or no longer available.")
            self._state["transcriptionFile"] = metadata
            self._state["notice"] = None
            self._publish()
            return metadata

    def refresh_file(self) -> FileMetadata | None:
        """Revalidate pending input when returning to the app without discarding a transcript."""
        with self._lock:
            file = self._state["transcriptionFile"]
            if file is None or self._state["job"]["status"] in ACTIVE_STATUSES:
                return file
            try:
                return self.select_file(file["absolutePath"])
            except (ValueError, OSError):
                self._state["transcriptionFile"] = None
                self._state["notice"] = (
                    "The selected file is no longer available. "
                    "It may have been moved or deleted. Choose it again."
                )
                self._publish()
                return None

    def set_preferences(self, model_id: str, language: str) -> None:
        """Validate choices against engine capabilities before persisting them."""
        with self._lock:
            self._require_idle()
            if not self._find_model(model_id)["isAvailable"]:
                raise ValueError("Download this model or choose an available local model.")
            if language not in {item["code"] for item in self.engine.info["languages"]}:
                raise ValueError("This language is not supported by the selected engine.")
            self._state["preferences"]["modelId"] = model_id
            self._state["preferences"]["language"] = language
            self._save_preferences()
            self._publish()

    def set_appearance(self, theme: Theme, language: InterfaceLanguage) -> None:
        """Persist interface choices across native sessions, whose web origins can change."""
        if theme not in ("system", "light", "dark") or language not in ("system", "en", "es-ES"):
            raise ValueError("Choose a supported interface language and appearance.")
        with self._lock:
            self._state["preferences"]["theme"] = theme
            self._state["preferences"]["interfaceLanguage"] = language
            self._save_preferences()
            self._publish()

    def _linked_model_path(self, model_id: str) -> str:
        """Restrict link management to folders the user has explicitly registered."""
        model = self._find_model(model_id)
        path = model["path"]
        if model["sourceUrl"] or path is None or path not in self._state["preferences"]["localModelPaths"]:
            raise ValueError("Choose a linked model first.")
        return path

    def import_model(self, directory: Path, replace_id: str | None = None) -> ModelInfo:
        """Link or relocate an external model without copying files or retaining stale entries."""
        with self._lock:
            self._require_idle()
            previous_path = self._linked_model_path(replace_id) if replace_id is not None else None
            model = self.engine.import_model(directory)
            paths = self._state["preferences"]["localModelPaths"]
            path = str(directory.resolve())
            if previous_path is not None:
                paths.remove(previous_path)
            if path not in paths:
                paths.append(path)
            self._state["preferences"]["modelId"] = model["id"]
            self._save_preferences()
            self._refresh_models()
            self._publish()
            return model

    def unlink_model(self, model_id: str) -> None:
        """Forget a linked folder and choose an available fallback without deleting files."""
        with self._lock:
            self._require_idle()
            path = self._linked_model_path(model_id)
            preferences = self._state["preferences"]
            preferences["localModelPaths"].remove(path)
            self._refresh_models()
            self._ensure_selected_model()
            self._save_preferences()
            self._publish()

    def _ensure_selected_model(self) -> None:
        """Keep selection usable after a model or its linked cache disappears."""
        preferences = self._state["preferences"]
        models = self._state["models"]
        if not any(model["id"] == preferences["modelId"] and model["isAvailable"] for model in models):
            preferences["modelId"] = next((model["id"] for model in models if model["isAvailable"]), "")

    def delete_model(self, model_id: str) -> None:
        """Remove downloaded catalog files only while idle and refresh even after partial failure."""
        with self._lock:
            self._require_idle()
            model = self._find_model(model_id)
            if not model["sourceUrl"] or not model["caches"]:
                raise ValueError("Choose a downloaded catalog model first.")
            try:
                self.engine.delete_model(model, self.models_directory)
            finally:
                self._refresh_models()
                self._ensure_selected_model()
                self._save_preferences()
                self._publish()

    def _refresh_models(self) -> None:
        """Refresh local availability only when discovery can have changed."""
        self._state["models"] = self.engine.list_models(
            self.models_directory, self._state["preferences"]["localModelPaths"]
        )

    def refresh_models(self) -> None:
        """Let users recheck folders copied or moved outside the application."""
        with self._lock:
            self._require_idle()
            self._refresh_models()
            self._publish()

    def notify(self, message: str) -> None:
        """Surface native drop errors through the same visible UI notice."""
        with self._lock:
            self._state["notice"] = message
            self._publish()

    def start(self, kind: JobKind, model_id: str, file_path: str = "", language: str = "auto") -> Job:
        """Reserve a job before launching its worker, so rapid clicks cannot race."""
        with self._lock:
            self._require_idle()
            model = deepcopy(self._find_model(model_id))
            file = None
            if kind == "transcription":
                if not model["isAvailable"]:
                    raise ValueError("Download a model or choose a local model folder first.")
                self.set_preferences(model_id, language)
                file = self.select_file(file_path)
                if file is None:
                    raise ValueError("Choose an audio or video file first.")
                self._result = None
                self._state["transcriptId"] = None
            self._cancel.clear()
            self._last_report = 0
            self._progress_origin = None
            self._progress_samples = 0
            self._last_progress = 0.0
            job: Job = {
                "id": uuid4().hex,
                "kind": kind,
                "status": "loading",
                "progress": None,
                "remainingSeconds": None,
                "message": "Loading model…" if kind == "transcription" else "Connecting to download source…",
                "error": None,
                "modelId": model_id,
                "startedAt": datetime.now(UTC).isoformat(),
            }
            self._state["job"] = job
            self._state["notice"] = None
            self._publish()
            Thread(target=self._run, args=(deepcopy(job), model, file, language), daemon=True).start()
            return deepcopy(job)

    def _report(self, progress: float | None, message: str) -> None:
        """Limit progress traffic while always publishing a change of phase."""
        with self._lock:
            job = self._state["job"]
            if self._cancel.is_set():
                raise CancelledError
            now = monotonic()
            if (
                now - self._last_report < PROGRESS_INTERVAL_SECONDS
                and job["message"] == message
                and job["progress"] == progress
            ):
                return
            self._last_report = now
            remaining = None
            if progress is not None and job["kind"] == "transcription":
                if self._progress_origin is None:
                    self._progress_origin = (now, progress)
                start_time, start_progress = self._progress_origin
                if progress > self._last_progress:
                    self._progress_samples += 1
                    self._last_progress = progress
                # Combine sample count, elapsed inference time and coverage; percentages alone
                # would delay long recordings, while segment counts alone can arrive in a burst.
                if (
                    self._progress_samples >= ESTIMATE_MIN_SEGMENTS
                    and now - start_time >= ESTIMATE_MIN_SECONDS
                    and progress - start_progress >= ESTIMATE_MIN_PROGRESS
                ):
                    remaining = max(0.0, (100 - progress) * (now - start_time) / (progress - start_progress))
            job.update(
                {"status": "running", "progress": progress, "remainingSeconds": remaining, "message": message}
            )
            self._publish()

    def _run(self, job: Job, model: ModelInfo, file: FileMetadata | None, language: str) -> None:
        """Finalize every worker path exactly once, including empty speech and cancellation."""
        result: Transcript | None = None
        started = monotonic()
        try:
            if job["kind"] == "download":
                self.engine.download_model(model["id"], self.models_directory, self._cancel, self._report)
                result = None
            else:
                if file is None:
                    raise ValueError("No file selected")
                output = self.engine.transcribe(
                    file["absolutePath"], model, language, self._cancel, self._report
                )
                result = {
                    "id": job["id"],
                    "createdAt": datetime.now(UTC).isoformat(),
                    "file": file,
                    "engineId": self.engine.info["id"],
                    "engineName": self.engine.info["name"],
                    "modelId": model["id"],
                    "modelName": model["name"],
                    "processingSeconds": monotonic() - started,
                    **output,
                }
            with self._lock:
                if self._cancel.is_set():
                    raise CancelledError
                if job["kind"] == "download":
                    self._refresh_models()
                    self._state["preferences"]["modelId"] = model["id"]
                    self._save_preferences()
                else:
                    self._result = result
                    self._state["transcriptId"] = job["id"]
                self._state["job"].update(
                    {"status": "completed", "progress": 100, "remainingSeconds": None, "message": ""}
                )
                self._publish()
        except CancelledError:
            with self._lock:
                if job["kind"] == "download":
                    self._refresh_models()
                self._state["job"].update(
                    {"status": "cancelled", "progress": None, "remainingSeconds": None, "message": ""}
                )
                self._publish()
        except Exception as error:
            logger.exception("%s failed", job["kind"])
            with self._lock:
                if job["kind"] == "download":
                    self._refresh_models()
                self._state["job"].update(
                    {
                        "status": "error",
                        "progress": None,
                        "remainingSeconds": None,
                        "message": "",
                        "error": str(error),
                    }
                )
                self._publish()

    def cancel(self, job_id: str) -> None:
        """Target a job ID so a delayed cancellation cannot affect its successor."""
        with self._lock:
            job = self._state["job"]
            if job["id"] == job_id and job["status"] in ACTIVE_STATUSES:
                self._cancel.set()
                job["status"] = "cancelling"
                job["remainingSeconds"] = None
                self._publish()

    def result(self, job_id: str) -> Transcript:
        """Fetch the completed result once instead of sending it with every progress update."""
        with self._lock:
            if self._result is None or self._result["id"] != job_id:
                raise ValueError("This transcript is no longer available. Transcribe the file again.")
            return deepcopy(self._result)
