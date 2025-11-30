from collections.abc import Iterable

from faster_whisper.transcribe import Segment

from schemas.transcription import TranscriptionSegment


def format_segments(raw_segments: Iterable[Segment]) -> list[TranscriptionSegment]:
    """Converts raw Whisper results into typed Segment objects."""
    segments: list[TranscriptionSegment] = []
    for s in raw_segments:
        segment: TranscriptionSegment = {"id": s.id, "start": s.start, "end": s.end, "text": s.text.strip()}
        segments.append(segment)
    return segments
