"""
Dinamik Kullanıcı Kimlik Doğrulama Sistemi
"""

import sqlite3
import hashlib
import secrets
import jwt
import os
from datetime import datetime, timedelta
from pathlib import Path

# Veritabanı dosyası
DB_PATH = Path(__file__).parent / "users.db"
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev_secret_key_change_in_production')

def init_database():
    """Kullanıcı veritabanını başlat"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Kullanıcılar tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            user_type TEXT NOT NULL,
            city TEXT,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    # Oturumlar tablosu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Varsayılan kullanıcıları ekle
    default_users = [
        ('misafir', 'misafir', 'public', 'Genel Erişim', 'misafir@aquatrack.com'),
        ('ankara.belediye', 'ankara123', 'municipality', 'Ankara', 'su@ankara.bel.tr'),
        ('van.belediye', 'van123', 'municipality', 'Van', 'su@van.bel.tr'),
        ('burdur.belediye', 'burdur123', 'municipality', 'Burdur', 'su@burdur.bel.tr'),
        ('admin', 'admin123', 'admin', 'Sistem Yönetimi', 'admin@aquatrack.com')
    ]
    
    for username, password, user_type, city, email in default_users:
        try:
            password_hash = hash_password(password)
            cursor.execute('''
                INSERT OR IGNORE INTO users (username, password_hash, user_type, city, email)
                VALUES (?, ?, ?, ?, ?)
            ''', (username, password_hash, user_type, city, email))
        except sqlite3.IntegrityError:
            pass  # Kullanıcı zaten var
    
    conn.commit()
    conn.close()
    print("✅ Kullanıcı veritabanı başlatıldı")

def hash_password(password):
    """Şifreyi güvenli şekilde hash'le"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return salt + ':' + password_hash.hex()

def verify_password(password, stored_hash):
    """Şifreyi doğrula"""
    try:
        salt, hash_hex = stored_hash.split(':')
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return password_hash.hex() == hash_hex
    except:
        return False

def authenticate_user(username, password):
    """Kullanıcı kimlik doğrulaması"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, password_hash, user_type, city, email, is_active
        FROM users WHERE username = ?
    ''', (username,))
    
    user = cursor.fetchone()
    conn.close()
    
    if user and user[6] and verify_password(password, user[2]):  # is_active and password check
        return {
            'id': user[0],
            'username': user[1],
            'type': user[3],
            'city': user[4],
            'email': user[5]
        }
    return None

def register_user(username, password, user_type, city, email):
    """Yeni kullanıcı kaydı"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        cursor.execute('''
            INSERT INTO users (username, password_hash, user_type, city, email)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, password_hash, user_type, city, email))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            'id': user_id,
            'username': username,
            'type': user_type,
            'city': city,
            'email': email
        }
    except sqlite3.IntegrityError:
        conn.close()
        return None  # Kullanıcı adı zaten var

def create_session_token(user_id):
    """JWT token oluştur"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Token'ı doğrula"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_user_by_id(user_id):
    """ID'ye göre kullanıcı bilgilerini al"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, user_type, city, email
        FROM users WHERE id = ? AND is_active = 1
    ''', (user_id,))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            'id': user[0],
            'username': user[1],
            'type': user[2],
            'city': user[3],
            'email': user[4]
        }
    return None

def update_last_login(user_id):
    """Son giriş zamanını güncelle"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    ''', (user_id,))
    
    conn.commit()
    conn.close()

# Başlangıçta veritabanını oluştur
if __name__ == "__main__":
    init_database()
