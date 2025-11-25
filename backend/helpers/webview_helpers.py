import os
import sys


def is_running_bundled() -> bool:
    """Return True if running inside a PyInstaller bundle, False otherwise."""
    return getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")


def get_frontend_entrypoint(backend_dir_path: str) -> str:
    """Return the frontend entrypoint depending on context."""

    live_server = os.getenv("LIVE_SERVER", "0") == "1"
    if live_server:
        return "http://localhost:3000"

    paths = (
        "../frontend_dist/index.html",  # Development build (not frozen): Compiled but not bundled.
        "../Resources/frontend_dist/index.html",  # macOS executable (frozen): Bundled via PyInstaller.
        "./frontend_dist/index.html",  # Windows executable (frozen): Bundled via PyInstaller (e.g., ..\AppData\Local\Temp\_MEIXXXXX\frontend_dist\index.html).
    )

    for rel_path in paths:
        frontend_entrypoint_path = os.path.join(backend_dir_path, rel_path)
        if os.path.exists(frontend_entrypoint_path):
            return rel_path

    raise Exception("No index.html found")
