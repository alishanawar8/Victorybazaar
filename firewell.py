import re
from typing import Dict, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class FirewallRule:
    name: str
    pattern: str
    action: str  # 'block', 'allow', 'log'
    severity: str  # 'low', 'medium', 'high'

class WebApplicationFirewall:
    def __init__(self):
        self.rules = self._load_default_rules()
        self.blocked_ips = {}
    
    def _load_default_rules(self) -> List[FirewallRule]:
        """Load default firewall rules"""
        return [
            FirewallRule('SQL Injection', r'(\%27)|(\')|(\-\-)|(\%23)', 'block', 'high'),
            FirewallRule('XSS Attack', r'<script>|javascript:', 'block', 'high'),
            FirewallRule('Path Traversal', r'\.\./|\.\.\\', 'block', 'medium'),
            FirewallRule('Command Injection', r'\b(exec|system|eval)\b', 'block', 'high'),
            FirewallRule('File Inclusion', r'(\binclude\b|\brequire\b).*[\'\"](http|ftp)', 'block', 'medium'),
            FirewallRule('SSRF Attack', r'(\bfile\b|\bgopher\b|\bhttp\b).*[\'\"].*[\'\"]', 'block', 'medium'),
        ]
    
    def inspect_request(self, request_data: Dict) -> Dict:
        """Inspect HTTP request for threats"""
        inspection_result = {
            'allowed': True,
            'threats_detected': [],
            'action_taken': 'allow'
        }
        
        # Check each rule
        for rule in self.rules:
            for field, value in request_data.items():
                if isinstance(value, str) and re.search(rule.pattern, value, re.IGNORECASE):
                    inspection_result['threats_detected'].append({
                        'rule': rule.name,
                        'field': field,
                        'severity': rule.severity
                    })
                    
                    if rule.action == 'block':
                        inspection_result['allowed'] = False
                        inspection_result['action_taken'] = 'block'
                        break
        
        return inspection_result
    
    def block_ip(self, ip_address: str, duration: int = 3600):
        """Block an IP address temporarily"""
        self.blocked_ips[ip_address] = {
            'blocked_until': datetime.now().timestamp() + duration,
            'reason': 'Suspicious activity'
        }
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is blocked"""
        if ip_address in self.blocked_ips:
            block_info = self.blocked_ips[ip_address]
            if datetime.now().timestamp() < block_info['blocked_until']:
                return True
            else:
                # Remove expired block
                del self.blocked_ips[ip_address]
        return False

# Initialize WAF
waf = WebApplicationFirewall()