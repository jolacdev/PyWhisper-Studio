from schemas.app_state import ExportFormat, Transcript
from utils.time_utils import format_seconds_to_srt_time


def render_transcript(transcript: Transcript, format: ExportFormat) -> str:
    """Export normalized segments while keeping their original timing and Unicode text."""
    segments = transcript["segments"]
    if format == "txt":
        return " ".join(segment["text"].strip() for segment in segments) + "\n"
    if format not in ("srt", "vtt"):
        raise ValueError("Choose TXT, SRT or VTT.")
    blocks = []
    for index, segment in enumerate(segments, 1):
        start = format_seconds_to_srt_time(segment["start"])
        end = format_seconds_to_srt_time(segment["end"])
        if format == "vtt":
            start, end = start.replace(",", "."), end.replace(",", ".")
        blocks.append(f"{index}\n{start} --> {end}\n{segment['text']}\n")
    prefix = "WEBVTT\n\n" if format == "vtt" else ""
    return prefix + "\n".join(blocks)
