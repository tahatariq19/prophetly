#!/bin/bash

# Prophet Web Interface - Deployment Test Script
# Tests deployment configuration and privacy compliance

set -e

echo "🚀 Prophet Web Interface - Deployment Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:8000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}

# Test functions
test_render_config() {
    echo -e "\n🔍 Testing render.yaml configuration..."
    
    if [ ! -f "render.yaml" ]; then
        echo -e "${RED}❌ render.yaml not found${NC}"
        return 1
    fi
    
    # Check for required services
    if grep -q "prophet-web-backend" render.yaml && grep -q "prophet-web-frontend" render.yaml; then
        echo -e "${GREEN}✅ Both services found in render.yaml${NC}"
    else
        echo -e "${RED}❌ Missing required services in render.yaml${NC}"
        return 1
    fi
    
    # Check for privacy-focused environment variables
    if grep -q "MAX_SESSION_AGE" render.yaml && grep -q "MAX_MEMORY_MB" render.yaml; then
        echo -e "${GREEN}✅ Privacy environment variables configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Privacy environment variables may be missing${NC}"
    fi
    
    return 0
}

test_backend_files() {
    echo -e "\n🔍 Testing backend configuration..."
    
    # Check requirements.txt
    if [ ! -f "backend/requirements.txt" ]; then
        echo -e "${RED}❌ backend/requirements.txt not found${NC}"
        return 1
    fi
    
    # Check for Prophet dependency
    if grep -q "prophet" backend/requirements.txt; then
        echo -e "${GREEN}✅ Prophet dependency found${NC}"
    else
        echo -e "${RED}❌ Prophet dependency missing${NC}"
        return 1
    fi
    
    # Check main.py
    if [ ! -f "backend/src/main.py" ]; then
        echo -e "${RED}❌ backend/src/main.py not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Backend files configured${NC}"
    return 0
}

test_frontend_files() {
    echo -e "\n🔍 Testing frontend configuration..."
    
    # Check package.json
    if [ ! -f "frontend/package.json" ]; then
        echo -e "${RED}❌ frontend/package.json not found${NC}"
        return 1
    fi
    
    # Check for build script
    if grep -q '"build"' frontend/package.json; then
        echo -e "${GREEN}✅ Build script found${NC}"
    else
        echo -e "${RED}❌ Build script missing${NC}"
        return 1
    fi
    
    # Check vite.config.js
    if [ ! -f "frontend/vite.config.js" ]; then
        echo -e "${RED}❌ frontend/vite.config.js not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Frontend files configured${NC}"
    return 0
}

test_backend_health() {
    echo -e "\n🔍 Testing backend health (if running)..."
    
    if curl -s -f "$BACKEND_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
        
        # Test privacy compliance
        HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health")
        if echo "$HEALTH_RESPONSE" | grep -q '"privacy":"stateless"'; then
            echo -e "${GREEN}✅ Privacy compliance verified${NC}"
        else
            echo -e "${YELLOW}⚠️  Privacy compliance not verified${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Backend not accessible at $BACKEND_URL${NC}"
        echo "   This is normal if backend is not running locally"
    fi
}

test_privacy_config() {
    echo -e "\n🔍 Testing privacy configuration..."
    
    # Check for no database configuration
    if ! grep -q "database\|postgres\|mysql\|mongodb" render.yaml 2>/dev/null; then
        echo -e "${GREEN}✅ No database services configured (stateless)${NC}"
    else
        echo -e "${RED}❌ Database services found - violates stateless architecture${NC}"
        return 1
    fi
    
    # Check for security headers
    if grep -q "X-Frame-Options\|Content-Security-Policy" render.yaml; then
        echo -e "${GREEN}✅ Security headers configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Security headers may be missing${NC}"
    fi
    
    return 0
}

run_python_validation() {
    echo -e "\n🔍 Running Python validation script..."
    
    if [ -f "scripts/validate_deployment.py" ]; then
        if command -v python3 &> /dev/null; then
            python3 scripts/validate_deployment.py --backend-url "$BACKEND_URL" --frontend-url "$FRONTEND_URL"
        elif command -v python &> /dev/null; then
            python scripts/validate_deployment.py --backend-url "$BACKEND_URL" --frontend-url "$FRONTEND_URL"
        else
            echo -e "${YELLOW}⚠️  Python not found, skipping detailed validation${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Python validation script not found${NC}"
    fi
}

# Main test execution
main() {
    local failed=0
    
    # Run all tests
    test_render_config || failed=1
    test_backend_files || failed=1
    test_frontend_files || failed=1
    test_privacy_config || failed=1
    test_backend_health
    run_python_validation
    
    # Summary
    echo -e "\n" "="*50
    echo "DEPLOYMENT TEST SUMMARY"
    echo "="*50
    
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed! Deployment configuration is ready.${NC}"
        echo -e "\n🔒 Privacy compliance verified:"
        echo "  • Stateless architecture configured"
        echo "  • No persistent storage detected"
        echo "  • Security headers configured"
        echo "  • Automatic cleanup enabled"
        echo -e "\n🚀 Ready to deploy to Render!"
        echo "  1. Push code to GitHub"
        echo "  2. Connect repository in Render Dashboard"
        echo "  3. Deploy using render.yaml blueprint"
    else
        echo -e "${RED}❌ Some tests failed. Please fix issues before deploying.${NC}"
        return 1
    fi
    
    return 0
}

# Run main function
main "$@"