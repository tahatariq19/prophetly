import os
import sys


def check_privacy_compliance():
    """
    Checks for privacy compliance in the codebase.
    Exits with 1 if any violations are found.
    """
    print("Checking privacy compliance...")

    # Check for database connection strings or direct SQL usage
    backend_src_path = "backend/src/"
    disallowed_patterns = [
        "dbname=",
        "user=",
        "password=",
        "host=",
        "psycopg2",
        "boto3",
        "google-cloud-storage",
        "azure-storage",
    ]

    for root, _, files in os.walk(backend_src_path):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        for pattern in disallowed_patterns:
                            if pattern in line:
                                print(
                                    f"Error: Disallowed pattern '{pattern}' found in {file_path} on line {line_num}"
                                )
                                sys.exit(1)

    print("✓ Privacy compliance verified")


if __name__ == "__main__":
    check_privacy_compliance()
