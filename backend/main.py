import logging
import os

import webview

from api.api import PyWebViewApi
from constants import ENABLE_BUNDLED_LOGGING, LOGGING_FILENAME
from helpers.webview_helpers import get_frontend_entrypoint, is_running_bundled

if __name__ == "__main__":
    is_bundled = is_running_bundled()
    should_log = not is_bundled or ENABLE_BUNDLED_LOGGING
    is_devtools_enabled = not is_bundled

    setup_logging(
        enable_logging=should_log,
        log_level=logging.INFO if is_bundled else logging.DEBUG,
        filename=LOGGING_FILENAME,
    )

    frontend_entrypoint = get_frontend_entrypoint(os.path.dirname(__file__))
    window = webview.create_window(
        title="PyWhisper Studio", url=frontend_entrypoint, js_api=PyWebViewApi(), width=950, height=700
    )

    webview.start(debug=is_devtools_enabled)
