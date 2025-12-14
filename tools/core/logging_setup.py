"""
Zentrales Logging für alle Tools-Module.
"""
import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Liefert einen konfigurierten Logger für ein Modul.

    Format: [LEVEL] module_name: message
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            "[%(levelname)s] %(name)s: %(message)s"
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

    return logger


# Globaler Logger für dieses Modul
logger = get_logger("tools")
