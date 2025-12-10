from flask import Flask, render_template, jsonify, request
from security_monitor import security_monitor
from api_security import api_security
from firewall import waf
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

@app.route('/security/dashboard')
def security_dashboard():
    """Security dashboard page"""
    report = security_monitor.get_security_report()
    return render_template('security_dashboard.html', report=report)

@app.route('/api/security/events')
@api_security.require_role('admin')
def get_security_events(user_data):
    """Get security events (Admin only)"""
    events = security_monitor.security_logs[-100:]  # Last 100 events
    return jsonify({'events': events})

@app.route('/api/security/block-ip', methods=['POST'])
@api_security.require_role('admin')
def block_ip(user_data):
    """Block an IP address"""
    data = request.get_json()
    ip_address = data.get('ip_address')
    duration = data.get('duration', 3600)
    
    waf.block_ip(ip_address, duration)
    return jsonify({'message': f'IP {ip_address} blocked for {duration} seconds'})

@app.route('/api/security/report')
@api_security.require_role('admin')
def get_security_report(user_data):
    """Get security report"""
    report = security_monitor.get_security_report()
    return jsonify(report)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)