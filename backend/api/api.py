import logging
from time import time
from typing import Optional

import faster_whisper
import webview
from pyflow import extensity

from constants.media_types import AUDIO_EXTENSIONS, VIDEO_EXTENSIONS
from service.whisper_service import whisper_service
from utils.time_utils import format_seconds_to_srt_time as secs_to_srt
from utils.whisper import TranscriptionSegment, format_segments

# NOTE: Prefer using Union/Optional over `|` to support PyFlow-TS proper type generation.
# https://github.com/ExtensityAI/PyFlow.ts?tab=readme-ov-file#custom-type-mappings

logger = logging.getLogger(__name__)


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
    def run_transcription(self, file_path: str, model_name: str) -> list[TranscriptionSegment]:
        if model_name not in faster_whisper.available_models():
            raise ValueError(f"Model '{model_name}' is not available.")

        try:
            if (transcription_result := whisper_service.transcribe(file_path, model_name)) is None:
                raise ValueError("Transcription result returned `None`")

            raw_segments, info = transcription_result

            logger.debug("Transcription info: %s", info)
            logger.info("Starting transcription of: %s", file_path)

            start_time_ms = time() * 1000
            segments = format_segments(raw_segments)
            end_time_ms = time() * 1000

            for s in segments:
                logger.debug(
                    "\n%s\n%s --> %s\n%s\n",
                    s["id"],
                    secs_to_srt(s["start"]),
                    secs_to_srt(s["end"]),
                    s["text"],
                )

            elapsed_seconds = (end_time_ms - start_time_ms) / 1000
            logger.info("Transcribed %d segments in in %.2f seconds.", len(segments), elapsed_seconds)

            return segments

        except FileNotFoundError:
            logger.exception("File not found.")
        except ConnectionError:
            logger.exception("Network connection failed.")
        except Exception:
            logger.exception("Error during transcription.")

        return []
