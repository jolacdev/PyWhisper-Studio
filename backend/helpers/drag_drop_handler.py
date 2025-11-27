from typing import Any

import webview
from webview.dom import DOMEventHandler

from constants.dropzones import AllowedDropzoneId  # type: ignore


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
    if len(files) and target_id == AllowedDropzoneId.FILE_DROPZONE:
        webview.windows[0].state.file = files[0].get("pywebviewFullPath")

    # Debug.
    print(f"Event type: {event['type']}. Dropped {len(files)} file(s):")
    for file in files:
        if file_path := file.get("pywebviewFullPath"):
            print(f"  - {file_path}")


def bind_drag_drop_events(window: webview.Window) -> None:
    """Bind drag and drop handlers to the entire PyWebView window."""

    window.dom.document.events.dragenter += DOMEventHandler(
        callback=on_drag, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
    window.dom.document.events.dragstart += DOMEventHandler(
        callback=on_drag, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
    window.dom.document.events.dragover += DOMEventHandler(
        callback=on_drag,
        prevent_default=True,
        stop_propagation=True,
        debounce=500,  # Debounce to reduce performance impact
    )  # type: ignore[arg-type]
    window.dom.document.events.drop += DOMEventHandler(
        callback=on_drop, prevent_default=True, stop_propagation=True
    )  # type: ignore[arg-type]
