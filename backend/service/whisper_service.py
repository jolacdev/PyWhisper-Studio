import logging
import os

import torch
from faster_whisper import WhisperModel  # type: ignore

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

    def load_model(self, model_name: str = "base", device: str | None = None) -> None:
        """
        Loads the Whisper model if it's not already loaded or if the model name changes.

        Args:
            model_name (str): The name of the model to load (e.g., "base", "small", "medium").
                              Defaults to "base".
            device (str | None): The device to load the model on ("cpu" or "cuda").
                                 If None, it automatically detects available device.
        """
        # If the model is already loaded and the model name is the same, return
        if self._model is not None and self._current_model_name == model_name:
            return

        # If no device is specified, automatically detect available device
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info("Loading model '%s' on %s.", model_name, device)
        self._model = WhisperModel(model_name, device=device, download_root="models")
        self._current_model_name = model_name
        logger.info("Model '%s' loaded on %s successfully.", model_name, device)

    def transcribe(self, file_path: str):  # noqa: ANN201
        """
        Transcribes the given media file using the loaded model.

        Args:
            file_path (str): The path to the media file (audio or video).

        Returns:
            result (Tuple[Iterable[Segment], TranscriptionInfo]): tuple containing
            a generator over transcribed segments and transcription metadata.

        Raises:
            FileNotFoundError: If the file does not exist.
        """
        if self._model is None:
            self.load_model()  # Auto-load default if not loaded

        # TODO: Check if should remove URL
        if not os.path.exists(file_path) and not file_path.startswith("http"):
            raise FileNotFoundError(f"File not found: {file_path}")

        if self._model is not None:
            return self._model.transcribe(file_path)


# Global service instance
whisper_service = WhisperModelService()
