"""
Kimlik Doğrulama API Route'ları
"""

from flask import Blueprint, request, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from auth_system import authenticate_user, register_user, create_session_token, verify_token, get_user_by_id, update_last_login
from utils import log_info, log_error

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Kullanıcı giriş endpoint'i"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({"error": "Kullanıcı adı ve şifre gerekli"}), 400
        
        # Kullanıcıyı doğrula
        user = authenticate_user(username, password)
        
        if user:
            # Session token oluştur
            token = create_session_token(user['id'])
            
            # Son giriş zamanını güncelle
            update_last_login(user['id'])
            
            log_info(f"Başarılı giriş: {username} ({user['type']})")
            
            return jsonify({
                "success": True,
                "user": user,
                "token": token,
                "message": f"Hoş geldiniz, {user['city']}"
            })
        else:
            log_error(f"Başarısız giriş denemesi: {username}")
            return jsonify({"error": "Kullanıcı adı veya şifre hatalı"}), 401
            
    except Exception as e:
        log_error(f"Giriş hatası: {str(e)}")
        return jsonify({"error": "Giriş işlemi başarısız"}), 500

@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    """Yeni kullanıcı kayıt endpoint'i"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        user_type = data.get('user_type', 'public')
        city = data.get('city', '').strip()
        email = data.get('email', '').strip()
        
        # Validasyon
        if not username or not password:
            return jsonify({"error": "Kullanıcı adı ve şifre gerekli"}), 400
            
        if len(password) < 6:
            return jsonify({"error": "Şifre en az 6 karakter olmalı"}), 400
            
        if user_type == 'municipality' and not city:
            return jsonify({"error": "Belediye kullanıcıları için şehir bilgisi gerekli"}), 400
        
        # Kullanıcı kaydı
        user = register_user(username, password, user_type, city, email)
        
        if user:
            # Session token oluştur
            token = create_session_token(user['id'])
            
            log_info(f"Yeni kullanıcı kaydı: {username} ({user_type}) - {city}")
            
            return jsonify({
                "success": True,
                "user": user,
                "token": token,
                "message": f"Kayıt başarılı! Hoş geldiniz, {city}"
            })
        else:
            return jsonify({"error": "Bu kullanıcı adı zaten kullanılıyor"}), 409
            
    except Exception as e:
        log_error(f"Kayıt hatası: {str(e)}")
        return jsonify({"error": "Kayıt işlemi başarısız"}), 500

@auth_bp.route("/api/auth/verify", methods=["POST"])
def verify():
    """Token doğrulama endpoint'i"""
    try:
        data = request.get_json()
        token = data.get('token', '')
        
        if not token:
            return jsonify({"error": "Token gerekli"}), 400
        
        user_id = verify_token(token)
        
        if user_id:
            user = get_user_by_id(user_id)
            if user:
                return jsonify({
                    "success": True,
                    "user": user
                })
        
        return jsonify({"error": "Geçersiz veya süresi dolmuş token"}), 401
        
    except Exception as e:
        log_error(f"Token doğrulama hatası: {str(e)}")
        return jsonify({"error": "Token doğrulama başarısız"}), 500

@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    """Kullanıcı çıkış endpoint'i"""
    try:
        # Token'ı geçersiz kıl (basit versiyon)
        return jsonify({
            "success": True,
            "message": "Başarıyla çıkış yapıldı"
        })
        
    except Exception as e:
        log_error(f"Çıkış hatası: {str(e)}")
        return jsonify({"error": "Çıkış işlemi başarısız"}), 500

@auth_bp.route("/api/auth/users", methods=["GET"])
def list_users():
    """Kullanıcı listesi (admin için)"""
    try:
        # Token kontrolü yapılmalı (admin yetkisi)
        from database import get_client, get_db
        client = get_client(os.getenv("MONGODB_URI"))
        db = get_db(client, os.getenv("MONGODB_DB_NAME"))
        rows = list(db["users"].find({}, {"_id": 0, "password_hash": 0}))
        for r in rows:
            r["is_active"] = bool(r.get("is_active", True))
        return jsonify({
            "success": True,
            "users": rows,
            "total": len(rows)
        })
        
    except Exception as e:
        log_error(f"Kullanıcı listesi hatası: {str(e)}")
        return jsonify({"error": "Kullanıcı listesi alınamadı"}), 500
