import logging
import os
from logging.handlers import RotatingFileHandler

from platformdirs import user_log_dir


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

    # Log Absolute Path
    log_file_path = os.path.join(user_log_dir(app_name), filename)

    # Rotating file handler
    file_handler = RotatingFileHandler(log_file_path, maxBytes=max_bytes, backupCount=1, encoding="utf-8")
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
