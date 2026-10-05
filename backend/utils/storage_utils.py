import os
from pathlib import Path

from platformdirs import user_data_dir

from constants import APP_DATA_NAME


def get_data_directory() -> Path:
    """Preserve installed data and accept both current and legacy development overrides."""
    override = os.environ.get("SYLLENTRA_DATA_DIR") or os.environ.get("PYWHISPER_DATA_DIR")
    return Path(override or user_data_dir(APP_DATA_NAME))
