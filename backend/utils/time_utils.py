def format_seconds_to_srt_time(seconds: float) -> str:
    """
    Converts a timestamp in seconds to SRT subtitle format (HH:MM:SS,mmm).

    Args:
        seconds (float): Time in seconds.

    Returns:
        str: Formatted timestamp string in SRT format.
    """

    total_milliseconds = int(round(seconds * 1000))

    hours, remaining_ms = divmod(total_milliseconds, 3_600_000)
    minutes, remaining_ms = divmod(remaining_ms, 60_000)
    seconds, milliseconds = divmod(remaining_ms, 1_000)

    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"
