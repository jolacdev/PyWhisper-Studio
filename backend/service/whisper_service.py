import logging
import os

import torch
from faster_whisper import WhisperModel
from platformdirs import user_data_dir

from constants import APP_NAME, MODELS_DIR

logger = logging.getLogger(__name__)


class WhisperModelService:
    """Singleton service class to Whisper model and ensure it is loaded only once."""

    _instance = None
    _model = None
    _current_model_name = None

    def __new__(cls) -> "WhisperModelService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self, model_name: str, device: str | None = None) -> None:
        """
        Loads the Whisper model if it's not already loaded or if the model name changes.

        Args:
            model_name (str): The name of the model to load (e.g., "base", "small", "medium").
            device (str | None): The device to load the model on ("cpu" or "cuda").
                                 If None, it automatically detects available device.
        """

        # If no device is specified, automatically detect available device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info("Loading model '%s' on %s.", model_name, device)
        models_dir = os.path.join(user_data_dir(APP_NAME), MODELS_DIR)
        self._model = WhisperModel(model_name, device=device, download_root=models_dir)
        self._current_model_name = model_name
        logger.info("Model '%s' loaded on %s successfully.", model_name, device)

    def transcribe(self, file_path: str, model_name: str):  # noqa: ANN201
        """
        Transcribes the given media file.

        Also loads the model if it's not already loaded or if the model name changes.

        Args:
            file_path (str): The path to the media file (audio or video).
            model_name (str): The name of the model to load (e.g., "base", "small", "medium").

        Returns:
            result (Tuple[Iterable[Segment], TranscriptionInfo]): tuple containing
            a generator over transcribed segments and transcription metadata.

        Raises:
            FileNotFoundError: If the file does not exist.
        """

        # If no model name is specified, use the default model
        if not model_name:
            model_name = "base"

        # If the model is not loaded or the model name is different, load the model
        if self._model is None or self._current_model_name != model_name:
            self._load_model(model_name=model_name)

        # TODO: Check if should remove URL
        if not os.path.exists(file_path) and not file_path.startswith("http"):
            raise FileNotFoundError(f"File not found: {file_path}")

        if self._model is not None:
            return self._model.transcribe(file_path)


# Global service instance
whisper_service = WhisperModelService()
