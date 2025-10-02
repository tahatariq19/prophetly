# Multi-stage Dockerfile for full-stack Prophet Web Interface
# Optimized for Render deployment as a single service

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend with production optimizations
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Build Backend Base
FROM python:3.11-slim AS backend-base

WORKDIR /app

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 3: Final Production Image
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nginx \
    supervisor \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from backend-base
COPY --from=backend-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-base /usr/local/bin /usr/local/bin

# Copy backend source
COPY backend/src ./src

# Copy built frontend from frontend-build
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Create necessary directories
RUN mkdir -p /var/log/supervisor && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/run && \
    mkdir -p /var/cache/nginx && \
    mkdir -p /var/lib/nginx/body && \
    mkdir -p /var/lib/nginx/proxy && \
    mkdir -p /var/lib/nginx/fastcgi && \
    mkdir -p /var/lib/nginx/uwsgi && \
    mkdir -p /var/lib/nginx/scgi && \
    mkdir -p /etc/nginx/conf.d && \
    mkdir -p /tmp/matplotlib

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /var/log/supervisor && \
    chown -R appuser:appuser /var/run && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/lib/nginx && \
    chown -R appuser:appuser /tmp/matplotlib && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

# Create nginx configuration template
RUN cat > /etc/nginx/nginx.conf.template <<'EOF'
worker_processes auto;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Use writable directories for nginx temp files
    client_body_temp_path /var/lib/nginx/body;
    proxy_temp_path /var/lib/nginx/proxy;
    fastcgi_temp_path /var/lib/nginx/fastcgi;
    uwsgi_temp_path /var/lib/nginx/uwsgi;
    scgi_temp_path /var/lib/nginx/scgi;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    server {
        listen ${PORT} default_server;
        listen [::]:${PORT} default_server;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        location = /api/health {
            proxy_pass http://127.0.0.1:8000/api/health;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_connect_timeout 5s;
            proxy_read_timeout 5s;
        }
    }
}
EOF

# Create supervisor configuration
RUN cat > /etc/supervisor/conf.d/supervisord.conf <<'EOF'
[supervisord]
nodaemon=true
user=appuser
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=uvicorn src.main:app --host 127.0.0.1 --port 8000 --workers 2
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=MPLCONFIGDIR="/tmp/matplotlib"

[program:nginx]
command=nginx -c /tmp/nginx.conf -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    LOG_LEVEL=INFO \
    MPLCONFIGDIR=/tmp/matplotlib

# Switch to non-root user
USER appuser

# Create startup script
RUN cat > /app/start.sh <<'EOF'
#!/bin/bash
set -e

# Use PORT environment variable from Render, default to 10000
export PORT=${PORT:-10000}

echo "Starting services on port $PORT"

# Generate nginx config from template in a writable location
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /tmp/nginx.conf

echo "Nginx config generated, starting supervisor..."

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/start.sh && chown appuser:appuser /app/start.sh

# Expose port (Render will set PORT env variable)
EXPOSE 10000

# Health check - Render will use its own health checks
# We'll respond on /health endpoint via nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:10000/health || exit 1

# Start services via startup script
CMD ["/app/start.sh"]
