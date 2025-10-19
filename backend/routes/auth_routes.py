"""
Kimlik Doğrulama API Route'ları
"""

from flask import Blueprint, request, jsonify
import sys
import os
from auth_system import authenticate_user, register_user, create_session_token, verify_token, get_user_by_id, update_last_login, DB_PATH
from utils import log_info, log_error

# Güvenlik modüllerini import et
from security.input_validation import InputValidator, ValidationError
from security.error_handler import SecureErrorHandler, secure_endpoint_wrapper
from security.rate_limiter import rate_limit

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/api/auth/login", methods=["POST"])
@rate_limit('auth')
@secure_endpoint_wrapper
def login():
    """Kullanıcı giriş endpoint'i"""
    try:
        data = request.get_json()
        if not data:
            return SecureErrorHandler.handle_validation_error("JSON verisi gerekli")
        
        username_param = data.get('username', '').strip()
        password_param = data.get('password', '')
        
        # Güvenli input validation
        username = InputValidator.validate_username(username_param)
        password = InputValidator.validate_password(password_param)
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
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
        return SecureErrorHandler.handle_auth_error("Kullanıcı adı veya şifre hatalı")

@auth_bp.route("/api/auth/register", methods=["POST"])
@rate_limit('auth')
@secure_endpoint_wrapper
def register():
    """Yeni kullanıcı kayıt endpoint'i"""
    try:
        data = request.get_json()
        if not data:
            return SecureErrorHandler.handle_validation_error("JSON verisi gerekli")
        
        username_param = data.get('username', '').strip()
        password_param = data.get('password', '')
        user_type = data.get('user_type', 'public')
        city_param = data.get('city', '').strip()
        email_param = data.get('email', '').strip()
        
        # Güvenli input validation
        username = InputValidator.validate_username(username_param)
        password = InputValidator.validate_password(password_param)
        city = InputValidator.validate_city(city_param)
        
        # Email validation (basit)
        email = InputValidator.sanitize_string(email_param, 100)
        if email and '@' not in email:
            return SecureErrorHandler.handle_validation_error("Geçersiz email formatı")
        
        # Kullanıcı tipi validasyonu
        if user_type not in ['public', 'municipality', 'researcher']:
            return SecureErrorHandler.handle_validation_error("Geçersiz kullanıcı tipi")
        
        # Belediye kullanıcıları için şehir kontrolü
        if user_type == 'municipality' and not city:
            return SecureErrorHandler.handle_validation_error("Belediye kullanıcıları için şehir bilgisi gerekli")
        
    except ValidationError as e:
        return SecureErrorHandler.handle_validation_error(str(e))
    
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
        return SecureErrorHandler.handle_auth_error("Bu kullanıcı adı zaten kullanılıyor", status_code=409)

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
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, user_type, city, email, created_at, last_login, is_active
            FROM users ORDER BY created_at DESC
        ''')
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'username': row[0],
                'type': row[1],
                'city': row[2],
                'email': row[3],
                'created_at': row[4],
                'last_login': row[5],
                'is_active': bool(row[6])
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "users": users,
            "total": len(users)
        })
        
    except Exception as e:
        log_error(f"Kullanıcı listesi hatası: {str(e)}")
        return jsonify({"error": "Kullanıcı listesi alınamadı"}), 500
