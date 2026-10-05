import tempfile
import unittest
from pathlib import Path
from threading import Event
from unittest.mock import patch

from schemas.app_state import AppState, EngineInfo, ModelInfo
from schemas.file_metadata import FileMetadata
from service.engine import EngineResult, ProgressCallback
from service.transcription_service import TranscriptionService, empty_job


class FakeEngine:
    """Provide deterministic metadata and output without loading inference libraries."""

    info: EngineInfo = {
        "id": "test",
        "name": "Test engine",
        "languages": [{"code": "auto", "name": "Auto"}],
        "modelFormat": "",
    }

    def list_models(self, _directory: Path, _local_paths: list[str]) -> list[ModelInfo]:
        """Avoid local model discovery during service tests."""
        return []

    def import_model(self, directory: Path) -> ModelInfo:
        """Reject imports that are outside these tests."""
        raise NotImplementedError

    def download_model(self, model_id: str, directory: Path, cancel: Event, report: ProgressCallback) -> None:
        """Reject downloads that are outside these tests."""
        raise NotImplementedError

    def delete_model(self, model: ModelInfo, directory: Path) -> None:
        """Reject cache deletion outside these tests."""
        raise NotImplementedError

    def transcribe(
        self, file_path: str, model: ModelInfo, language: str, cancel: Event, report: ProgressCallback
    ) -> EngineResult:
        """Return an empty successful transcript for timing verification."""
        return {"segments": [], "language": "en", "duration": 42.0}


class ProgressTests(unittest.TestCase):
    """Verify estimate warmup and immutable result metadata."""

    def setUp(self) -> None:
        """Create an isolated service for each progress scenario."""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.service = TranscriptionService(FakeEngine(), Path(self.temporary.name))
        self.service._state["job"] = {**empty_job(), "id": "test-job", "status": "running"}

    def test_each_segment_publishes_but_estimate_waits_for_sufficient_samples(self) -> None:
        snapshots: list[AppState] = []
        self.service.subscribe(snapshots.append)
        with patch("service.transcription_service.monotonic", side_effect=[10, 11, 12, 14, 16, 18]):
            for progress in [0.0, 1.0, 2.0, 3.0, 4.0, 5.0]:
                self.service._report(progress, "Transcribing on your computer…")

        self.assertEqual([state["job"]["progress"] for state in snapshots], [0, 1, 2, 3, 4, 5])
        self.assertTrue(all(state["job"]["remainingSeconds"] is None for state in snapshots[:4]))
        first_estimate = snapshots[4]["job"]["remainingSeconds"]
        next_estimate = snapshots[5]["job"]["remainingSeconds"]
        assert first_estimate is not None
        assert next_estimate is not None
        self.assertAlmostEqual(first_estimate, 144.0)
        self.assertAlmostEqual(next_estimate, 152.0)

    def test_burst_of_segments_does_not_show_premature_estimate(self) -> None:
        with patch("service.transcription_service.monotonic", side_effect=[10, 10.1, 10.2, 10.3, 10.4]):
            for progress in [0.0, 5.0, 10.0, 15.0, 20.0]:
                self.service._report(progress, "Transcribing on your computer…")
        self.assertIsNone(self.service.snapshot()["job"]["remainingSeconds"])

    def test_tiny_progress_coverage_does_not_show_estimate(self) -> None:
        with patch("service.transcription_service.monotonic", side_effect=[10, 12, 14, 16, 18]):
            for progress in [0.0, 0.1, 0.2, 0.3, 0.4]:
                self.service._report(progress, "Transcribing on your computer…")
        self.assertIsNone(self.service.snapshot()["job"]["remainingSeconds"])

    def test_repeated_progress_does_not_count_as_completed_segments(self) -> None:
        with patch("service.transcription_service.monotonic", side_effect=[10, 12, 14, 16, 18]):
            for progress in [0.0, 10.0, 10.0, 10.0, 10.0]:
                self.service._report(progress, "Transcribing on your computer…")
        self.assertIsNone(self.service.snapshot()["job"]["remainingSeconds"])

    def test_result_retains_model_engine_and_measured_processing_time(self) -> None:
        model: ModelInfo = {
            "id": "base",
            "name": "Base",
            "description": "",
            "sizeLabel": "",
            "sourceUrl": "",
            "path": "/model",
            "caches": [],
            "isAvailable": True,
            "isRecommended": True,
        }
        file: FileMetadata = {"name": "test.wav", "size": 1024, "type": "audio", "absolutePath": "/test.wav"}
        with patch("service.transcription_service.monotonic", side_effect=[20.0, 27.5]):
            self.service._run(self.service.snapshot()["job"], model, file, "auto")
        model["name"] = "Another model"
        result = self.service.result("test-job")
        self.assertEqual(result["modelName"], "Base")
        self.assertEqual(result["engineName"], "Test engine")
        self.assertEqual(result["processingSeconds"], 7.5)
        self.assertEqual(result["duration"], 42.0)


if __name__ == "__main__":
    unittest.main()
