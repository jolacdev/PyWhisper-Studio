import logging
import multiprocessing
import os
from pathlib import Path

import webview
from platformdirs import user_data_dir

from api.api import PyWebViewApi
from constants import APP_NAME, ENABLE_BUNDLED_LOGGING, LOGGING_FILENAME
from helpers.logging_helpers import setup_logging
from helpers.webview_helpers import configure_native_window, get_frontend_entrypoint, is_running_bundled
from service.transcription_service import TranscriptionService
from service.whisper_service import FasterWhisperEngine

if __name__ == "__main__":
    # Frozen subprocesses must return before creating another desktop window.
    multiprocessing.freeze_support()
    is_bundled = is_running_bundled()
    setup_logging(APP_NAME, LOGGING_FILENAME, not is_bundled or ENABLE_BUNDLED_LOGGING, logging.INFO)
    directory = Path(os.environ.get("PYWHISPER_DATA_DIR", user_data_dir(APP_NAME)))
    # Swap this adapter to change engines; the service and bridge stay the same.
    service = TranscriptionService(FasterWhisperEngine(), directory)
    api = PyWebViewApi(service)
    window = webview.create_window(
        title=APP_NAME,
        url=get_frontend_entrypoint(os.path.dirname(__file__)),
        js_api=api,
        width=1120,
        height=800,
        min_size=(760, 620),
        background_color="#f5f5f0",
    )
    if window is None:
        raise RuntimeError("Could not create the desktop window.")
    window.events.before_show += configure_native_window
    api._attach(window)
    webview.start(debug=not is_bundled)
