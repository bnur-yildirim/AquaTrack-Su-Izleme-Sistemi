#!/usr/bin/env python3
"""
Simple script to run training from MongoDB data
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(os.path.dirname(__file__))

def main():
    """Run MongoDB-based training"""
    print("🚀 Starting MongoDB-based model training...")
    print("=" * 50)
    
    try:
        # Import and run the trainer
        from train_from_mongodb import main as train_main
        train_main()
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you have all required dependencies installed:")
        print("  pip install catboost pandas numpy scikit-learn")
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
