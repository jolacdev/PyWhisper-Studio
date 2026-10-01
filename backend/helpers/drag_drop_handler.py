import logging
from typing import Any

import webview
from webview.dom import DOMEventHandler

from constants import AllowedDropzoneId
from utils.media_utils import get_file_metadata_from_path, is_media_file

logger = logging.getLogger(__name__)


def on_drag(_: dict[str, Any]) -> None:
    """Handle drag events (dragenter, dragstart, dragover)."""

    pass


def on_drop(event: dict[str, Any]) -> None:
    """
    Handle file drop events.

    If the dropzone is valid, update pywebview window state with the first file path.
    """

    target_id = event.get("target", {}).get("id")
    # NOTE: If target_id is not allowed, return.
    if not target_id or target_id not in AllowedDropzoneId._value2member_map_:
        return

    # NOTE: If no files are dropped, return.
    if not (files := event.get("dataTransfer", {}).get("files", [])):
        return

    # TODO: Support multiple file drops.
    if target_id == AllowedDropzoneId.TRANSCRIPTION_FILE_SELECTOR_DROPZONE_ID and len(files):
        file_path = files[0].get("pywebviewFullPath")
        if is_media_file(file_path) and (file_metadata := get_file_metadata_from_path(file_path)):
            webview.windows[0].state.transcriptionFile = file_metadata
            logger.info("File dropped: %s", file_metadata)

    logger.debug("Event type: %s. Dropped %s file(s):", event["type"], len(files))
    for f in files:
        if file_path := f.get("pywebviewFullPath"):
            logger.debug("  - %s", file_path)


def bind_drag_drop_events(window: webview.Window) -> None:
    """Bind drag and drop handlers to the entire PyWebView window."""

    # Reuse the loaded document instead of evaluating it once per handler.
    document_events = window.dom.document.events

    document_events.dragenter += DOMEventHandler(
        callback=on_drag, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
    document_events.dragstart += DOMEventHandler(
        callback=on_drag, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
    document_events.dragover += DOMEventHandler(
        callback=on_drag,
        prevent_default=True,
        stop_propagation=True,
        debounce=500,  # Debounce to reduce performance impact
    )  # type: ignore[arg-type]
    document_events.drop += DOMEventHandler(
        callback=on_drop, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
