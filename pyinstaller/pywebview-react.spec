from pathlib import Path
import sys

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, copy_metadata

ROOT = Path(SPECPATH).parent
APP_NAME = "PyWhisper Studio"
icon = Path(SPECPATH) / ("logo.icns" if sys.platform == "darwin" else "logo.ico")

# VAD needs its packaged ONNX model even when speech models are stored outside the app.
datas = [(str(ROOT / "frontend_dist"), "frontend_dist")]
datas += collect_data_files("faster_whisper", includes=["assets/*.onnx"])
datas += copy_metadata("huggingface_hub")

analysis = Analysis(
    [str(ROOT / "backend/main.py")],
    pathex=[str(ROOT / "backend")],
    datas=datas,
    binaries=collect_dynamic_libs("ctranslate2"),
    # Hugging Face exposes these modules lazily, beyond static import discovery.
    hiddenimports=[
        "huggingface_hub.hf_api",
        "huggingface_hub.file_download",
        "huggingface_hub._snapshot_download",
    ],
)
pyz = PYZ(analysis.pure)
exe = EXE(
    pyz,
    analysis.scripts,
    [],
    exclude_binaries=True,
    name=APP_NAME,
    console=False,
    icon=str(icon) if icon.exists() else None,
    argv_emulation=False,
)
collection = COLLECT(exe, analysis.binaries, analysis.datas, name=APP_NAME)

if sys.platform == "darwin":
    app = BUNDLE(
        collection,
        name=f"{APP_NAME}.app",
        # Set the final release identity when configuring signing and notarization.
        bundle_identifier="com.example.whisper_gui",
        icon=str(icon) if icon.exists() else None,
    )
