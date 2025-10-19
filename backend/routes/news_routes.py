from flask import Blueprint, request, jsonify
from datetime import datetime
from database_data_loader import db_loader
from database.queries import DatabaseQueries
from database import get_database

news_bp = Blueprint('news', __name__)

# Initialize database queries
queries = DatabaseQueries()

@news_bp.route('/api/news', methods=['GET'])
def get_news():
    """Get all published news"""
    try:
        category = request.args.get('category', 'all')
        lake_id = request.args.get('lake_id')
        limit = request.args.get('limit', 50, type=int)
        
        # Get news from MongoDB
        news_data = queries.get_all_news(published_only=True)
        
        # Filter by category
        if category != 'all':
            news_data = [n for n in news_data if n['category'] == category]
        
        # Filter by lake_id
        if lake_id:
            news_data = [n for n in news_data if n.get('lake_id') == lake_id]
        
        # Limit results
        news_data = news_data[:limit]
        
        # Convert ObjectId and datetime objects safely
        for article in news_data:
            if '_id' in article:
                del article['_id']
            
            # Safe date conversion
            for date_field in ['published_at', 'created_at', 'updated_at']:
                if date_field in article and article[date_field] is not None:
                    try:
                        if hasattr(article[date_field], 'isoformat'):
                            article[date_field] = article[date_field].isoformat()
                        else:
                            article[date_field] = str(article[date_field])
                    except Exception:
                        article[date_field] = str(article[date_field])
                elif date_field in article:
                    article[date_field] = None
        
        return jsonify({
            'success': True,
            'news': news_data,
            'count': len(news_data)
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
        # MongoDB'den haber istatistiklerini al
        db = get_database()
        
        # Toplam haber sayısı
        total = db['news'].count_documents({'is_published': True})
        
        # Kategori bazında sayım
        by_category = list(db['news'].aggregate([
            {'$match': {'is_published': True}},
            {'$group': {'_id': '$category', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]))
        
        # Öncelik bazında sayım
        by_priority = list(db['news'].aggregate([
            {'$match': {'is_published': True}},
            {'$group': {'_id': '$priority', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]))
        
        # Göl bazında sayım
        by_lake = list(db['news'].aggregate([
            {'$match': {'is_published': True, 'lake_id': {'$ne': None}}},
            {'$group': {'_id': '$lake_id', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]))
        
        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'by_category': [{'category': item['_id'], 'count': item['count']} for item in by_category],
                'by_priority': [{'priority': item['_id'], 'count': item['count']} for item in by_priority],
                'by_lake': [{'lake_id': item['_id'], 'count': item['count']} for item in by_lake]
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

