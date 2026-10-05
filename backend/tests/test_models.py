import tempfile
import unittest
from pathlib import Path
from shutil import rmtree
from threading import Event
from unittest.mock import patch

from schemas.app_state import EngineInfo, Job, ModelInfo
from service.engine import CancelledError, EngineResult, ProgressCallback
from service.transcription_service import TranscriptionService, empty_job


class FolderEngine:
    """Discover tiny on-disk fixtures without loading a recognition engine."""

    info: EngineInfo = {
        "id": "test",
        "name": "Test engine",
        "languages": [{"code": "auto", "name": "Auto"}],
        "modelFormat": "",
    }

    def _model(self, directory: Path, catalog: bool = False) -> ModelInfo:
        """Keep model identity tied to its saved external location."""
        path = str(directory.resolve())
        return {
            "id": "base" if catalog else f"local:{path}",
            "name": "Base" if catalog else directory.name,
            "description": "Test model",
            "sizeLabel": "Local folder",
            "sourceUrl": "https://example.com/base" if catalog else "",
            "path": path,
            "caches": [{"directory": path, "isShared": False}] if catalog and directory.exists() else [],
            "isAvailable": (directory / "model.bin").is_file(),
            "isRecommended": catalog,
        }

    def list_models(self, directory: Path, local_paths: list[str]) -> list[ModelInfo]:
        """Retain unavailable external links so users can repair or remove them."""
        return [self._model(directory / "base", catalog=True)] + [
            self._model(Path(path)) for path in local_paths
        ]

    def import_model(self, directory: Path) -> ModelInfo:
        """Validate a fixture before the service changes persisted links."""
        model = self._model(directory)
        if not model["isAvailable"]:
            raise ValueError("Incomplete model")
        return model

    def download_model(self, model_id: str, directory: Path, cancel: Event, report: ProgressCallback) -> None:
        """Reject downloads outside model-link tests."""
        raise NotImplementedError

    def delete_model(self, model: ModelInfo, directory: Path) -> None:
        """Remove only the fixture's catalog files."""
        rmtree(directory / model["id"])

    def transcribe(
        self, file_path: str, model: ModelInfo, language: str, cancel: Event, report: ProgressCallback
    ) -> EngineResult:
        """Reject inference outside model-link tests."""
        raise NotImplementedError


class ModelLinkTests(unittest.TestCase):
    """Exercise relocation, persistence, selection, and preservation of model files."""

    def setUp(self) -> None:
        """Provide one downloaded model and isolated external model folders."""
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.directory = self.root / "app"
        self.catalog = self.directory / "models" / "base"
        self.catalog.mkdir(parents=True)
        (self.catalog / "model.bin").write_text("test weights")
        self.service = TranscriptionService(FolderEngine(), self.directory)

    def _folder(self, name: str) -> Path:
        """Create an external fixture that can be moved or checked after unlinking."""
        path = self.root / name
        path.mkdir()
        (path / "model.bin").write_text("test weights")
        return path

    def test_relink_moved_folder_replaces_old_entry_and_survives_restart(self) -> None:
        """A changed location must not create an additional stale card."""
        original = self._folder("original")
        model = self.service.import_model(original)
        moved = self.root / "moved"
        original.rename(moved)
        self.service.refresh_models()
        self.assertFalse(
            next(m for m in self.service.snapshot()["models"] if m["id"] == model["id"])["isAvailable"]
        )

        replacement = self.service.import_model(moved, model["id"])
        restarted = TranscriptionService(FolderEngine(), self.directory).snapshot()
        self.assertEqual(restarted["preferences"]["localModelPaths"], [str(moved.resolve())])
        self.assertEqual(restarted["preferences"]["modelId"], replacement["id"])
        self.assertNotIn(model["id"], [item["id"] for item in restarted["models"]])

    def test_relink_to_existing_folder_does_not_duplicate_it(self) -> None:
        """Repairing a link can reuse another registered folder."""
        first = self.service.import_model(self._folder("first"))
        second_path = self._folder("second")
        second = self.service.import_model(second_path)
        self.service.import_model(second_path, first["id"])
        state = self.service.snapshot()
        self.assertEqual(state["preferences"]["localModelPaths"], [str(second_path.resolve())])
        self.assertEqual([model["id"] for model in state["models"]], ["base", second["id"]])

    def test_invalid_replacement_preserves_original_link_and_preferences(self) -> None:
        """Validation failures must not remove the previous location."""
        model = self.service.import_model(self._folder("original"))
        before = self.service.snapshot()
        saved = (self.directory / "preferences.json").read_text()
        with self.assertRaisesRegex(ValueError, "Incomplete model"):
            self.service.import_model(self.root / "incomplete", model["id"])
        self.assertEqual(self.service.snapshot(), before)
        self.assertEqual((self.directory / "preferences.json").read_text(), saved)

    def test_unlink_selected_model_preserves_files_and_selects_available_fallback(self) -> None:
        """Unlinking is a preference change rather than file deletion."""
        path = self._folder("external")
        model = self.service.import_model(path)
        self.service.unlink_model(model["id"])
        self.assertTrue((path / "model.bin").is_file())
        restarted = TranscriptionService(FolderEngine(), self.directory).snapshot()
        self.assertEqual(restarted["preferences"]["modelId"], "base")
        self.assertEqual(restarted["preferences"]["localModelPaths"], [])

    def test_unlink_other_model_keeps_current_selection(self) -> None:
        """Removing an unused link must not change the chosen model."""
        first = self.service.import_model(self._folder("first"))
        second = self.service.import_model(self._folder("second"))
        self.service.unlink_model(first["id"])
        self.assertEqual(self.service.snapshot()["preferences"]["modelId"], second["id"])

    def test_unlink_last_available_model_clears_selection(self) -> None:
        """No remaining model must leave the app waiting for an explicit setup choice."""
        model = self.service.import_model(self._folder("external"))
        (self.catalog / "model.bin").unlink()
        self.service.refresh_models()
        self.service.unlink_model(model["id"])
        self.assertEqual(self.service.snapshot()["preferences"]["modelId"], "")

    def test_catalog_models_cannot_be_unlinked_or_replaced(self) -> None:
        """Link actions must not alter managed downloads."""
        path = self._folder("external")
        self.service.import_model(self.catalog)
        with self.assertRaisesRegex(ValueError, "Choose a linked model first"):
            self.service.unlink_model("base")
        with self.assertRaisesRegex(ValueError, "Choose a linked model first"):
            self.service.import_model(path, "base")
        self.assertTrue((self.catalog / "model.bin").is_file())

    def test_link_changes_are_rejected_during_active_jobs(self) -> None:
        """The worker's model location stays stable during a transcription."""
        path = self._folder("external")
        model = self.service.import_model(path)
        self.service._state["job"]["status"] = "running"
        before = self.service.snapshot()
        with self.assertRaisesRegex(ValueError, "Wait for the current task"):
            self.service.unlink_model(model["id"])
        with self.assertRaisesRegex(ValueError, "Wait for the current task"):
            self.service.import_model(path, model["id"])
        self.assertEqual(self.service.snapshot(), before)

    def test_delete_selected_catalog_model_preserves_external_models_and_persists_fallback(self) -> None:
        """Removing downloaded weights must leave external files and choose a usable model."""
        external = self._folder("external")
        linked = self.service.import_model(external)
        self.service.set_preferences("base", "auto")
        self.service.delete_model("base")
        self.assertFalse(self.catalog.exists())
        self.assertTrue((external / "model.bin").is_file())
        state = TranscriptionService(FolderEngine(), self.directory).snapshot()
        self.assertEqual(state["preferences"]["modelId"], linked["id"])
        self.assertEqual(state["preferences"]["localModelPaths"], [str(external.resolve())])
        self.assertFalse(next(model for model in state["models"] if model["id"] == "base")["isAvailable"])

    def test_delete_only_downloaded_model_clears_selection(self) -> None:
        """A deleted catalog entry remains downloadable without a dangling selection."""
        self.service.delete_model("base")
        state = self.service.snapshot()
        self.assertEqual(state["preferences"]["modelId"], "")
        self.assertEqual(len(state["models"]), 1)
        self.assertEqual(state["models"][0]["caches"], [])

    def test_delete_rejects_external_models_and_active_jobs(self) -> None:
        """File deletion must be confined to idle catalog downloads."""
        external = self._folder("external")
        linked = self.service.import_model(external)
        with self.assertRaisesRegex(ValueError, "downloaded catalog model"):
            self.service.delete_model(linked["id"])
        self.service._state["job"]["status"] = "running"
        with self.assertRaisesRegex(ValueError, "Wait for the current task"):
            self.service.delete_model("base")
        self.assertTrue(self.catalog.exists())
        self.assertTrue((external / "model.bin").exists())

    def test_delete_failure_refreshes_partial_removal_without_losing_external_files(self) -> None:
        """State must describe remaining files even when a multi-cache deletion fails."""
        external = self._folder("external")
        linked = self.service.import_model(external)
        self.service.set_preferences("base", "auto")

        def fail_after_removing(model: ModelInfo, directory: Path) -> None:
            """Simulate a first cache removal followed by a second-cache permission failure."""
            rmtree(directory / model["id"])
            raise OSError("Permission denied")

        with (
            patch.object(self.service.engine, "delete_model", side_effect=fail_after_removing),
            self.assertRaisesRegex(OSError, "Permission denied"),
        ):
            self.service.delete_model("base")
        state = self.service.snapshot()
        self.assertEqual(state["preferences"]["modelId"], linked["id"])
        self.assertFalse(next(model for model in state["models"] if model["id"] == "base")["isAvailable"])
        self.assertTrue((external / "model.bin").exists())

    def test_interrupted_downloads_expose_partial_files_for_cleanup(self) -> None:
        """Cancellation and failure must expose the new cache without requiring a manual refresh."""
        for error_type in (CancelledError, OSError):
            with self.subTest(error_type=error_type):
                rmtree(self.catalog)
                self.service.refresh_models()
                model = self.service.snapshot()["models"][0]
                job: Job = {
                    **empty_job(),
                    "id": "download",
                    "modelId": "base",
                    "kind": "download",
                    "status": "running",
                }
                self.service._state["job"] = job

                def interrupt_download(
                    model_id: str,
                    directory: Path,
                    cancel: Event,
                    report: ProgressCallback,
                    interruption: type[Exception] = error_type,
                ) -> None:
                    """Write a partial cache before the worker is interrupted."""
                    target = directory / model_id
                    target.mkdir()
                    (target / "weights.incomplete").write_text("partial weights")
                    raise interruption

                with (
                    patch.object(self.service.engine, "download_model", side_effect=interrupt_download),
                    patch("service.transcription_service.logger.exception"),
                ):
                    self.service._run(job, model, None, "auto")
                state = self.service.snapshot()
                self.assertFalse(state["models"][0]["isAvailable"])
                self.assertEqual(
                    state["models"][0]["caches"],
                    [{"directory": str(self.catalog.resolve()), "isShared": False}],
                )
                self.assertEqual(
                    state["job"]["status"], "cancelled" if error_type is CancelledError else "error"
                )


if __name__ == "__main__":
    unittest.main()
