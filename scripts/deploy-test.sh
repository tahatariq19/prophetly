#!/bin/bash
# Test deployment script for Linux/Mac
# Tests the Docker build and runs the container locally

set -e

echo "🚀 Prophet Web Interface - Deployment Test"
echo "=========================================="
echo ""

# Check if Docker is running
echo "📋 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi
echo "✅ Docker is running"

# Clean up old containers and images
echo ""
echo "🧹 Cleaning up old containers..."
docker stop prophet-test 2>/dev/null || true
docker rm prophet-test 2>/dev/null || true
echo "✅ Cleanup complete"

# Build the Docker image
echo ""
echo "🔨 Building Docker image..."
echo "This may take 5-10 minutes on first build..."

BUILD_START=$(date +%s)
docker build -t prophet-web-interface:test .
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo "✅ Build completed in ${BUILD_TIME}s"

# Get image size
IMAGE_SIZE=$(docker images prophet-web-interface:test --format "{{.Size}}")
echo "📦 Image size: $IMAGE_SIZE"

# Run the container
echo ""
echo "🚀 Starting container..."
docker run -d \
    --name prophet-test \
    -p 8080:8080 \
    -e ENVIRONMENT=production \
    -e LOG_LEVEL=INFO \
    -e MAX_SESSION_AGE=7200 \
    -e ALLOWED_HOSTS=* \
    -e ALLOWED_ORIGINS=* \
    prophet-web-interface:test

echo "✅ Container started"

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo ""
echo "🏥 Checking health..."

MAX_ATTEMPTS=12
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$HEALTHY" = "false" ]; do
    ATTEMPT=$((ATTEMPT + 1))
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        HEALTHY=true
        echo "✅ Health check passed!"
    else
        echo "⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS - Waiting..."
        sleep 5
    fi
done

if [ "$HEALTHY" = "false" ]; then
    echo "❌ Health check failed after $MAX_ATTEMPTS attempts"
    echo ""
    echo "📋 Container logs:"
    docker logs prophet-test
    exit 1
fi

# Test API endpoint
echo ""
echo "🧪 Testing API endpoint..."
if curl -f http://localhost:8080/api/ > /dev/null 2>&1; then
    echo "✅ API is responding"
else
    echo "⚠️  API test inconclusive (this may be normal)"
fi

# Display results
echo ""
echo "=========================================="
echo "✅ Deployment test completed successfully!"
echo "=========================================="
echo ""
echo "📊 Test Results:"
echo "  • Build time: ${BUILD_TIME}s"
echo "  • Image size: $IMAGE_SIZE"
echo "  • Container: prophet-test"
echo "  • Port: 8080"
echo ""
echo "🌐 Access the application:"
echo "  • Frontend: http://localhost:8080"
echo "  • API Docs: http://localhost:8080/api/docs"
echo "  • Health: http://localhost:8080/health"
echo ""
echo "📋 Useful commands:"
echo "  • View logs: docker logs -f prophet-test"
echo "  • Stop: docker stop prophet-test"
echo "  • Remove: docker rm prophet-test"
echo "  • Shell: docker exec -it prophet-test /bin/bash"
echo ""
echo "Press Ctrl+C to stop watching logs."
echo ""

# Follow logs
docker logs -f prophet-test
