import os
import sys
import time
import json
import socket
import platform
import subprocess
import urllib.request
import urllib.parse

BACKEND_URL = "http://localhost:5000/api/edr/agent-telemetry"

def get_system_stats():
    # Cross-platform telemetry metrics gatherer
    hostname = socket.gethostname()
    os_name = f"{platform.system()} {platform.release()}"
    
    # Defaults
    cpu_usage = 10
    ram_usage = 45
    
    try:
        if platform.system() == "Windows":
            # Windows metric tools
            out = subprocess.check_output("wmic cpu get LoadPercentage", shell=True).decode()
            cpu_usage = int(out.split("\n")[1].strip())
        else:
            # Linux metric tools
            out = subprocess.check_output("top -bn1 | grep 'Cpu(s)'", shell=True).decode()
            # Extract CPU usage percentage from top command
            cpu_usage = int(float(out.split()[1].replace(',', '.')))
    except Exception:
        pass
        
    return {
        "hostname": hostname,
        "ip": socket.gethostbyname(hostname) if hasattr(socket, 'gethostbyname') else "127.0.0.1",
        "os": os_name,
        "cpuUsage": cpu_usage,
        "ramUsage": ram_usage,
        "status": "Online"
    }

def stream_telemetry():
    print("[AGENT] Initializing cross-platform EDR monitoring daemon thread...")
    print(f"[AGENT] Reporting targeted endpoint telemetry logs to node: {BACKEND_URL}")

    while True:
        try:
            payload = get_system_stats()
            data = json.dumps(payload).encode('utf-8')
            
            req = urllib.request.Request(
                BACKEND_URL, 
                data=data, 
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=2) as response:
                response.read()
                
            print(f"[AGENT] Dispatched telemetry check-in. CPU: {payload['cpuUsage']}% | RAM: {payload['ramUsage']}%")
        except Exception as e:
            print(f"[AGENT] Telemetry reporting pipeline bypass: {e}")
            
        time.sleep(3)

if __name__ == "__main__":
    try:
        stream_telemetry()
    except KeyboardInterrupt:
        print("\n[AGENT] Terminating EDR monitoring daemon thread safely.")
        sys.exit(0)
