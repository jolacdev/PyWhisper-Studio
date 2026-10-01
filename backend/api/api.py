import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import webview
from webview.dom import DOMEventHandler
from webview.dom.element import Element

from schemas.file_metadata import FileMetadata
from schemas.studio import AppState, ExportFormat, InterfaceLanguage, Job, ModelInfo, Theme, Transcript
from service.studio_service import StudioService
from utils.export_utils import render_transcript
from utils.media_utils import get_media_dialog_file_types

logger = logging.getLogger(__name__)


class PyWebViewApi:
    """Expose typed commands and native dialogs while the service owns application state."""

    def __init__(self, service: StudioService) -> None:
        """Inject the application service so another engine needs no bridge changes."""
        self._service = service
        self._window: webview.Window | None = None
        self._drop_element: Element | None = None

    def _attach(self, window: webview.Window) -> None:
        """Publish one top-level property because pywebview does not track nested mutations."""
        self._window = window
        window.events.loaded += self._reset_dropzone
        self._service.subscribe(lambda state: setattr(window.state, "studio", state))
        window.state.studio = self._service.snapshot()

    def _reset_dropzone(self) -> None:
        """Discard DOM references when the page reloads and pywebview clears its elements."""
        self._drop_element = None

    def _get_window(self) -> webview.Window:
        """Require a native window for operations that cannot run headlessly."""
        if self._window is None:
            raise RuntimeError("The desktop window is not ready.")
        return self._window

    def get_state(self) -> AppState:
        """Hydrate React after readiness or reload without starting another job."""
        return self._service.snapshot()

    def open_file_dialog(self) -> FileMetadata | None:
        """Let the operating system choose one local media file."""
        result = self._get_window().create_file_dialog(
            webview.FileDialog.OPEN, allow_multiple=False, file_types=get_media_dialog_file_types()
        )
        return self._service.select_file(str(result[0])) if result else None

    def clear_file(self) -> None:
        """Clear the pending input without deleting the user's file."""
        self._service.select_file(None)

    def set_preferences(self, model_id: str, language: str) -> None:
        """Persist the selected local model and spoken language."""
        self._service.set_preferences(model_id, language)

    def set_appearance(self, theme: Theme, language: InterfaceLanguage) -> None:
        """Keep interface preferences separate from the recording's spoken language."""
        self._service.set_appearance(theme, language)

    def select_model_folder(self) -> ModelInfo | None:
        """Validate and link a native folder chosen by the user."""
        result = self._get_window().create_file_dialog(webview.FileDialog.FOLDER)
        return self._service.import_model(Path(str(result[0]))) if result else None

    def refresh_models(self) -> None:
        """Rescan local model locations without using the network."""
        self._service.refresh_models()

    def open_models_folder(self) -> None:
        """Reveal the application-managed model directory with the platform file manager."""
        path = str(self._service.models_directory)
        if sys.platform == "win32":
            os.startfile(path)
        else:
            subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", path])

    def download_model(self, model_id: str) -> Job:
        """Start a download only after an explicit UI command."""
        return self._service.start("download", model_id)

    def run_transcription(self, file_path: str, model_name: str, language: str = "auto") -> Job:
        """Return a job immediately; progress and completion arrive through shared state."""
        return self._service.start("transcription", model_name, file_path, language)

    def cancel_job(self, job_id: str) -> None:
        """Request cancellation at the engine's next safe boundary."""
        self._service.cancel(job_id)

    def get_transcript(self, job_id: str) -> Transcript:
        """Fetch completed content separately from lightweight progress snapshots."""
        return self._service.result(job_id)

    def export_transcript(self, job_id: str, format: ExportFormat) -> str | None:
        """Save text or subtitles through a native dialog and report cancellation distinctly."""
        transcript = self._service.result(job_id)
        content = render_transcript(transcript, format)
        filename = f"{Path(transcript['file']['name']).stem}.{format}"
        result = self._get_window().create_file_dialog(
            webview.FileDialog.SAVE,
            save_filename=filename,
            file_types=(f"{format.upper()} (*.{format})",),
        )
        if not result:
            return None
        path = Path(result if isinstance(result, str) else result[0])
        if path.suffix.lower() != f".{format}":
            # Do not silently rename a confirmed target and overwrite a different file.
            raise ValueError(f"Use a filename ending in .{format} and export again.")
        path.write_text(content, encoding="utf-8")
        return str(path)

    def bind_dropzone(self) -> bool:
        """Bind the mounted dropzone, retaining the file picker if pywebview DOM binding fails."""
        try:
            if self._drop_element is not None:
                self._drop_element.off("drop", self._on_drop)
            self._drop_element = self._get_window().dom.get_element("#file-dropzone")
            if self._drop_element is None:
                return False
            handler = DOMEventHandler(self._on_drop, prevent_default=True, stop_propagation=True)
            self._drop_element.on("drop", handler)
            return True
        except Exception:
            # pywebview 6.1 can fail during DOM event enumeration on Cocoa; browsing still works.
            logger.exception("Native drop binding failed")
            return False

    def _on_drop(self, event: dict[str, Any]) -> None:
        """Use native full paths instead of guessing paths from browser File names."""
        files = event.get("dataTransfer", {}).get("files", [])
        if not files:
            return
        try:
            if len(files) != 1:
                raise ValueError("Choose one audio or video file at a time.")
            path = files[0].get("pywebviewFullPath")
            if not path:
                raise ValueError("The dropped file path is unavailable. Use Choose file instead.")
            self._service.select_file(path)
        except (ValueError, OSError) as error:
            self._service.notify(str(error))
