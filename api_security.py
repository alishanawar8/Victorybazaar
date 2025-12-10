from functools import wraps
import jwt
from flask import request, jsonify, current_app
import time

class APISecurity:
    def __init__(self):
        self.blacklisted_tokens = set()
    
    def generate_jwt_token(self, user_data: Dict) -> str:
        """Generate JWT token"""
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'role': user_data.get('role', 'user'),
            'exp': time.time() + 3600,  # 1 hour expiry
            'iat': time.time()
        }
        
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    def verify_jwt_token(self, token: str) -> Dict:
        """Verify JWT token"""
        try:
            if token in self.blacklisted_tokens:
                return None
            
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def blacklist_token(self, token: str):
        """Blacklist a token (for logout)"""
        self.blacklisted_tokens.add(token)
    
    def require_auth(self, f):
        """Decorator for requiring authentication"""
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.headers.get('Authorization')
            
            if not token:
                return jsonify({'error': 'Authorization token required'}), 401
            
            if token.startswith('Bearer '):
                token = token[7:]
            
            user_data = self.verify_jwt_token(token)
            if not user_data:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            return f(user_data, *args, **kwargs)
        return decorated
    
    def require_role(self, required_role: str):
        """Decorator for requiring specific role"""
        def decorator(f):
            @wraps(f)
            @APISecurity.require_auth
            def decorated(user_data, *args, **kwargs):
                if user_data.get('role') != required_role:
                    return jsonify({'error': 'Insufficient permissions'}), 403
                return f(user_data, *args, **kwargs)
            return decorated
        return decorator

# Initialize API security
api_security = APISecurity()