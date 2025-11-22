import os
from time import time

import webview

from api.api import PyWebViewApi
from helpers.webview_helpers import get_frontend_entrypoint, is_running_bundled
from utils.whisper import convert_transcription_to_segments, get_transcription


def temp_print_transcribe_segments() -> None:  # TODO: Temp function, remove
    file = "https://keithito.com/LJ-Speech-Dataset/LJ037-0171.wav"
    ms_start = time() * 1000
    segments = convert_transcription_to_segments(get_transcription(file))
    ms_end = time() * 1000

    for segment in segments:
        print(f"""{int(segment["id"])}
{segment["start"]} --> {segment["end"]}
{segment["text"]}
""")

    duration_seconds = (ms_end - ms_start) / 1000
    print(f"File process lasted: {duration_seconds:.2f} seconds.")


if __name__ == "__main__":
    frontend_entrypoint = get_frontend_entrypoint(os.path.dirname(__file__))
    window = webview.create_window(
        title="Whisper GUI", url=frontend_entrypoint, js_api=PyWebViewApi(), width=950, height=700
    )

    is_devtools_enabled = not is_running_bundled()
    webview.start(temp_print_transcribe_segments, debug=is_devtools_enabled)
