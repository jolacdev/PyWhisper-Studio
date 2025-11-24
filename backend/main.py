import os

import webview

from api.api import PyWebViewApi
from helpers.webview_helpers import get_frontend_entrypoint, is_running_bundled

if __name__ == "__main__":
    frontend_entrypoint = get_frontend_entrypoint(os.path.dirname(__file__))
    window = webview.create_window(
        title="Whisper GUI", url=frontend_entrypoint, js_api=PyWebViewApi(), width=950, height=700
    )

    is_devtools_enabled = not is_running_bundled()
    webview.start(debug=is_devtools_enabled)
