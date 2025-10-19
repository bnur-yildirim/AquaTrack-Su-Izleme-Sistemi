"""
AquaTrack API - Temiz Modüler Flask Uygulaması
Güvenlik güncellemeleri ile
"""

from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from data_loader import load_data
from models import load_models
from utils import log_info, log_error

# Veri kaynakları konfigürasyonunu import et
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from data_sources_config import WATER_QUALITY_DATA, WATER_QUANTITY_DATA, APP_CONFIG, validate_data_sources
except ImportError as e:
    print(f"Import error: {e}")
    print("Current directory contents:")
    print(os.listdir('.'))
    print("Python path:")
    print(sys.path)
    raise

# Güvenlik modüllerini import et
from security.error_handler import SecureErrorHandler
from security.rate_limiter import rate_limiter

app = Flask(__name__)

# Flask Configuration from Environment
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['FLASK_ENV'] = os.getenv('FLASK_ENV', 'development')
app.config['FLASK_DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# CORS Configuration - Read from environment
cors_origins = os.getenv('CORS_ORIGINS', '*')
print(f"🔧 CORS configured with origins: {cors_origins}")
CORS(app, origins=cors_origins.split(',') if cors_origins != '*' else "*", supports_credentials=False)

# Test route to verify app is working
@app.route('/api/test')
def test_route():
    import os
    from config import BACKEND_MODELS_DIR
    
    # Check if data files exist
    parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
    data_exists = os.path.exists(parquet_path)
    
    return {
        'status': 'success', 
        'message': 'Backend is working!',
        'data_files': {
            'models_dir': BACKEND_MODELS_DIR,
            'parquet_exists': data_exists,
            'parquet_path': parquet_path
        }
    }

# Güvenlik ayarları
app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Server Configuration
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', 5000))

# Production'da debug endpoint'leri kapat
PRODUCTION_MODE = not app.config['DEBUG']

# Import all routes
try:
    from routes.forecast_routes import forecast_bp
    from routes.unified_forecast_routes import unified_forecast_bp
    from routes.analytics_routes import analytics_bp  
    from routes.quality_routes import quality_bp
    from routes.system_routes import system_bp
    from routes.color_routes import color_bp
    from routes.auth_routes import auth_bp
    from routes.detailed_analytics_routes import detailed_analytics_bp
    from routes.unified_metrics_routes import unified_metrics_bp
    from routes.news_routes import news_bp
    from routes.water_quality_routes import water_quality_bp  # ✅ YENİ: K-Means Su Kalitesi
    print("✅ All routes imported successfully")
except ImportError as e:
    print(f"❌ Route import error: {e}")
    raise

# Register blueprints
app.register_blueprint(forecast_bp)
app.register_blueprint(unified_forecast_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(quality_bp)
app.register_blueprint(system_bp)
app.register_blueprint(color_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(detailed_analytics_bp)
app.register_blueprint(unified_metrics_bp)
app.register_blueprint(news_bp)
app.register_blueprint(water_quality_bp)  # ✅ YENİ: K-Means Su Kalitesi

# Debug: Print all registered routes
print("🔍 Registered routes:")
for rule in app.url_map.iter_rules():
    print(f"  {rule.rule} -> {rule.endpoint}")

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    return SecureErrorHandler.handle_not_found_error("Endpoint")

@app.errorhandler(500)
def internal_error(error):
    return SecureErrorHandler.handle_server_error("Internal server error")

@app.errorhandler(429)
def rate_limit_exceeded(error):
    return SecureErrorHandler.handle_rate_limit_error()

def initialize_data():
    """Veri ve modelleri yükle"""
    log_info("🚀 AquaTrack API başlatılıyor...")
    
    # Veri kaynaklarını kontrol et
    log_info("🔍 Veri kaynakları kontrol ediliyor...")
    if not validate_data_sources():
        log_error("❌ Bazı veri kaynakları eksik!")
        return False
    
    # Auth veritabanını başlat
    try:
        from auth_system import init_database
        init_database()
        log_info("✅ Kullanıcı veritabanı hazır")
    except Exception as e:
        log_error(f"Auth veritabanı hatası: {e}")
    
    # Verileri yükle
    try:
        data_success = load_data()
        if data_success:
            log_info("✅ Veriler başarıyla yüklendi")
        else:
            log_error("❌ Veri yükleme başarısız")
    except Exception as e:
        log_error(f"❌ Veri yükleme hatası: {e}")
        data_success = False
    
    # Modelleri yükle
    try:
        load_models()
        log_info("✅ Modeller başarıyla yüklendi")
    except Exception as e:
        log_error(f"❌ Model yükleme hatası: {e}")
    
    return data_success

# Health check endpoint for deployment monitoring
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render deployment"""
    import os
    from config import BACKEND_MODELS_DIR
    
    # Check if data files exist
    parquet_path = os.path.join(BACKEND_MODELS_DIR, 'all_predictions_final.parquet')
    data_exists = os.path.exists(parquet_path)
    
    return {
        'status': 'healthy',
        'service': 'aqua-lake-backend',
        'version': '1.0.0',
        'data_files': {
            'models_dir': BACKEND_MODELS_DIR,
            'parquet_exists': data_exists,
            'parquet_path': parquet_path
        }
    }, 200

if __name__ == "__main__":
    # Veri ve modelleri başlat
    initialize_data()
    
    # Uygulamayı çalıştır
    app.run(
        debug=app.config['DEBUG'],
        host=HOST,
        port=PORT,
        threaded=True
    )
