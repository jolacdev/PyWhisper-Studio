import os
import tempfile
import unittest
from pathlib import Path
from shutil import rmtree
from unittest.mock import Mock, patch

from schemas.app_state import ModelInfo
from service.whisper_service import FasterWhisperEngine


def validate_fixture(directory: Path) -> None:
    """Keep discovery offline without requiring actual model weights in cache fixtures."""
    if not (directory / "model.bin").is_file():
        raise ValueError("Incomplete fixture")


class ModelCacheTests(unittest.TestCase):
    """Exercise real Hub cache cleanup exclusively inside temporary folders."""

    def setUp(self) -> None:
        """Replace shared cache discovery so tests never touch the user's model files."""
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.managed = self.root / "app-models"
        self.shared = self.root / "shared-models"
        self.managed.mkdir()
        self.shared.mkdir()
        shared_patch = patch("service.whisper_service.HF_HUB_CACHE", str(self.shared))
        validation_patch = patch("service.whisper_service.validate_model", side_effect=validate_fixture)
        shared_patch.start()
        validation_patch.start()
        self.addCleanup(shared_patch.stop)
        self.addCleanup(validation_patch.stop)
        self.engine = FasterWhisperEngine()

    def _cache(self, root: Path, model: str = "base", copied_files: bool = False) -> Path:
        """Build multiple revisions with Unix symlinks or Windows-style copied snapshot files."""
        repository = root / f"models--Systran--faster-whisper-{model}"
        blobs = repository / "blobs"
        blobs.mkdir(parents=True)
        (blobs / "weights").write_bytes(b"test weights")
        for revision in ("a" * 40, "b" * 40):
            snapshot = repository / "snapshots" / revision
            snapshot.mkdir(parents=True)
            if copied_files:
                (snapshot / "model.bin").write_bytes(b"test weights")
            else:
                (snapshot / "model.bin").symlink_to(os.path.relpath(blobs / "weights", snapshot))
        (repository / "refs").mkdir()
        (repository / "refs" / "main").write_text("b" * 40)
        return repository

    def _model(self) -> ModelInfo:
        """Read the same deletion metadata the confirmation dialog receives."""
        return next(model for model in self.engine.list_models(self.managed, []) if model["id"] == "base")

    def test_deletes_all_versions_in_both_caches_and_preserves_other_repositories(self) -> None:
        """Clearing a model must free its blobs while retaining unrelated models with matching revisions."""
        managed = self._cache(self.managed)
        shared = self._cache(self.shared)
        unrelated = self._cache(self.shared, "tiny")
        model = self._model()
        self.assertEqual(
            model["caches"],
            [{"directory": str(managed), "isShared": False}, {"directory": str(shared), "isShared": True}],
        )
        self.engine._model = Mock()
        self.engine._model_path = model["path"]
        self.engine.delete_model(model, self.managed)
        self.assertFalse(managed.exists())
        self.assertFalse(shared.exists())
        self.assertTrue((unrelated / "snapshots" / ("b" * 40) / "model.bin").is_file())
        self.assertIsNone(self.engine._model)
        self.assertIsNone(self.engine._model_path)
        self.assertFalse(self._model()["isAvailable"])

    def test_shared_only_model_can_be_deleted(self) -> None:
        """Models discovered outside app storage must expose and delete their shared cache."""
        shared = self._cache(self.shared)
        model = self._model()
        self.assertTrue(model["isAvailable"])
        self.assertEqual(model["caches"], [{"directory": str(shared), "isShared": True}])
        self.engine.delete_model(model, self.managed)
        self.assertFalse(shared.exists())

    def test_matching_app_and_shared_cache_is_listed_once_and_marked_shared(self) -> None:
        """Custom cache settings must not conceal shared storage or delete the same folder twice."""
        managed = self._cache(self.managed)
        with patch("service.whisper_service.HF_HUB_CACHE", str(self.managed)):
            model = self._model()
            self.assertEqual(model["caches"], [{"directory": str(managed), "isShared": True}])
            self.engine.delete_model(model, self.managed)
        self.assertFalse(managed.exists())

    def test_copied_snapshot_files_are_deleted(self) -> None:
        """Hub caches must be removable without relying on Windows symlink support."""
        managed = self._cache(self.managed, copied_files=True)
        self.engine.delete_model(self._model(), self.managed)
        self.assertFalse(managed.exists())

    def test_incomplete_downloads_can_be_cleared(self) -> None:
        """Partial weights must be removable even without an available model or valid revision."""
        managed = self.managed / "models--Systran--faster-whisper-base"
        (managed / "blobs").mkdir(parents=True)
        (managed / "blobs" / "weights.incomplete").write_bytes(b"partial weights")
        model = self._model()
        self.assertFalse(model["isAvailable"])
        self.assertEqual(len(model["caches"]), 1)
        self.engine.delete_model(model, self.managed)
        self.assertFalse(managed.exists())

    def test_new_cache_requires_a_new_confirmation(self) -> None:
        """A newly discovered shared copy must not expand a previous confirmation's scope."""
        managed = self._cache(self.managed)
        model = self._model()
        shared = self._cache(self.shared)
        with self.assertRaisesRegex(ValueError, "storage changed"):
            self.engine.delete_model(model, self.managed)
        self.assertTrue(managed.exists())
        self.assertTrue(shared.exists())

    def test_replaced_cache_symlink_cannot_delete_external_files(self) -> None:
        """A moved or substituted cache folder must never redirect deletion into user files."""
        managed = self._cache(self.managed)
        model = self._model()
        external = self.root / "external-model"
        external.mkdir()
        (external / "model.bin").write_bytes(b"external weights")
        rmtree(managed)
        managed.symlink_to(external, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "storage changed"):
            self.engine.delete_model(model, self.managed)
        self.assertTrue((external / "model.bin").is_file())

    def test_external_folder_and_unknown_id_cannot_be_deleted(self) -> None:
        """The adapter must enforce catalog ownership independently of the UI and service."""
        external = self.root / "external-model"
        external.mkdir()
        (external / "model.bin").write_bytes(b"external weights")
        model = self.engine.import_model(external)
        with self.assertRaisesRegex(ValueError, "downloaded catalog model"):
            self.engine.delete_model(model, self.managed)
        self.assertTrue((external / "model.bin").is_file())

    def test_permission_failure_is_reported_without_claiming_success(self) -> None:
        """A Hub deletion that logs a filesystem failure must remain an error in the app."""
        managed = self._cache(self.managed)
        with (
            patch("huggingface_hub.utils._cache_manager.DeleteCacheStrategy.execute"),
            self.assertRaisesRegex(ValueError, "could not be deleted"),
        ):
            self.engine.delete_model(self._model(), self.managed)
        self.assertTrue(managed.exists())
