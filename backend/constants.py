from enum import Enum

# App
APP_NAME = "PyWhisper Studio"

# Whisper
MODELS_DIR = "models"

# Logging
ENABLE_BUNDLED_LOGGING = True
LOGGING_FILENAME = "whisper.log"

# Media Types
VIDEO_EXTENSIONS = [
    "*.mp4",
    "*.m4v",
    "*.mkv",
    "*.webm",
    "*.mov",
    "*.avi",
    "*.ts",
]

AUDIO_EXTENSIONS = [
    "*.mp3",
    "*.wav",
    "*.flac",
    "*.m4a",
    "*.aac",
    "*.ogg",
    "*.opus",
    "*.aiff",
]


# Dropzones
# NOTE: Inheriting from (str, Enum) allows direct string comparison. (e.g., "Value1" == SomeEnum.Value1)
class AllowedDropzoneId(str, Enum):
    FILE_DROPZONE = "file-dropzone"
