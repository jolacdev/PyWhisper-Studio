from typing import TypedDict

import whisper


class Segment(TypedDict):
    id: int
    text: str
    start: float
    end: float


def get_transcription(
    file: str,
    model_name: str = "base",
) -> dict[str, str | list]:
    model = whisper.load_model(model_name, download_root="models")
    return model.transcribe(file)


def convert_transcription_to_segments(transcribed_result: dict[str, str | list]) -> list[Segment]:
    segments: list[Segment] = []
    for segment in transcribed_result["segments"]:
        seg: Segment = {
            "id": int(segment["id"] + 1),
            "start": float(segment["start"]),
            "end": float(segment["end"]),
            "text": str(segment["text"]),
        }
        segments.append(seg)
    return segments
