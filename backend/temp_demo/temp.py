from time import time

from utils.time_utils import format_seconds_to_srt_time as secs_to_srt
from utils.whisper import format_segments, transcribe_file


# TODO: Temporary demo function to remove.
def demo_whisper_transcription() -> None:
    """Demo function to test Whisper transcription functionality."""
    audio_url = "https://keithito.com/LJ-Speech-Dataset/LJ037-0171.wav"
    _video_path = "/Users/jolacdev/Downloads/YT_Short_Sample.mp4"

    try:
        print(f"Starting transcription of: {audio_url}")

        start_time_ms = time() * 1000
        raw_segments, info = transcribe_file(audio_url, model_name="base")
        print(f"Transcription Result:\nSegments: {raw_segments}\n\nInfo: {info}")  # TODO: Remove debug print
        end_time_ms = time() * 1000

        segments = format_segments(raw_segments)
        print(f"Language: {info.language}\nTotal segments: {len(segments)}\n")

        for s in segments:
            print(f"{s['id']}\n{secs_to_srt(s['start'])} --> {secs_to_srt(s['end'])}\n{s['text']}\n")

        processing_time_seconds = (end_time_ms - start_time_ms) / 1000
        print(f"{'=' * 80}\n✓ Transcription completed in {processing_time_seconds:.2f} seconds\n{'=' * 80}")

    except FileNotFoundError as e:
        print(f"✗ Error: Audio file not found - {e}")
    except ConnectionError as e:
        print(f"✗ Error: Network connection failed - {e}")
    except Exception as e:
        print(f"✗ Error during transcription: {type(e).__name__}: {e}")
