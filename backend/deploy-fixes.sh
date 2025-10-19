#!/bin/bash

# Deployment script for AquaTrack Backend fixes
echo "🚀 Deploying AquaTrack Backend fixes..."

# Check if we're in the backend directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "💡 Navigate to the backend folder first: cd backend"
    exit 1
fi

echo "✅ Running from backend directory"

# Check if .env file exists, if not create it
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Backend Environment Configuration
# Production environment settings

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=production
FLASK_DEBUG=False

# Server Configuration
HOST=0.0.0.0
PORT=5000

# CORS Configuration
CORS_ORIGINS=https://aquatrack.tr,https://aquatrack-tr.onrender.com

# Security
SECRET_KEY=jfjxn.csFLS,ddj,.:gdGdju42^4/7%(4tersj)ıwwj,d83e,DsjsFsFfGDffsFSDs.,

# Logging
LOG_LEVEL=INFO

# File Upload Configuration
MAX_CONTENT_LENGTH=16777216
UPLOAD_FOLDER=uploads

# Model Paths
MODEL_PATH=models/
DATA_PATH=data/

# Performance
WORKERS=2
TIMEOUT=120

# Python Path
PYTHONPATH=/app
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Check if all required files exist
echo "🔍 Checking required files..."
required_files=(
    "models/all_predictions_final.parquet"
    "models/catboost_H1_improved.pkl"
    "models/catboost_H2_improved.pkl"
    "models/catboost_H3_improved.pkl"
    "app.py"
    "requirements.txt"
    "Dockerfile"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🎉 Deployment preparation complete!"
echo "📋 Next steps for backend-only deployment:"
echo "1. Make sure you're in the backend directory"
echo "2. Commit your changes: git add . && git commit -m 'Fix 500 errors: Add pymongo and water quality data'"
echo "3. Push to your repository: git push"
echo "4. Redeploy on Render.com (make sure your render.yaml points to the backend directory)"
echo "5. Check the logs for any remaining issues"
echo ""
echo "🔧 CRITICAL FIXES APPLIED:"
echo "- Added pymongo>=4.0.0 to requirements.txt (fixes pymongo import error)"
echo "- Copied water_quality data files to backend directory"
echo "- Water quality model files are in backend/models_external/"
echo "- Fixed path issues in water quality routes to use models_external"
echo "- Fixed water quality data file references to use correct filenames"
echo "- Updated Dockerfile to include all required files"
echo ""
echo "🔧 If deploying to Render.com:"
echo "- Make sure your render.yaml has dockerfilePath: Dockerfile"
echo "- Make sure your build context is set to the backend directory"
