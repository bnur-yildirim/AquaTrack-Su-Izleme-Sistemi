"""
Routes modülü
"""

from .forecast_routes import forecast_bp
from .analytics_routes import analytics_bp
from .quality_routes import quality_bp
from .system_routes import system_bp

def register_routes(app):
    """Tüm route'ları Flask uygulamasına kaydet"""
    app.register_blueprint(forecast_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(quality_bp)
    app.register_blueprint(system_bp)
