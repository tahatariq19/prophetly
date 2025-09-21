import sys

import yaml


def validate_render_yaml():
    """
    Validates the render.yaml file for security and privacy compliance.
    Exits with 1 if any violations are found.
    """
    print("Validating render.yaml...")

    try:
        with open("render.yaml", "r") as f:
            render_config = yaml.safe_load(f)
    except FileNotFoundError:
        print("Error: render.yaml not found.")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"Error parsing render.yaml: {e}")
        sys.exit(1)

    # Security headers check
    required_headers = [
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Content-Security-Policy",
        "Referrer-Policy",
    ]

    headers = render_config.get("headers", [])
    found_headers = {header.get("key"): header.get("value") for header in headers}

    for header in required_headers:
        if header not in found_headers:
            print(f"Error: Missing security header '{header}' in render.yaml")
            sys.exit(1)

    print("✓ Security headers are configured")

    # Privacy compliance check
    if "volumes" in render_config or "mount" in render_config:
        print("Error: Persistent storage ('volumes' or 'mount') found in render.yaml")
        sys.exit(1)

    print("✓ No persistent storage configured")

    print("✅ Render configuration validation completed successfully")


if __name__ == "__main__":
    validate_render_yaml()
