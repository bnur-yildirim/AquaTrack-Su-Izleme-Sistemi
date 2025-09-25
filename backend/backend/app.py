"""
AquaTrack API - Temiz Modüler Flask Uygulaması
"""

from flask import Flask
from flask_cors import CORS

from data_loader import load_data
from models import load_models
from utils import log_info, log_error

app = Flask(__name__)
CORS(app)

# Import all routes
from routes.forecast_routes import forecast_bp
from routes.future_forecast_routes import future_bp
from routes.analytics_routes import analytics_bp  
from routes.quality_routes import quality_bp
from routes.system_routes import system_bp
from routes.color_routes import color_bp
from routes.auth_routes import auth_bp

# Register blueprints
app.register_blueprint(forecast_bp)
app.register_blueprint(future_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(quality_bp) 
app.register_blueprint(system_bp)
app.register_blueprint(color_bp)
app.register_blueprint(auth_bp)

def initialize_data():
    """Veri ve modelleri yükle"""
    log_info("🚀 AquaTrack API başlatılıyor...")
    
    # Auth veritabanını başlat
    try:
        from auth_system import init_database
        init_database()
        log_info("✅ Kullanıcı veritabanı hazır")
    except Exception as e:
        log_error(f"❌ Auth veritabanı hatası: {e}")
    
    # Verileri yükle
    data_success = load_data()
    if data_success:
        log_info("✅ Veriler başarıyla yüklendi")
    else:
        log_error("❌ Veri yükleme başarısız")
    
    # Modelleri yükle
    load_models()
    
    return data_success

if __name__ == "__main__":
    # Veri ve modelleri başlat
    initialize_data()
    
    # Uygulamayı çalıştır
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000,
        threaded=True
    )
