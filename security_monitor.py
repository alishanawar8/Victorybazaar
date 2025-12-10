import hashlib
import hmac
import secrets
import time
import json
import requests
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import re

class AdvancedSecurityMonitor:
    def __init__(self):
        self.suspicious_activities = []
        self.failed_login_attempts = {}
        self.api_rate_limits = {}
        self.security_logs = []
        
        # Security configurations
        self.config = {
            'max_login_attempts': 5,
            'login_lockout_time': 900,  # 15 minutes
            'api_rate_limit': 100,  # requests per minute
            'suspicious_patterns': [
                r'<script>', r'javascript:', r'DROP TABLE', r'UNION SELECT',
                r'1=1', r'OR 1=1', r'exec(', r'eval(', r'base64_decode'
            ],
            'blocked_countries': ['North Korea', 'Iran', 'Syria', 'Crimea'],
            'admin_ips': ['192.168.1.1', '127.0.0.1']  # Whitelisted IPs
        }
        
        # Initialize logging
        logging.basicConfig(
            filename='security_monitor.log',
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)

    def hash_password(self, password: str, salt: str = None) -> Dict:
        """Secure password hashing with salt"""
        if salt is None:
            salt = secrets.token_bytes(32)
        
        # Use PBKDF2 for key derivation
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            100000,  # 100,000 iterations
            dklen=128
        )
        
        return {
            'hash': key.hex(),
            'salt': salt.hex()
        }

    def verify_password(self, password: str, hash_dict: Dict) -> bool:
        """Verify password against stored hash"""
        try:
            salt = bytes.fromhex(hash_dict['salt'])
            new_hash = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt,
                100000,
                dklen=128
            )
            return hmac.compare_digest(new_hash.hex(), hash_dict['hash'])
        except Exception:
            return False

    def detect_sql_injection(self, input_string: str) -> bool:
        """Detect SQL injection attempts"""
        patterns = [
            r'(\%27)|(\')|(\-\-)|(\%23)|(#)',
            r'((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))',
            r'\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))',
            r'((\%27)|(\'))union',
            r'exec(\s|\+)+(s|x)p\w+',
            r'insert(\s|\+)+into',
            r'drop(\s|\+)+table',
            r'update(\s|\+)+set',
            r'delete(\s|\+)+from'
        ]
        
        for pattern in patterns:
            if re.search(pattern, input_string, re.IGNORECASE):
                return True
        return False

    def detect_xss_attack(self, input_string: str) -> bool:
        """Detect Cross-Site Scripting attempts"""
        xss_patterns = [
            r'<script>',
            r'javascript:',
            r'onload=',
            r'onerror=',
            r'onclick=',
            r'alert(',
            r'document\.cookie',
            r'<iframe',
            r'<img src=',
            r'vbscript:',
            r'expression('
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, input_string, re.IGNORECASE):
                return True
        return False

    def rate_limit_check(self, user_id: str, endpoint: str) -> bool:
        """Check if user has exceeded rate limits"""
        current_time = time.time()
        key = f"{user_id}:{endpoint}"
        
        if key not in self.api_rate_limits:
            self.api_rate_limits[key] = []
        
        # Remove old requests (older than 1 minute)
        self.api_rate_limits[key] = [
            req_time for req_time in self.api_rate_limits[key] 
            if current_time - req_time < 60
        ]
        
        # Check if limit exceeded
        if len(self.api_rate_limits[key]) >= self.config['api_rate_limit']:
            self.log_security_event(
                'RATE_LIMIT_EXCEEDED',
                f"User {user_id} exceeded rate limit for {endpoint}",
                user_id
            )
            return False
        
        # Add current request
        self.api_rate_limits[key].append(current_time)
        return True

    def check_brute_force(self, user_id: str, ip_address: str) -> bool:
        """Check for brute force attack attempts"""
        current_time = time.time()
        key = f"{user_id}:{ip_address}"
        
        if key not in self.failed_login_attempts:
            self.failed_login_attempts[key] = []
        
        # Remove attempts older than lockout time
        self.failed_login_attempts[key] = [
            attempt_time for attempt_time in self.failed_login_attempts[key]
            if current_time - attempt_time < self.config['login_lockout_time']
        ]
        
        # Check if max attempts exceeded
        if len(self.failed_login_attempts[key]) >= self.config['max_login_attempts']:
            self.log_security_event(
                'BRUTE_FORCE_DETECTED',
                f"Brute force detected for user {user_id} from IP {ip_address}",
                user_id
            )
            return False
        
        return True

    def add_failed_login(self, user_id: str, ip_address: str):
        """Record failed login attempt"""
        key = f"{user_id}:{ip_address}"
        if key not in self.failed_login_attempts:
            self.failed_login_attempts[key] = []
        
        self.failed_login_attempts[key].append(time.time())

    def validate_input(self, input_data: str, input_type: str = 'general') -> Dict:
        """Validate and sanitize user input"""
        validation_result = {
            'is_valid': True,
            'sanitized_data': input_data,
            'warnings': [],
            'threats_detected': []
        }
        
        # SQL Injection check
        if self.detect_sql_injection(input_data):
            validation_result['is_valid'] = False
            validation_result['threats_detected'].append('SQL_INJECTION')
        
        # XSS check
        if self.detect_xss_attack(input_data):
            validation_result['is_valid'] = False
            validation_result['threats_detected'].append('XSS_ATTACK')
        
        # Input type specific validation
        if input_type == 'email':
            if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', input_data):
                validation_result['is_valid'] = False
                validation_result['warnings'].append('INVALID_EMAIL_FORMAT')
        
        elif input_type == 'phone':
            if not re.match(r'^\+?1?\d{9,15}$', input_data):
                validation_result['is_valid'] = False
                validation_result['warnings'].append('INVALID_PHONE_FORMAT')
        
        elif input_type == 'password':
            if len(input_data) < 8:
                validation_result['warnings'].append('PASSWORD_TOO_SHORT')
            if not re.search(r'[A-Z]', input_data):
                validation_result['warnings'].append('PASSWORD_NO_UPPERCASE')
            if not re.search(r'[a-z]', input_data):
                validation_result['warnings'].append('PASSWORD_NO_LOWERCASE')
            if not re.search(r'\d', input_data):
                validation_result['warnings'].append('PASSWORD_NO_NUMBER')
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', input_data):
                validation_result['warnings'].append('PASSWORD_NO_SPECIAL_CHAR')
        
        # Sanitize data (basic example)
        sanitized = input_data.strip()
        sanitized = re.sub(r'<script.*?>.*?</script>', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        validation_result['sanitized_data'] = sanitized
        
        return validation_result

    def log_security_event(self, event_type: str, description: str, user_id: str = None):
        """Log security events"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'description': description,
            'user_id': user_id,
            'ip_address': self.get_client_ip()
        }
        
        self.security_logs.append(event)
        logging.warning(f"SECURITY_EVENT: {event_type} - {description}")
        
        # Add to suspicious activities if needed
        if event_type in ['BRUTE_FORCE_DETECTED', 'SQL_INJECTION', 'XSS_ATTACK']:
            self.suspicious_activities.append(event)
            
        # Send alert for critical events
        if event_type in ['BRUTE_FORCE_DETECTED', 'UNAUTHORIZED_ACCESS']:
            self.send_security_alert(event)

    def send_security_alert(self, event: Dict):
        """Send security alert via email"""
        try:
            # Configure your email settings
            smtp_server = "smtp.gmail.com"
            port = 587
            sender_email = "security@victorybazaar.com"
            password = "your_app_password"
            receiver_email = "admin@victorybazaar.com"
            
            message = MimeMultipart("alternative")
            message["Subject"] = f"Security Alert: {event['event_type']}"
            message["From"] = sender_email
            message["To"] = receiver_email
            
            text = f"""
            SECURITY ALERT - Victory Bazaar
            
            Event Type: {event['event_type']}
            Time: {event['timestamp']}
            Description: {event['description']}
            User ID: {event.get('user_id', 'N/A')}
            IP Address: {event.get('ip_address', 'N/A')}
            
            Immediate action required!
            """
            
            html = f"""
            <html>
              <body>
                <h2 style="color: red;">🚨 SECURITY ALERT - Victory Bazaar</h2>
                <p><strong>Event Type:</strong> {event['event_type']}</p>
                <p><strong>Time:</strong> {event['timestamp']}</p>
                <p><strong>Description:</strong> {event['description']}</p>
                <p><strong>User ID:</strong> {event.get('user_id', 'N/A')}</p>
                <p><strong>IP Address:</strong> {event.get('ip_address', 'N/A')}</p>
                <p><em>Immediate action required!</em></p>
              </body>
            </html>
            """
            
            part1 = MimeText(text, "plain")
            part2 = MimeText(html, "html")
            
            message.attach(part1)
            message.attach(part2)
            
            server = smtplib.SMTP(smtp_server, port)
            server.starttls()
            server.login(sender_email, password)
            server.sendmail(sender_email, receiver_email, message.as_string())
            server.quit()
            
        except Exception as e:
            logging.error(f"Failed to send security alert: {e}")

    def get_client_ip(self) -> str:
        """Get client IP address (for web applications)"""
        # This would be implemented based on your web framework
        # For Flask: request.remote_addr
        # For Django: request.META.get('REMOTE_ADDR')
        return "127.0.0.1"  # Placeholder

    def generate_2fa_code(self) -> str:
        """Generate 6-digit 2FA code"""
        return ''.join(secrets.choice('0123456789') for _ in range(6))

    def verify_2fa_code(self, user_code: str, stored_code: str) -> bool:
        """Verify 2FA code with timing attack protection"""
        return hmac.compare_digest(user_code, stored_code)

    def get_security_report(self) -> Dict:
        """Generate security report"""
        recent_events = [
            event for event in self.security_logs 
            if datetime.fromisoformat(event['timestamp']) > datetime.now() - timedelta(hours=24)
        ]
        
        return {
            'total_events_24h': len(recent_events),
            'suspicious_activities': len(self.suspicious_activities),
            'blocked_ips': list(set([event.get('ip_address') for event in recent_events if event.get('ip_address')])),
            'threat_types': list(set([event['event_type'] for event in recent_events])),
            'security_score': self.calculate_security_score(recent_events)
        }

    def calculate_security_score(self, events: List) -> int:
        """Calculate security score (0-100)"""
        base_score = 100
        
        # Deduct points for security events
        for event in events:
            if event['event_type'] == 'BRUTE_FORCE_DETECTED':
                base_score -= 10
            elif event['event_type'] in ['SQL_INJECTION', 'XSS_ATTACK']:
                base_score -= 15
            elif event['event_type'] == 'RATE_LIMIT_EXCEEDED':
                base_score -= 5
        
        return max(0, base_score)

# Singleton instance
security_monitor = AdvancedSecurityMonitor()