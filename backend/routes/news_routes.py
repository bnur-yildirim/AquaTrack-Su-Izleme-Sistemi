from flask import Blueprint, request, jsonify
from datetime import datetime
import sqlite3
import os

news_bp = Blueprint('news', __name__)

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'news.db')

def init_news_db():
    """Initialize news database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            content TEXT,
            category TEXT NOT NULL,
            priority TEXT DEFAULT 'medium',
            source TEXT NOT NULL,
            author TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published BOOLEAN DEFAULT 1,
            lake_id TEXT,
            image_url TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB on import
init_news_db()

@news_bp.route('/api/news', methods=['GET'])
def get_news():
    """Get all published news"""
    try:
        category = request.args.get('category', 'all')
        lake_id = request.args.get('lake_id')
        limit = request.args.get('limit', 50, type=int)
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = 'SELECT * FROM news WHERE published = 1'
        params = []
        
        if category != 'all':
            query += ' AND category = ?'
            params.append(category)
        
        if lake_id:
            query += ' AND (lake_id = ? OR lake_id IS NULL)'
            params.append(lake_id)
        
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        news = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'news': news,
            'count': len(news)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@news_bp.route('/api/news', methods=['POST'])
def create_news():
    """Create new news (requires authentication)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'summary', 'category', 'source']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate category
        valid_categories = ['Su Miktarı', 'Su Kalitesi', 'Koruma', 'Genel']
        if data['category'] not in valid_categories:
            return jsonify({
                'success': False,
                'error': 'Invalid category'
            }), 400
        
        # Validate priority
        valid_priorities = ['low', 'medium', 'high']
        priority = data.get('priority', 'medium')
        if priority not in valid_priorities:
            priority = 'medium'
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO news (title, summary, content, category, priority, source, author, lake_id, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['title'],
            data['summary'],
            data.get('content', ''),
            data['category'],
            priority,
            data['source'],
            data.get('author', ''),
            data.get('lake_id'),
            data.get('image_url')
        ))
        
        news_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'News created successfully',
            'news_id': news_id
        }), 201
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@news_bp.route('/api/news/<int:news_id>', methods=['PUT'])
def update_news(news_id):
    """Update existing news (requires authentication)"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        if 'title' in data:
            update_fields.append('title = ?')
            params.append(data['title'])
        
        if 'summary' in data:
            update_fields.append('summary = ?')
            params.append(data['summary'])
        
        if 'content' in data:
            update_fields.append('content = ?')
            params.append(data['content'])
        
        if 'category' in data:
            update_fields.append('category = ?')
            params.append(data['category'])
        
        if 'priority' in data:
            update_fields.append('priority = ?')
            params.append(data['priority'])
        
        if 'published' in data:
            update_fields.append('published = ?')
            params.append(1 if data['published'] else 0)
        
        if 'image_url' in data:
            update_fields.append('image_url = ?')
            params.append(data['image_url'])
        
        update_fields.append('updated_at = CURRENT_TIMESTAMP')
        
        params.append(news_id)
        
        query = f"UPDATE news SET {', '.join(update_fields)} WHERE id = ?"
        cursor.execute(query, params)
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'News updated successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@news_bp.route('/api/news/<int:news_id>', methods=['DELETE'])
def delete_news(news_id):
    """Delete news (requires authentication)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM news WHERE id = ?', (news_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'News deleted successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@news_bp.route('/api/news/stats', methods=['GET'])
def get_news_stats():
    """Get news statistics"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Total news count
        cursor.execute('SELECT COUNT(*) as total FROM news WHERE published = 1')
        total = cursor.fetchone()['total']
        
        # Count by category
        cursor.execute('''
            SELECT category, COUNT(*) as count 
            FROM news 
            WHERE published = 1 
            GROUP BY category
        ''')
        by_category = [dict(row) for row in cursor.fetchall()]
        
        # Count by priority
        cursor.execute('''
            SELECT priority, COUNT(*) as count 
            FROM news 
            WHERE published = 1 
            GROUP BY priority
        ''')
        by_priority = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'by_category': by_category,
                'by_priority': by_priority
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

