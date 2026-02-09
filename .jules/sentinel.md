## 2024-05-23 - Internal Error Leakage in Prophet Service
**Vulnerability:** The `forecast` endpoint was catching generic Exceptions and returning their string representation (`str(e)`) directly to the client in a 500 response. This could leak sensitive internal details (file paths, library versions, potentially connection strings).
**Learning:** Developers often prioritize debugging ease over security by returning detailed error messages. In Python/FastAPI, relying on `str(e)` for user-facing errors is a common anti-pattern.
**Prevention:**
1. Implement input validation at the API boundary (e.g., validate `country_holidays` against allowed list).
2. Catch expected exceptions and map them to appropriate HTTP status codes (400 for bad input).
3. Catch unexpected exceptions, log them with full stack traces securely, and return a generic "Internal Server Error" message to the client.
