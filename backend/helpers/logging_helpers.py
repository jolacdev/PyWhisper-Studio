import logging
import os
import sys
from logging.handlers import RotatingFileHandler


def setup_logging(
    app_name: str,
    filename: str = "app.log",
    enable_logging: bool = True,
    log_level: int = logging.DEBUG,
    max_bytes: int = 5 * 1024 * 1024,  # 5 MB
) -> None:
    """Sets up logging configuration for the application. Outputs to both console and rotating file."""

    # Update root logger
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # Handler cleanup
    if logger.hasHandlers():
        logger.handlers.clear()

    # Avoid logging if disabled
    if not enable_logging:
        logger.addHandler(logging.NullHandler())
        return

    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Rotating file handler
    file_handler = RotatingFileHandler(
        get_log_dir(app_name), filename, maxBytes=max_bytes, backupCount=1, encoding="utf-8"
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


def get_log_dir(app_name: str) -> str:
    if sys.platform.startswith("darwin"):
        # /Users/username/Library/Logs/AppName
        return os.path.join(os.path.expanduser("~"), "Library", "Logs", app_name)

    if sys.platform.startswith("win32"):
        # C:\Users\username\AppData\Local\AppName\Logs
        return os.path.join(os.environ.get("LOCALAPPDATA", ""), app_name, "Logs")

    raise RuntimeError("Unsupported platform: only macOS and Windows are supported")
