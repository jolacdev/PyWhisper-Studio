from collections.abc import Iterable
from typing import TypedDict

from faster_whisper.transcribe import Segment  # type: ignore

from service.whisper_service import whisper_service  # type: ignore


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


def transcribe_file(media_path: str, model_name: str = "base"):  # noqa: ANN201
    """
    Transcribes audio from a media file (audio or video) using the Whisper model.

    This function uses the shared WhisperModelService to ensure efficient model usage.
    Whisper automatically extracts audio from video files using ffmpeg.

    Args:
        media_path (str): Path to the media file.
        model_name (str): Name of the Whisper model to use. Defaults to "base".

    Returns:
            result (Tuple[Iterable[Segment], TranscriptionInfo]): tuple containing
            a generator over transcribed segments and transcription metadata.
    """
    whisper_service.load_model(model_name)
    return whisper_service.transcribe(media_path)


def format_segments(raw_segments: Iterable[Segment]) -> list[TranscriptionSegment]:
    """Converts raw Whisper results into typed Segment objects."""
    segments: list[TranscriptionSegment] = []
    for s in raw_segments:
        segment: TranscriptionSegment = {"id": s.id, "start": s.start, "end": s.end, "text": s.text.strip()}
        segments.append(segment)
    return segments
