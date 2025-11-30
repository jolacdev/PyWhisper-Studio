from collections.abc import Iterable
from typing import TypedDict

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


def format_segments(raw_segments: Iterable[Segment]) -> list[TranscriptionSegment]:
    """Converts raw Whisper results into typed Segment objects."""
    segments: list[TranscriptionSegment] = []
    for s in raw_segments:
        segment: TranscriptionSegment = {"id": s.id, "start": s.start, "end": s.end, "text": s.text.strip()}
        segments.append(segment)
    return segments
