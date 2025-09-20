"""Error handling middleware with privacy protection."""

import uuid
import time
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from ..utils.error_handler import privacy_error_handler, ErrorType


logger = logging.getLogger(__name__)


class PrivacyErrorMiddleware(BaseHTTPMiddleware):
    """Middleware for privacy-aware error handling and request tracking."""
    
    def __init__(self, app, enable_request_logging: bool = True):
        super().__init__(app)
        self.enable_request_logging = enable_request_logging
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with privacy-focused error handling."""
        
        # Generate unique request ID for tracking (no user data)
        request_id = f"req_{int(time.time())}_{str(uuid.uuid4())[:8]}"
        request.state.request_id = request_id
        
        # Add privacy headers to request
        request.state.privacy_mode = "stateless"
        request.state.data_processing = "memory-only"
        
        start_time = time.time()
        
        try:
            # Log request start (no user data)
            if self.enable_request_logging:
                self._log_request_start(request, request_id)
            
            # Process request
            response = await call_next(request)
            
            # Add privacy headers to response
            response.headers["X-Privacy-Mode"] = "stateless"
            response.headers["X-Data-Processed"] = "memory-only"
            response.headers["X-Request-ID"] = request_id
            response.headers["X-No-Logging"] = "user-data-excluded"
            
            # Log successful request (no user data)
            if self.enable_request_logging:
                duration = time.time() - start_time
                self._log_request_success(request, request_id, response.status_code, duration)
            
            return response
            
        except Exception as exc:
            # Handle unexpected errors with privacy protection
            duration = time.time() - start_time
            
            # Log error safely (no user data)
            self._log_request_error(request, request_id, exc, duration)
            
            # Determine error type based on exception
            error_type = self._classify_exception(exc)
            
            # Create privacy-focused error response
            error_response = privacy_error_handler.create_error_response(
                error=exc,
                error_type=error_type,
                request_id=request_id
            )
            
            # Return JSON error response with privacy headers
            return JSONResponse(
                status_code=500,
                content=error_response.dict(),
                headers={
                    "X-Privacy-Mode": "stateless",
                    "X-Data-Processed": "memory-only",
                    "X-Request-ID": request_id,
                    "X-Error-Handled": "privacy-safe"
                }
            )
    
    def _log_request_start(self, request: Request, request_id: str) -> None:
        """Log request start without user data."""
        
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "user_agent": request.headers.get("user-agent", "unknown")[:100],
            "content_type": request.headers.get("content-type", "unknown"),
            "content_length": request.headers.get("content-length", "0"),
            "timestamp": time.time(),
            # Explicitly exclude any user data, query params, or body content
        }
        
        logger.info("Request start: %s", log_data)
    
    def _log_request_success(
        self, 
        request: Request, 
        request_id: str, 
        status_code: int, 
        duration: float
    ) -> None:
        """Log successful request completion without user data."""
        
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": round(duration * 1000, 2),
            "timestamp": time.time(),
            # No response data or user information logged
        }
        
        logger.info("Request success: %s", log_data)
    
    def _log_request_error(
        self, 
        request: Request, 
        request_id: str, 
        error: Exception, 
        duration: float
    ) -> None:
        """Log request error without exposing user data."""
        
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "error_type": error.__class__.__name__,
            "error_message": str(error)[:200],  # Truncate long messages
            "duration_ms": round(duration * 1000, 2),
            "timestamp": time.time(),
            # No user data, request body, or sensitive information
        }
        
        logger.error("Request error: %s", log_data)
    
    def _classify_exception(self, exc: Exception) -> ErrorType:
        """Classify exception to determine appropriate error type."""
        
        exc_name = exc.__class__.__name__.lower()
        exc_msg = str(exc).lower()
        
        # File processing errors
        if "file" in exc_msg or "upload" in exc_msg or "csv" in exc_msg:
            return ErrorType.FILE_PROCESSING
        
        # Prophet errors
        if "prophet" in exc_msg or "forecast" in exc_msg:
            return ErrorType.PROPHET
        
        # Validation errors
        if "validation" in exc_name or "pydantic" in exc_name:
            return ErrorType.VALIDATION
        
        # Memory errors
        if "memory" in exc_msg or "memoryerror" in exc_name:
            return ErrorType.MEMORY
        
        # Session errors
        if "session" in exc_msg or "expired" in exc_msg:
            return ErrorType.SESSION
        
        # Network/timeout errors
        if "timeout" in exc_msg or "connection" in exc_msg:
            return ErrorType.NETWORK
        
        # Default to internal error
        return ErrorType.INTERNAL


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for request validation with privacy protection."""
    
    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_request_size = max_request_size
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate request with privacy considerations."""
        
        # Check request size for privacy and performance
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_request_size:
            error_response = privacy_error_handler.handle_file_processing_error(
                error=Exception("Request too large"),
                file_info={"size_mb": int(content_length) / (1024 * 1024)},
                request_id=getattr(request.state, 'request_id', None)
            )
            
            return JSONResponse(
                status_code=413,
                content=error_response.dict(),
                headers={
                    "X-Privacy-Mode": "stateless",
                    "X-Data-Rejected": "size-limit-protection"
                }
            )
        
        # Validate content type for file uploads
        if request.method == "POST" and request.url.path.startswith("/api/upload"):
            content_type = request.headers.get("content-type", "")
            
            if not content_type.startswith("multipart/form-data"):
                error_response = privacy_error_handler.handle_validation_error(
                    error=Exception("Invalid content type for file upload"),
                    field_errors={"content_type": "Must be multipart/form-data for file uploads"},
                    request_id=getattr(request.state, 'request_id', None)
                )
                
                return JSONResponse(
                    status_code=400,
                    content=error_response.dict(),
                    headers={
                        "X-Privacy-Mode": "stateless",
                        "X-Data-Rejected": "content-type-validation"
                    }
                )
        
        # Add security headers
        response = await call_next(request)
        
        # Privacy and security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Privacy-Policy"] = "memory-only-processing"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware with privacy protection."""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}  # IP -> (count, window_start)
        self.window_size = 60  # 1 minute window
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Apply rate limiting with privacy considerations."""
        
        # Get client IP (use forwarded header if available)
        client_ip = request.headers.get("x-forwarded-for", request.client.host)
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        current_time = time.time()
        
        # Clean old entries
        self._cleanup_old_entries(current_time)
        
        # Check rate limit
        if client_ip in self.request_counts:
            count, window_start = self.request_counts[client_ip]
            
            if current_time - window_start < self.window_size:
                if count >= self.requests_per_minute:
                    # Rate limit exceeded
                    retry_after = int(self.window_size - (current_time - window_start)) + 1
                    
                    error_response = privacy_error_handler.handle_rate_limit_error(
                        error=Exception("Rate limit exceeded"),
                        retry_after=retry_after,
                        request_id=getattr(request.state, 'request_id', None)
                    )
                    
                    return JSONResponse(
                        status_code=429,
                        content=error_response.dict(),
                        headers={
                            "X-Privacy-Mode": "stateless",
                            "X-Rate-Limited": "privacy-protection",
                            "Retry-After": str(retry_after)
                        }
                    )
                else:
                    # Increment count
                    self.request_counts[client_ip] = (count + 1, window_start)
            else:
                # New window
                self.request_counts[client_ip] = (1, current_time)
        else:
            # First request from this IP
            self.request_counts[client_ip] = (1, current_time)
        
        return await call_next(request)
    
    def _cleanup_old_entries(self, current_time: float) -> None:
        """Remove old rate limit entries to prevent memory buildup."""
        
        expired_ips = [
            ip for ip, (_, window_start) in self.request_counts.items()
            if current_time - window_start > self.window_size * 2
        ]
        
        for ip in expired_ips:
            del self.request_counts[ip]


class MemoryMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor memory usage and prevent overload."""
    
    def __init__(self, app, max_memory_mb: int = 512):
        super().__init__(app)
        self.max_memory_mb = max_memory_mb
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor memory usage during request processing."""
        
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            
            if memory_mb > self.max_memory_mb:
                # Memory limit exceeded
                error_response = privacy_error_handler.create_error_response(
                    error=Exception("Memory limit exceeded"),
                    error_type=ErrorType.MEMORY,
                    user_message="Server memory limit reached. Please try with a smaller dataset.",
                    privacy_message="Memory protection prevented processing. No data was stored.",
                    request_id=getattr(request.state, 'request_id', None)
                )
                
                return JSONResponse(
                    status_code=503,
                    content=error_response.dict(),
                    headers={
                        "X-Privacy-Mode": "stateless",
                        "X-Memory-Protected": "limit-exceeded",
                        "Retry-After": "60"
                    }
                )
        
        except ImportError:
            # psutil not available, skip memory monitoring
            pass
        except Exception:
            # Memory monitoring failed, continue with request
            pass
        
        return await call_next(request)