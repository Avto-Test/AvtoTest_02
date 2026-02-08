"""
AUTOTEST Logging Configuration
Structured logging setup
"""

import logging
import sys
from typing import Any

from core.config import settings


class EndpointFilter(logging.Filter):
    """Filter out health check endpoints from logs."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        return record.getMessage().find("/health") == -1


def setup_logging() -> None:
    """Configure structured logging."""
    # Root logger
    logger = logging.getLogger()
    logger.setLevel(settings.LOG_LEVEL)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(settings.LOG_LEVEL)
    
    # Formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    
    # Remove existing handlers
    logger.handlers = []
    logger.addHandler(handler)
    
    # Silence noisy libraries
    logging.getLogger("uvicorn.access").addFilter(EndpointFilter())
    logging.getLogger("passlib").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name."""
    return logging.getLogger(name)
