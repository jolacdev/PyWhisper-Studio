import logging
from logging.handlers import RotatingFileHandler


def setup_logging(
    enable_logging: bool = True,
    filename: str = "app.log",
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
    file_handler = RotatingFileHandler(filename, maxBytes=max_bytes, backupCount=1, encoding="utf-8")
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
