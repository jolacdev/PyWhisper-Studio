from typing import TypedDict


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
