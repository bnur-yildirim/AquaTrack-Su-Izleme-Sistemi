@echo off
REM Deployment script for AquaTrack Backend fixes (Windows version)
echo 🚀 Deploying AquaTrack Backend fixes...

REM Check if we're in the backend directory
if not exist "app.py" (
    echo ❌ Error: Please run this script from the backend directory
    echo 💡 Navigate to the backend folder first: cd backend
    pause
    exit /b 1
)

echo ✅ Running from backend directory

REM Check if .env file exists, if not create it
if not exist ".env" (
    echo 📝 Creating .env file...
    (
        echo # Backend Environment Configuration
        echo # Production environment settings
        echo.
        echo # Flask Configuration
        echo FLASK_APP=app.py
        echo FLASK_ENV=production
        echo FLASK_DEBUG=False
        echo.
        echo # Server Configuration
        echo HOST=0.0.0.0
        echo PORT=5000
        echo.
        echo # CORS Configuration
        echo CORS_ORIGINS=https://aquatrack.tr,https://aquatrack-tr.onrender.com
        echo.
        echo # Security
        echo SECRET_KEY=jfjxn.csFLS,ddj,.:gdGdju42^4/7%%(4tersj)ıwwj,d83e,DsjsFsFfGDffsFSDs.,
        echo.
        echo # Logging
        echo LOG_LEVEL=INFO
        echo.
        echo # File Upload Configuration
        echo MAX_CONTENT_LENGTH=16777216
        echo UPLOAD_FOLDER=uploads
        echo.
        echo # Model Paths
        echo MODEL_PATH=models/
        echo DATA_PATH=data/
        echo.
        echo # Performance
        echo WORKERS=2
        echo TIMEOUT=120
        echo.
        echo # Python Path
        echo PYTHONPATH=/app
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

REM Check if all required files exist
echo 🔍 Checking required files...
set "missing_files="

if not exist "models\all_predictions_final.parquet" (
    echo ❌ models\all_predictions_final.parquet missing
    set "missing_files=1"
) else (
    echo ✅ models\all_predictions_final.parquet exists
)

if not exist "models\catboost_H1_improved.pkl" (
    echo ❌ models\catboost_H1_improved.pkl missing
    set "missing_files=1"
) else (
    echo ✅ models\catboost_H1_improved.pkl exists
)

if not exist "models\catboost_H2_improved.pkl" (
    echo ❌ models\catboost_H2_improved.pkl missing
    set "missing_files=1"
) else (
    echo ✅ models\catboost_H2_improved.pkl exists
)

if not exist "models\catboost_H3_improved.pkl" (
    echo ❌ models\catboost_H3_improved.pkl missing
    set "missing_files=1"
) else (
    echo ✅ models\catboost_H3_improved.pkl exists
)

if not exist "app.py" (
    echo ❌ app.py missing
    set "missing_files=1"
) else (
    echo ✅ app.py exists
)

if not exist "requirements.txt" (
    echo ❌ requirements.txt missing
    set "missing_files=1"
) else (
    echo ✅ requirements.txt exists
)

if not exist "Dockerfile" (
    echo ❌ Dockerfile missing
    set "missing_files=1"
) else (
    echo ✅ Dockerfile exists
)

echo.
echo 🎉 Deployment preparation complete!
echo 📋 Next steps for backend-only deployment:
echo 1. Make sure you're in the backend directory
echo 2. Commit your changes: git add . ^&^& git commit -m "Fix 500 errors: Add pymongo and water quality data"
echo 3. Push to your repository: git push
echo 4. Redeploy on Render.com (make sure your render.yaml points to the backend directory)
echo 5. Check the logs for any remaining issues
echo.
echo 🔧 CRITICAL FIXES APPLIED:
echo - Added pymongo^>=4.0.0 to requirements.txt (fixes pymongo import error)
echo - Copied water_quality data files to backend directory
echo - Water quality model files are in backend/models_external/
echo - Fixed path issues in water quality routes to use models_external
echo - Fixed water quality data file references to use correct filenames
echo - Updated Dockerfile to include all required files
echo.
echo 🔧 If deploying to Render.com:
echo - Make sure your render.yaml has dockerfilePath: Dockerfile
echo - Make sure your build context is set to the backend directory

if defined missing_files (
    echo.
    echo ⚠️  Warning: Some required files are missing. Please check the list above.
)

pause
