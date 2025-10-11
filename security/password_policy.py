"""
AquaTrack Güvenlik Politikaları
Şifre güvenliği, rate limiting, ve güvenlik kontrolleri
"""

import re
import hashlib
import secrets
import bcrypt
from datetime import datetime, timedelta
import os
from functools import wraps
from flask import request, jsonify, current_app

class PasswordPolicy:
    """Şifre güvenlik politikaları"""
    
    MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 8))
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = True
    BCRYPT_ROUNDS = int(os.getenv('BCRYPT_ROUNDS', 12))
    
    @staticmethod
    def validate_password(password):
        """Şifre güvenlik kurallarını kontrol et"""
        errors = []
        
        if len(password) < PasswordPolicy.MIN_LENGTH:
            errors.append(f"Şifre en az {PasswordPolicy.MIN_LENGTH} karakter olmalı")
        
        if PasswordPolicy.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Şifre en az bir büyük harf içermeli")
        
        if PasswordPolicy.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Şifre en az bir küçük harf içermeli")
        
        if PasswordPolicy.REQUIRE_NUMBERS and not re.search(r'\d', password):
            errors.append("Şifre en az bir rakam içermeli")
        
        if PasswordPolicy.REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Şifre en az bir özel karakter içermeli (!@#$%^&*)")
        
        # Yaygın şifreler kontrolü
        common_passwords = ['123456', 'password', 'admin', 'qwerty', '12345678']
        if password.lower() in common_passwords:
            errors.append("Bu şifre çok yaygın kullanılıyor, daha güvenli bir şifre seçin")
        
        return errors
    
    @staticmethod
    def hash_password(password):
        """Şifreyi güvenli şekilde hash'le"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=PasswordPolicy.BCRYPT_ROUNDS))
    
    @staticmethod
    def verify_password(password, hashed):
        """Şifreyi doğrula"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed)
    
    @staticmethod
    def generate_secure_password(length=16):
        """Güvenli şifre oluştur"""
        import string
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(chars) for _ in range(length))

class SecurityHeaders:
    """Güvenlik başlıkları"""
    
    @staticmethod
    def add_security_headers(response):
        """HTTP güvenlik başlıklarını ekle"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

class RateLimiter:
    """API rate limiting"""
    
    def __init__(self):
        self.requests = {}
        self.limit = int(os.getenv('API_RATE_LIMIT', 100))
        self.window = 3600  # 1 saat
    
    def is_allowed(self, identifier):
        """Rate limit kontrolü"""
        now = datetime.now()
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Eski istekleri temizle
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < timedelta(seconds=self.window)
        ]
        
        # Limit kontrolü
        if len(self.requests[identifier]) >= self.limit:
            return False
        
        # Yeni isteği kaydet
        self.requests[identifier].append(now)
        return True

class InputValidator:
    """Girdi doğrulama ve sanitizasyon"""
    
    @staticmethod
    def sanitize_string(input_str, max_length=255):
        """String'i temizle ve doğrula"""
        if not input_str:
            return ""
        
        # HTML/Script injection koruması
        input_str = re.sub(r'<[^>]*>', '', str(input_str))
        
        # SQL injection koruması için basit kontrol
        dangerous_chars = ['\'', '"', ';', '--', '/*', '*/', 'xp_', 'sp_']
        for char in dangerous_chars:
            input_str = input_str.replace(char, '')
        
        return input_str[:max_length].strip()
    
    @staticmethod
    def validate_email(email):
        """Email formatını doğrula"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_username(username):
        """Kullanıcı adı formatını doğrula"""
        if not username or len(username) < 3:
            return False
        
        # Sadece alfanumerik ve belirli özel karakterler
        pattern = r'^[a-zA-Z0-9._-]+$'
        return re.match(pattern, username) is not None

# Decorator'lar
def rate_limit(f):
    """Rate limiting decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        limiter = RateLimiter()
        identifier = request.remote_addr
        
        if not limiter.is_allowed(identifier):
            return jsonify({
                'error': 'Rate limit exceeded',
                'message': 'Too many requests. Please try again later.'
            }), 429
        
        return f(*args, **kwargs)
    return decorated_function

def require_auth(f):
    """Authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            # Token doğrulama (JWT)
            token = token.replace('Bearer ', '')
            # JWT doğrulama kodu buraya
            
        except:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def log_security_event(event_type, details, user_id=None):
    """Güvenlik olaylarını logla"""
    timestamp = datetime.now().isoformat()
    ip_address = request.remote_addr if request else 'system'
    
    log_entry = {
        'timestamp': timestamp,
        'event_type': event_type,
        'details': details,
        'user_id': user_id,
        'ip_address': ip_address,
        'user_agent': request.headers.get('User-Agent') if request else 'system'
    }
    
    # Log dosyasına yaz (production'da database'e kaydet)
    print(f"SECURITY EVENT: {log_entry}")

# Güvenlik konfigürasyonu
SECURITY_CONFIG = {
    'SESSION_COOKIE_SECURE': True,
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SAMESITE': 'Lax',
    'PERMANENT_SESSION_LIFETIME': timedelta(hours=2),
    'MAX_CONTENT_LENGTH': int(os.getenv('MAX_FILE_SIZE', 16 * 1024 * 1024)),  # 16MB
    'UPLOAD_EXTENSIONS': os.getenv('ALLOWED_EXTENSIONS', 'csv,json,parquet').split(',')
}
