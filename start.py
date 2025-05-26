#!/usr/bin/env python3
"""
Simple startup script for the EdgeTTS Speech application.
This can be used as an alternative to gunicorn config files.
"""

import os
import sys
from app import app

if __name__ == "__main__":
    # Get port from environment (Render sets this automatically)
    port = int(os.environ.get("PORT", 5000))
    
    # Determine if we're in production
    is_production = os.environ.get("FLASK_ENV") == "production"
    
    if is_production:
        # In production, this script shouldn't be used directly
        # Instead, use gunicorn with inline configuration
        print("Production mode detected. Use gunicorn instead:")
        print(f"gunicorn app:app --bind 0.0.0.0:{port} --workers 2 --timeout 120")
        sys.exit(1)
    else:
        # Development mode
        print(f"Starting development server on port {port}")
        app.run(host="0.0.0.0", port=port, debug=True) 