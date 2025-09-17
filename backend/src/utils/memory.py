"""Memory management and monitoring utilities."""

from functools import wraps
import gc
import logging
from typing import Any, Dict, Optional

import psutil

logger = logging.getLogger(__name__)


def get_memory_usage() -> Dict[str, float]:
    """Get current memory usage statistics."""
    process = psutil.Process()
    memory_info = process.memory_info()

    return {
        "rss_mb": memory_info.rss / 1024 / 1024,  # Resident Set Size
        "vms_mb": memory_info.vms / 1024 / 1024,  # Virtual Memory Size
        "percent": process.memory_percent(),
        "available_mb": psutil.virtual_memory().available / 1024 / 1024,
        "total_mb": psutil.virtual_memory().total / 1024 / 1024
    }


def force_garbage_collection() -> Dict[str, int]:
    """Force garbage collection and return collection stats."""
    # Get initial object counts
    initial_objects = len(gc.get_objects())

    # Force collection of all generations
    collected = {
        "gen0": gc.collect(0),
        "gen1": gc.collect(1),
        "gen2": gc.collect(2)
    }

    # Get final object counts
    final_objects = len(gc.get_objects())
    collected["objects_freed"] = initial_objects - final_objects
    collected["total_collected"] = sum(collected[f"gen{i}"] for i in range(3))

    logger.debug(f"Garbage collection: {collected}")
    return collected


def secure_delete_variable(var_name: str, local_vars: Dict[str, Any]) -> bool:
    """Securely delete a variable and force garbage collection."""
    if var_name not in local_vars:
        return False

    # Delete the variable
    del local_vars[var_name]

    # Force garbage collection
    force_garbage_collection()

    return True


def memory_limit_check(max_memory_mb: float) -> bool:
    """Check if current memory usage is within limits."""
    memory_usage = get_memory_usage()
    return memory_usage["rss_mb"] <= max_memory_mb


def memory_monitor(max_memory_mb: Optional[float] = None):
    """Decorator to monitor memory usage of functions."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Get initial memory
            initial_memory = get_memory_usage()

            try:
                result = await func(*args, **kwargs)

                # Get final memory
                final_memory = get_memory_usage()
                memory_delta = final_memory["rss_mb"] - initial_memory["rss_mb"]

                logger.debug(
                    f"{func.__name__} memory usage: "
                    f"{memory_delta:+.2f}MB delta, "
                    f"{final_memory['rss_mb']:.2f}MB total"
                )

                # Check memory limits if specified
                if max_memory_mb and final_memory["rss_mb"] > max_memory_mb:
                    logger.warning(
                        f"{func.__name__} exceeded memory limit: "
                        f"{final_memory['rss_mb']:.2f}MB > {max_memory_mb}MB"
                    )
                    # Force garbage collection
                    force_garbage_collection()

                return result

            except Exception as e:
                # Clean up on error
                force_garbage_collection()
                raise e

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Get initial memory
            initial_memory = get_memory_usage()

            try:
                result = func(*args, **kwargs)

                # Get final memory
                final_memory = get_memory_usage()
                memory_delta = final_memory["rss_mb"] - initial_memory["rss_mb"]

                logger.debug(
                    f"{func.__name__} memory usage: "
                    f"{memory_delta:+.2f}MB delta, "
                    f"{final_memory['rss_mb']:.2f}MB total"
                )

                # Check memory limits if specified
                if max_memory_mb and final_memory["rss_mb"] > max_memory_mb:
                    logger.warning(
                        f"{func.__name__} exceeded memory limit: "
                        f"{final_memory['rss_mb']:.2f}MB > {max_memory_mb}MB"
                    )
                    # Force garbage collection
                    force_garbage_collection()

                return result

            except Exception as e:
                # Clean up on error
                force_garbage_collection()
                raise e

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


class MemoryTracker:
    """Context manager for tracking memory usage."""

    def __init__(self, operation_name: str, max_memory_mb: Optional[float] = None):
        self.operation_name = operation_name
        self.max_memory_mb = max_memory_mb
        self.initial_memory = None
        self.final_memory = None

    def __enter__(self):
        self.initial_memory = get_memory_usage()
        logger.debug(f"Starting {self.operation_name}: {self.initial_memory['rss_mb']:.2f}MB")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.final_memory = get_memory_usage()
        memory_delta = self.final_memory["rss_mb"] - self.initial_memory["rss_mb"]

        if exc_type is None:
            logger.debug(
                f"Completed {self.operation_name}: "
                f"{memory_delta:+.2f}MB delta, "
                f"{self.final_memory['rss_mb']:.2f}MB total"
            )
        else:
            logger.error(
                f"Failed {self.operation_name}: "
                f"{memory_delta:+.2f}MB delta, "
                f"{self.final_memory['rss_mb']:.2f}MB total"
            )

        # Check memory limits
        if self.max_memory_mb and self.final_memory["rss_mb"] > self.max_memory_mb:
            logger.warning(
                f"{self.operation_name} exceeded memory limit: "
                f"{self.final_memory['rss_mb']:.2f}MB > {self.max_memory_mb}MB"
            )

        # Force cleanup on error or high memory usage
        if exc_type is not None or (self.max_memory_mb and self.final_memory["rss_mb"] > self.max_memory_mb):
            force_garbage_collection()

    def get_memory_delta(self) -> Optional[float]:
        """Get memory usage delta if tracking is complete."""
        if self.initial_memory and self.final_memory:
            return self.final_memory["rss_mb"] - self.initial_memory["rss_mb"]
        return None


def cleanup_dataframe_memory(df_dict: Dict[str, Any]) -> None:
    """Securely clean up DataFrame memory."""
    for key in list(df_dict.keys()):
        if hasattr(df_dict[key], 'memory_usage'):
            # It's likely a DataFrame
            del df_dict[key]

    df_dict.clear()
    force_garbage_collection()


# Import asyncio at the end to avoid circular imports
import asyncio
