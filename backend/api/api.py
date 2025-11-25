from time import time
from typing import Optional

import webview
from pyflow import extensity  # type: ignore

from constants.media_types import AUDIO_EXTENSIONS, VIDEO_EXTENSIONS  # type: ignore
from utils.time_utils import format_seconds_to_srt_time as secs_to_srt  # type: ignore
from utils.whisper import TranscriptionSegment, format_segments, transcribe_file  # type: ignore

# NOTE: Prefer using Union/Optional over `|` to support PyFlow-TS proper type generation.
# https://github.com/ExtensityAI/PyFlow.ts?tab=readme-ov-file#custom-type-mappings


@extensity
class PyWebViewApi:
    """Python API functions exposed to JavaScript."""

    def open_file_dialog(self) -> Optional[str]:
        file_types = (
            f"Media Files ({';'.join(AUDIO_EXTENSIONS + VIDEO_EXTENSIONS)})",
            f"Audio Files ({';'.join(AUDIO_EXTENSIONS)})",
            f"Video Files ({';'.join(VIDEO_EXTENSIONS)})",
        )
        if not (
            result := webview.windows[0].create_file_dialog(
                webview.FileDialog.OPEN, allow_multiple=False, file_types=file_types
            )
        ):
            return None

        filename = str(result) if not isinstance(result, (tuple, list)) else str(result[0])
        return filename

    # TODO: Print messages for debugging purposes, remove whe not needed.
    # TODO: Online audio example: https://keithito.com/LJ-Speech-Dataset/LJ037-0171.wav
    def run_transcription(self, file_path: str) -> list[TranscriptionSegment]:
        try:
            raw_segments, info = transcribe_file(file_path, model_name="base")
            print(f"Info: {info}\nStarting transcription of: {file_path}")

            start_time_ms = time() * 1000
            segments = format_segments(raw_segments)
            end_time_ms = time() * 1000

            for s in segments:
                print(f"{s['id']}\n{secs_to_srt(s['start'])} --> {secs_to_srt(s['end'])}\n{s['text']}\n")

            elapsed_seconds = (end_time_ms - start_time_ms) / 1000
            print(f"\n{'=' * 80}")
            print(f"✓ Transcribed {len(segments)} segments in in {elapsed_seconds:.2f} seconds.")
            print(f"\n{'=' * 80}")

            return segments

        except FileNotFoundError as e:
            print(f"✗ Error: File not found - {e}")
        except ConnectionError as e:
            print(f"✗ Error: Network connection failed - {e}")
        except Exception as e:
            print(f"✗ Error during transcription: {type(e).__name__}: {e}")

        return []
