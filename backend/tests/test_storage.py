import os
import unittest
from pathlib import Path
from unittest.mock import patch

from constants import APP_NAME
from utils.storage_utils import get_data_directory


class StorageIdentityTests(unittest.TestCase):
    """Protect installed models and existing developer setups across the rebrand."""

    @patch.dict(os.environ, {}, clear=True)
    def test_syllentra_uses_previous_data_identity_by_default(self) -> None:
        """Changing the displayed name must not change the platform storage identity."""
        with patch("utils.storage_utils.user_data_dir", return_value="/existing-data") as directory:
            self.assertEqual(APP_NAME, "Syllentra")
            self.assertEqual(get_data_directory(), Path("/existing-data"))
            directory.assert_called_once_with("PyWhisper Studio")

    @patch.dict(os.environ, {"PYWHISPER_DATA_DIR": "/legacy-override"}, clear=True)
    def test_legacy_override_remains_supported(self) -> None:
        """Existing isolated setups must keep their chosen storage location."""
        self.assertEqual(get_data_directory(), Path("/legacy-override"))

    @patch.dict(
        os.environ,
        {"PYWHISPER_DATA_DIR": "/legacy-override", "SYLLENTRA_DATA_DIR": "/current-override"},
        clear=True,
    )
    def test_syllentra_override_takes_precedence(self) -> None:
        """The current brand's explicit override wins when both names are configured."""
        self.assertEqual(get_data_directory(), Path("/current-override"))


if __name__ == "__main__":
    unittest.main()
