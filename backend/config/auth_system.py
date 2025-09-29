"""
Dinamik Kullanıcı Kimlik Doğrulama Sistemi (MongoDB)
"""

import hashlib
import secrets
import jwt
import os
from datetime import datetime, timedelta
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass
from database import get_client, get_db

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev_secret_key_change_in_production')

def _get_db():
    client = get_client(os.getenv("MONGODB_URI"))
    db = get_db(client, os.getenv("MONGODB_DB_NAME"))
    return db

def hash_password(password):
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return salt + ':' + password_hash.hex()

def verify_password(password, stored_hash):
    try:
        salt, hash_hex = stored_hash.split(':')
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return password_hash.hex() == hash_hex
    except:
        return False

def authenticate_user(username, password):
    db = _get_db()
    user = db["users"].find_one({"username": username, "is_active": {"$ne": False}})
    if user and verify_password(password, user.get("password_hash", "")):
        return {
            'id': str(user.get("_id")),
            'username': user.get("username"),
            'type': user.get("user_type", "public"),
            'city': user.get("city", ""),
            'email': user.get("email", "")
        }
    return None

def register_user(username, password, user_type, city, email):
    db = _get_db()
    existing = db["users"].find_one({"username": username})
    if existing:
        return None
    password_hash = hash_password(password)
    doc = {
        "username": username,
        "password_hash": password_hash,
        "user_type": user_type,
        "city": city,
        "email": email,
        "created_at": datetime.utcnow(),
        "last_login": None,
        "is_active": True
    }
    result = db["users"].insert_one(doc)
    return {
        'id': str(result.inserted_id),
        'username': username,
        'type': user_type,
        'city': city,
        'email': email
    }

def create_session_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_user_by_id(user_id):
    db = _get_db()
    user = db["users"].find_one({"_id": {"$in": [user_id, str(user_id)]}, "is_active": {"$ne": False}})
    if user:
        return {
            'id': str(user.get("_id")),
            'username': user.get("username"),
            'type': user.get("user_type", "public"),
            'city': user.get("city", ""),
            'email': user.get("email", "")
        }
    return None

def update_last_login(user_id):
    db = _get_db()
    db["users"].update_one({"_id": {"$in": [user_id, str(user_id)]}}, {"$set": {"last_login": datetime.utcnow()}})

def seed_default_users():
    db = _get_db()
    default_users = [
        ('misafir', 'misafir', 'public', 'Genel Erişim', 'misafir@aquatrack.com'),
        ('ankara.belediye', 'ankara123', 'municipality', 'Ankara', 'su@ankara.bel.tr'),
        ('van.belediye', 'van123', 'municipality', 'Van', 'su@van.bel.tr'),
        ('burdur.belediye', 'burdur123', 'municipality', 'Burdur', 'su@burdur.bel.tr'),
        ('admin', 'admin123', 'admin', 'Sistem Yönetimi', 'admin@aquatrack.com')
    ]
    for username, password, user_type, city, email in default_users:
        if not db["users"].find_one({"username": username}):
            db["users"].insert_one({
                "username": username,
                "password_hash": hash_password(password),
                "user_type": user_type,
                "city": city,
                "email": email,
                "created_at": datetime.utcnow(),
                "is_active": True
            })
