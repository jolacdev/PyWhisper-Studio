import os
from collections.abc import Iterable
from typing import TypedDict

import torch
from faster_whisper import WhisperModel
from faster_whisper.transcribe import Segment


class TranscriptionSegment(TypedDict):
    """
    Represents a single segment of the transcription.

    Attributes:
        id (int): The unique identifier for the segment.
        text (str): The transcribed text for this segment.
        start (float): The start time of the segment in seconds.
        end (float): The end time of the segment in seconds.
    """

    id: int
    text: str
    start: float
    end: float


class WhisperModelService:
    """Singleton service class to Whisper model and ensure it is loaded only once."""

    _instance = None
    _model = None
    _current_model_name = None

    def __new__(cls) -> "WhisperModelService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_model(self, model_name: str = "base", device: str | None = None) -> None:
        """
        Loads the Whisper model if it's not already loaded or if the model name changes.

        Args:
            model_name (str): The name of the model to load (e.g., "base", "small", "medium").
                              Defaults to "base".
            device (str | None): The device to load the model on ("cpu" or "cuda").
                                 If None, it automatically detects available device.
        """
        # If the model is already loaded and the model name is the same, return
        if self._model is not None and self._current_model_name == model_name:
            return

        # If no device is specified, automatically detect available device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        print(f"Loading model '{model_name}' on {device}.")  # TODO: Remove debug print
        self._model = WhisperModel(model_name, device=device, download_root="models")
        self._current_model_name = model_name
        print(f"Model '{model_name}' loaded on {device} successfully.")  # TODO: Remove debug print

    def transcribe(self, file_path: str):  # noqa: ANN201
        """
        Transcribes the given media file using the loaded model.

        Args:
            file_path (str): The path to the media file (audio or video).

        Returns:
            result (Tuple[Iterable[Segment], TranscriptionInfo]): The raw transcription result
            with segments and information.

        Raises:
            FileNotFoundError: If the file does not exist.
        """
        if self._model is None:
            self.load_model()  # Auto-load default if not loaded

        # TODO: Check if should remove URL
        if not os.path.exists(file_path) and not file_path.startswith("http"):
            raise FileNotFoundError(f"File not found: {file_path}")

        print("Transcribing file:", file_path)  # TODO: Remove debug print
        return self._model.transcribe(file_path)


# Global service instance
_whisper_service = WhisperModelService()


def transcribe_file(media_path: str, model_name: str = "base"):  # noqa: ANN201
    """
    Transcribes audio from a media file (audio or video) using the Whisper model.

    This function uses the shared WhisperModelService to ensure efficient model usage.
    Whisper automatically extracts audio from video files using ffmpeg.

    Args:
        media_path (str): Path to the media file.
        model_name (str): Name of the Whisper model to use. Defaults to "base".

    Returns:
            result (Tuple[Iterable[Segment], TranscriptionInfo]): The raw transcription result
            with segments and information.
    """
    _whisper_service.load_model(model_name)
    return _whisper_service.transcribe(media_path)


def format_segments(raw_segments: Iterable[Segment]) -> list[TranscriptionSegment]:
    """Converts raw Whisper results into typed Segment objects."""
    segments: list[TranscriptionSegment] = []
    for s in raw_segments:
        segment: TranscriptionSegment = {"id": s.id, "start": s.start, "end": s.end, "text": s.text.strip()}
        segments.append(segment)
    return segments
