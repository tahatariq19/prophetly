#!/usr/bin/env python3
"""
Local Deployment Configuration Test
Tests the deployment configuration before pushing to Render
"""

import os
import sys
import yaml
import json
from pathlib import Path


def test_render_yaml():
    """Test render.yaml configuration."""
    print("🔍 Testing render.yaml configuration...")
    
    render_file = Path("render.yaml")
    if not render_file.exists():
        print("❌ render.yaml not found")
        return False
    
    try:
        with open(render_file) as f:
            config = yaml.safe_load(f)
        
        # Check required structure
        if 'services' not in config:
            print("❌ No services defined in render.yaml")
            return False
        
        services = config['services']
        if len(services) != 2:
            print(f"❌ Expected 2 services, found {len(services)}")
            return False
        
        # Check backend service
        backend = next((s for s in services if s['name'] == 'prophet-web-backend'), None)
        if not backend:
            print("❌ Backend service not found")
            return False
        
        if backend['type'] != 'web':
            print("❌ Backend service type should be 'web'")
            return False
        
        # Check frontend service
        frontend = next((s for s in services if s['name'] == 'prophet-web-frontend'), None)
        if not frontend:
            print("❌ Frontend service not found")
            return False
        
        if frontend['type'] != 'static':
            print("❌ Frontend service type should be 'static'")
            return False
        
        print("✅ render.yaml configuration is valid")
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ Invalid YAML syntax: {e}")
        return False
    except Exception as e:
        print(f"❌ Error reading render.yaml: {e}")
        return False


def test_backend_requirements():
    """Test backend requirements.txt."""
    print("🔍 Testing backend requirements...")
    
    req_file = Path("backend/requirements.txt")
    if not req_file.exists():
        print("❌ backend/requirements.txt not found")
        return False
    
    try:
        with open(req_file) as f:
            requirements = f.read()
        
        # Check for essential packages
        essential_packages = [
            'prophet',
            'fastapi',
            'uvicorn',
            'pandas',
            'numpy',
            'pydantic'
        ]
        
        missing_packages = []
        for package in essential_packages:
            if package not in requirements.lower():
                missing_packages.append(package)
        
        if missing_packages:
            print(f"❌ Missing essential packages: {missing_packages}")
            return False
        
        print("✅ Backend requirements are complete")
        return True
        
    except Exception as e:
        print(f"❌ Error reading requirements.txt: {e}")
        return False


def test_frontend_package_json():
    """Test frontend package.json."""
    print("🔍 Testing frontend package.json...")
    
    package_file = Path("frontend/package.json")
    if not package_file.exists():
        print("❌ frontend/package.json not found")
        return False
    
    try:
        with open(package_file) as f:
            package_data = json.load(f)
        
        # Check for essential scripts
        scripts = package_data.get('scripts', {})
        essential_scripts = ['build', 'dev']
        
        missing_scripts = []
        for script in essential_scripts:
            if script not in scripts:
                missing_scripts.append(script)
        
        if missing_scripts:
            print(f"❌ Missing essential scripts: {missing_scripts}")
            return False
        
        # Check for essential dependencies
        dependencies = package_data.get('dependencies', {})
        essential_deps = ['vue', 'axios']
        
        missing_deps = []
        for dep in essential_deps:
            if dep not in dependencies:
                missing_deps.append(dep)
        
        if missing_deps:
            print(f"❌ Missing essential dependencies: {missing_deps}")
            return False
        
        print("✅ Frontend package.json is complete")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in package.json: {e}")
        return False
    except Exception as e:
        print(f"❌ Error reading package.json: {e}")
        return False


def test_environment_variables():
    """Test environment variable configuration."""
    print("🔍 Testing environment variable configuration...")
    
    # Check .env.example exists
    env_example = Path(".env.example")
    if not env_example.exists():
        print("❌ .env.example not found")
        return False
    
    try:
        with open(env_example) as f:
            env_content = f.read()
        
        # Check for essential environment variables
        essential_vars = [
            'ENVIRONMENT',
            'SECRET_KEY',
            'MAX_SESSION_AGE',
            'MAX_MEMORY_MB',
            'ALLOWED_ORIGINS',
            'VITE_API_URL'
        ]
        
        missing_vars = []
        for var in essential_vars:
            if var not in env_content:
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing environment variables in .env.example: {missing_vars}")
            return False
        
        print("✅ Environment variable configuration is complete")
        return True
        
    except Exception as e:
        print(f"❌ Error reading .env.example: {e}")
        return False


def test_privacy_compliance():
    """Test privacy compliance configuration."""
    print("🔍 Testing privacy compliance configuration...")
    
    # Check backend config.py
    config_file = Path("backend/src/config.py")
    if not config_file.exists():
        print("❌ backend/src/config.py not found")
        return False
    
    try:
        with open(config_file) as f:
            config_content = f.read()
        
        # Check for privacy-related settings
        privacy_settings = [
            'MAX_SESSION_AGE',
            'MAX_MEMORY_MB',
            'AUTO_CLEANUP_INTERVAL'
        ]
        
        missing_settings = []
        for setting in privacy_settings:
            if setting not in config_content:
                missing_settings.append(setting)
        
        if missing_settings:
            print(f"❌ Missing privacy settings: {missing_settings}")
            return False
        
        print("✅ Privacy compliance configuration is complete")
        return True
        
    except Exception as e:
        print(f"❌ Error reading config.py: {e}")
        return False


def test_file_structure():
    """Test required file structure."""
    print("🔍 Testing file structure...")
    
    required_files = [
        "render.yaml",
        "backend/requirements.txt",
        "backend/src/main.py",
        "backend/src/config.py",
        "frontend/package.json",
        "frontend/vite.config.js",
        ".env.example"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing required files: {missing_files}")
        return False
    
    print("✅ File structure is complete")
    return True


def main():
    """Run all deployment configuration tests."""
    print("🚀 Testing deployment configuration...")
    print("-" * 50)
    
    tests = [
        test_file_structure,
        test_render_yaml,
        test_backend_requirements,
        test_frontend_package_json,
        test_environment_variables,
        test_privacy_compliance
    ]
    
    all_passed = True
    
    for test in tests:
        if not test():
            all_passed = False
        print()
    
    print("-" * 50)
    if all_passed:
        print("🎉 All deployment configuration tests passed!")
        print("✅ Ready for Render deployment")
        print("✅ Privacy compliance verified")
        print("✅ Configuration is complete")
        print("\nNext steps:")
        print("1. Commit and push to main branch")
        print("2. Connect repository to Render")
        print("3. Deploy using render.yaml blueprint")
        print("4. Run validation script after deployment")
    else:
        print("❌ Some configuration tests failed.")
        print("Please fix the issues before deploying to Render.")
    
    return all_passed


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)