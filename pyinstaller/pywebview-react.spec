# ============================================================
#  PyInstaller Spec File for PyWebView Vite React Application
# ============================================================

# NOTE: Disable linter and type checker for the whole file
# flake8: noqa
# type: ignore

block_cipher = None  # No encryption for bytecode archives.
added_files = [  # Files to include in the bundle (e.g., frontend build): (source_path, destination_path_in_dist).
    # NOTE: (source_path, destination_path_inside_dist)
    ("../frontend_dist", "frontend_dist"),
]

# ------------------------------------------------------------
# Step 1: Analyze backend entry point dependencies
# ------------------------------------------------------------
analysis = Analysis(
    ["../backend/main.py"],  #  Main backend entry script
    pathex=["./dist"],  #  Search path for imports
    binaries=[],  #  Specify external binary files (.dll, .so, .pyd) required at runtime.
    datas=added_files,  #  NOTE: Include non-binary files (HTML, images, config) needed at runtime.
    # Modules Resolution
    hiddenimports=[],  #  Specify hidden module imports that PyInstaller does not automatically detect (e.g., dynamic imports).
    excludes=[],  #  Modules to be excluded from the bundle. PyInstaller will act as if these modules do not exist.
    # Output Build Options
    cipher=block_cipher,  #  Optional encryption of Python bytecode
    noarchive=False,  #  If `True` Python code is stored as separate files rather than in a single archive.
    # Optional Hooks
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
)

# ------------------------------------------------------------
# Step 2: Package Python modules into a single archive
# ------------------------------------------------------------
pyz = PYZ(analysis.pure, analysis.zipped_data, cipher=block_cipher)

# ------------------------------------------------------------
# Step 3: Build the final Windows executable
# ------------------------------------------------------------
from pathlib import Path
from typing import Literal
import os
import sys


def get_icon_name() -> Literal["logo.ico", "logo.icns", "NONE"]:
    icon = "./logo.ico" if is_windows else "./logo.icns" if is_macos else None
    if not icon:
        return "NONE"

    icon_absolute_path = Path(SPECPATH).resolve() / icon
    return icon if os.path.exists(icon_absolute_path) else "NONE"


is_windows = sys.platform == "win32"
is_macos = sys.platform == "darwin"

application_name = "PyWhisper Studio"
common_kwargs = dict(
    name=application_name,  # Bundled app name
    debug=False,  # If `True`, shows bootloader debug messages during startup. Recommended to disable for production.
    strip=False,  # If `True`, removes debug symbols to reduce size (harder to debug). Not recommended on Windows.
    upx=True,  # Compress executable with UPX
    upx_exclude=[],  # Binaries to exclude from being compressed when using UPX.
)

# Windows / macOS only
bundle_identifier = "com.example.whisper_gui"
icon = get_icon_name()

win_macos_kwargs = dict(
    console=False,  # Show OS terminal for standard I/O. Ignored for .pyw scripts on Windows.
    icon=icon,  # App icon (.ico for Windows, .icns for macOS). Can translate other images if Pillow is installed. Use "NONE" to not apply any icon.
    disable_windowed_traceback=False,  #  If `True`, hides detailed error popups in GUI apps and shows only a generic message.
)

# macOS only
macos_kwargs = dict(
    target_arch=None,  # CPU architecture to build for ('x86_64', 'arm64', or 'universal2'). Uses the current machine architecture if not provided.
    codesign_identity=None,  # Apple developer ID used to sign the app for security. Uses ad-hoc signature if not provided.
    entitlements_file=None,  # Permissions the signed app is allowed.
)

# Rarely Used Special Options
other_kwargs = dict(
    runtime_tmpdir=None,  # Folder for temporary extraction of files in one-file mode
    bootloader_ignore_signals=False,  # Ignore OS signals (like Ctrl+C); usually leave False
)

if is_windows:
    exe = EXE(
        pyz,
        analysis.datas,
        analysis.binaries,
        analysis.scripts,
        analysis.zipfiles,
        [],
        **common_kwargs,
        **other_kwargs,
        **win_macos_kwargs,
    )
elif is_macos:
    bundle_kwargs = dict(
        name=f"{application_name}.app",
        bundle_identifier=bundle_identifier,  # Unique macOS app ID for code signing
        **({"icon": icon} if icon != "NONE" else {}),
    )

    app = BUNDLE(
        EXE(
            pyz,
            analysis.datas,
            analysis.binaries,
            analysis.scripts,
            analysis.zipfiles,
            [],
            **common_kwargs,
            **other_kwargs,
            **win_macos_kwargs,
            **macos_kwargs,
        ),
        **bundle_kwargs,
    )

    try:
        os.remove(os.path.join("dist", application_name))
    except FileNotFoundError:
        pass

# NOTE: Use `pyinstaller pywebview-react.spec` to build the executable. It will be created in `dist/` folder.
