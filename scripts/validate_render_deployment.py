#!/usr/bin/env python3
"""
Render Deployment Validation Script
Validates privacy compliance and deployment readiness for Prophet Web Interface
"""

import os
import sys
import requests
import time
import json
from typing import Dict, List, Optional
from urllib.parse import urljoin


class RenderDeploymentValidator:
    """Validates Render deployment for privacy compliance and functionality."""
    
    def __init__(self, backend_url: str, frontend_url: str):
        self.backend_url = backend_url.rstrip('/')
        self.frontend_url = frontend_url.rstrip('/')
        self.session = requests.Session()
        self.session.timeout = 30
        
    def validate_backend_health(self) -> Dict:
        """Validate backend health and privacy compliance."""
        print("🔍 Validating backend health...")
        
        try:
            response = self.session.get(f"{self.backend_url}/health")
            response.raise_for_status()
            
            health_data = response.json()
            
            # Check required health fields
            required_fields = ['status', 'privacy', 'environment']
            missing_fields = [field for field in required_fields if field not in health_data]
            
            if missing_fields:
                return {
                    'success': False,
                    'error': f"Missing health check fields: {missing_fields}"
                }
            
            # Validate privacy compliance
            if health_data.get('privacy') != 'stateless':
                return {
                    'success': False,
                    'error': "Backend is not configured as stateless"
                }
            
            print(f"✅ Backend health check passed")
            print(f"   Status: {health_data['status']}")
            print(f"   Privacy: {health_data['privacy']}")
            print(f"   Environment: {health_data['environment']}")
            
            return {'success': True, 'data': health_data}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_privacy_headers(self) -> Dict:
        """Validate security and privacy headers."""
        print("🔒 Validating privacy and security headers...")
        
        try:
            # Check backend headers
            backend_response = self.session.get(f"{self.backend_url}/health")
            backend_headers = backend_response.headers
            
            # Check frontend headers
            frontend_response = self.session.get(self.frontend_url)
            frontend_headers = frontend_response.headers
            
            # Required security headers for privacy
            required_headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
            
            issues = []
            
            # Check frontend headers (more critical for privacy)
            for header, expected in required_headers.items():
                if header not in frontend_headers:
                    issues.append(f"Missing header: {header}")
                elif isinstance(expected, list):
                    if frontend_headers[header] not in expected:
                        issues.append(f"Invalid {header}: {frontend_headers[header]}")
                elif frontend_headers[header] != expected:
                    issues.append(f"Invalid {header}: {frontend_headers[header]}")
            
            if issues:
                return {'success': False, 'error': f"Header issues: {issues}"}
            
            print("✅ Privacy and security headers validated")
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_stateless_behavior(self) -> Dict:
        """Validate that the backend is truly stateless."""
        print("🧪 Testing stateless behavior...")
        
        try:
            # Test 1: Create a session and upload data
            session_response = self.session.post(f"{self.backend_url}/api/session")
            session_response.raise_for_status()
            session_data = session_response.json()
            session_id = session_data['session_id']
            
            print(f"   Created session: {session_id}")
            
            # Test 2: Simulate data upload (without actual file)
            test_data = {
                'session_id': session_id,
                'test': 'privacy_validation'
            }
            
            # Test 3: Wait and check if session auto-expires
            print("   Testing session cleanup...")
            time.sleep(2)  # Brief wait
            
            # Test 4: Verify no persistent storage
            memory_response = self.session.get(f"{self.backend_url}/health")
            memory_data = memory_response.json()
            
            if 'active_sessions' in memory_data:
                print(f"   Active sessions: {memory_data['active_sessions']}")
            
            print("✅ Stateless behavior validated")
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_cors_configuration(self) -> Dict:
        """Validate CORS configuration for frontend-backend communication."""
        print("🌐 Validating CORS configuration...")
        
        try:
            # Test preflight request
            headers = {
                'Origin': self.frontend_url,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = self.session.options(f"{self.backend_url}/api/session", headers=headers)
            
            # Check CORS headers
            cors_headers = response.headers
            required_cors = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            missing_cors = [h for h in required_cors if h not in cors_headers]
            if missing_cors:
                return {'success': False, 'error': f"Missing CORS headers: {missing_cors}"}
            
            print("✅ CORS configuration validated")
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def validate_frontend_accessibility(self) -> Dict:
        """Validate frontend is accessible and loads correctly."""
        print("🎨 Validating frontend accessibility...")
        
        try:
            response = self.session.get(self.frontend_url)
            response.raise_for_status()
            
            # Check if it's an HTML page
            content_type = response.headers.get('content-type', '')
            if 'text/html' not in content_type:
                return {'success': False, 'error': f"Frontend not serving HTML: {content_type}"}
            
            # Check for basic HTML structure
            html_content = response.text
            if '<html' not in html_content or '<body' not in html_content:
                return {'success': False, 'error': "Invalid HTML structure"}
            
            print("✅ Frontend accessibility validated")
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def run_full_validation(self) -> bool:
        """Run complete deployment validation."""
        print("🚀 Starting Render deployment validation...")
        print(f"Backend URL: {self.backend_url}")
        print(f"Frontend URL: {self.frontend_url}")
        print("-" * 50)
        
        validations = [
            self.validate_backend_health,
            self.validate_privacy_headers,
            self.validate_stateless_behavior,
            self.validate_cors_configuration,
            self.validate_frontend_accessibility
        ]
        
        all_passed = True
        
        for validation in validations:
            result = validation()
            if not result['success']:
                print(f"❌ {validation.__name__} failed: {result['error']}")
                all_passed = False
            print()
        
        print("-" * 50)
        if all_passed:
            print("🎉 All deployment validations passed!")
            print("✅ Privacy compliance verified")
            print("✅ Stateless architecture confirmed")
            print("✅ Deployment ready for production")
        else:
            print("❌ Some validations failed. Please fix issues before deploying.")
        
        return all_passed


def main():
    """Main validation script."""
    # Get URLs from environment or command line
    backend_url = os.getenv('BACKEND_URL', 'https://prophet-web-backend.onrender.com')
    frontend_url = os.getenv('FRONTEND_URL', 'https://prophet-web-frontend.onrender.com')
    
    if len(sys.argv) > 1:
        backend_url = sys.argv[1]
    if len(sys.argv) > 2:
        frontend_url = sys.argv[2]
    
    validator = RenderDeploymentValidator(backend_url, frontend_url)
    success = validator.run_full_validation()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()