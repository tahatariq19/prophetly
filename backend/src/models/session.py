"""Session data models for in-memory storage."""

import gc
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import uuid4

import pandas as pd
from pydantic import BaseModel, Field


class SessionData(BaseModel):
    """Session data container with automatic cleanup."""
    
    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(default_factory=lambda: datetime.now() + timedelta(hours=2))
    last_accessed: datetime = Field(default_factory=datetime.now)
    
    model_config = {"arbitrary_types_allowed": True}
    
    def __init__(self, **data):
        super().__init__(**data)
        # Initialize private data storage after model creation
        self._data: Dict[str, Any] = {}
        self._dataframes: Dict[str, pd.DataFrame] = {}
    
    def store_data(self, key: str, value: Any) -> None:
        """Store arbitrary data in session."""
        self.last_accessed = datetime.now()
        self._data[key] = value
    
    def store_dataframe(self, key: str, df: pd.DataFrame) -> None:
        """Store DataFrame in session with memory tracking."""
        self.last_accessed = datetime.now()
        self._dataframes[key] = df
    
    def get_data(self, key: str, default: Any = None) -> Any:
        """Retrieve data from session."""
        self.last_accessed = datetime.now()
        return self._data.get(key, default)
    
    def get_dataframe(self, key: str) -> Optional[pd.DataFrame]:
        """Retrieve DataFrame from session."""
        self.last_accessed = datetime.now()
        return self._dataframes.get(key)
    
    def remove_data(self, key: str) -> bool:
        """Remove specific data from session."""
        self.last_accessed = datetime.now()
        removed = False
        
        if key in self._data:
            del self._data[key]
            removed = True
        
        if key in self._dataframes:
            # Explicitly delete DataFrame to free memory
            df = self._dataframes[key]
            del df
            del self._dataframes[key]
            removed = True
        
        if removed:
            gc.collect()  # Force garbage collection
        
        return removed
    
    def is_expired(self) -> bool:
        """Check if session has expired."""
        return datetime.now() > self.expires_at
    
    def extend_session(self, hours: int = 2) -> None:
        """Extend session expiration time."""
        self.expires_at = datetime.now() + timedelta(hours=hours)
        self.last_accessed = datetime.now()
    
    def get_memory_usage(self) -> Dict[str, int]:
        """Get approximate memory usage of session data."""
        memory_info = {
            "data_items": len(self._data),
            "dataframes": len(self._dataframes),
            "estimated_bytes": 0
        }
        
        # Estimate DataFrame memory usage
        for df in self._dataframes.values():
            memory_info["estimated_bytes"] += df.memory_usage(deep=True).sum()
        
        return memory_info
    
    def cleanup(self) -> None:
        """Secure cleanup of all session data."""
        # Clear all data references
        for key in list(self._data.keys()):
            del self._data[key]
        
        # Clear all DataFrames with explicit deletion
        for key in list(self._dataframes.keys()):
            df = self._dataframes[key]
            del df
            del self._dataframes[key]
        
        # Clear the dictionaries
        self._data.clear()
        self._dataframes.clear()
        
        # Force garbage collection
        gc.collect()


class SessionStats(BaseModel):
    """Session statistics for monitoring."""
    
    total_sessions: int
    active_sessions: int
    expired_sessions: int
    total_memory_mb: float
    oldest_session_age_minutes: Optional[int] = None
    newest_session_age_minutes: Optional[int] = None