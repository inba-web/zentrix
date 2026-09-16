import os
import sys
import time
import json
import socket
import platform
import subprocess
import urllib.request
import urllib.parse

BACKEND_URL = "http://127.0.0.1:5001/api/edr/agent-telemetry"

def get_system_stats():
    # Cross-platform telemetry metrics gatherer
    hostname = socket.gethostname()
    os_name = f"{platform.system()} {platform.release()}"
    
    # Defaults
    cpu_usage = 10
    ram_usage = 45
    
    try:
        if platform.system() == "Windows":
            # Windows CPU usage
            try:
                out_cpu = subprocess.check_output("wmic cpu get LoadPercentage", shell=True).decode()
                lines = [l.strip() for l in out_cpu.split("\n") if l.strip() and l.strip().isdigit()]
                if lines:
                    cpu_usage = int(lines[0])
            except Exception:
                pass
            
            # Windows RAM usage
            try:
                out_mem = subprocess.check_output("wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value", shell=True).decode()
                mem_lines = [line.strip() for line in out_mem.split('\n') if line.strip()]
                mem_dict = {}
                for line in mem_lines:
                    parts = line.split('=')
                    if len(parts) == 2:
                        mem_dict[parts[0]] = int(parts[1])
                free_mem = mem_dict.get('FreePhysicalMemory', 0)
                total_mem = mem_dict.get('TotalVisibleMemorySize', 0)
                if total_mem > 0:
                    ram_usage = int(((total_mem - free_mem) / total_mem) * 100)
            except Exception:
                pass
        else:
            # Linux CPU usage - read /proc/loadavg directly (fast & no subprocess)
            try:
                with open('/proc/loadavg', 'r') as f:
                    # loadavg 1-min scaled to percentage (capped at 100)
                    cpu_usage = min(100, max(1, int(float(f.readline().split()[0]) * 20)))
            except Exception:
                try:
                    out_cpu = subprocess.check_output("top -bn1 | grep 'Cpu(s)'", shell=True).decode()
                    cpu_usage = int(float(out_cpu.split()[1].replace(',', '.')))
                except Exception:
                    pass
            
            # Linux RAM usage - read /proc/meminfo directly (fast & no subprocess)
            try:
                with open('/proc/meminfo', 'r') as f:
                    meminfo = {}
                    for line in f:
                        parts = line.split(':')
                        if len(parts) == 2:
                            meminfo[parts[0].strip()] = int(parts[1].split()[0])
                    total = meminfo.get('MemTotal', 1)
                    free = meminfo.get('MemFree', 0)
                    buffers = meminfo.get('Buffers', 0)
                    cached = meminfo.get('Cached', 0)
                    available = meminfo.get('MemAvailable', free + buffers + cached)
                    used = total - available
                    ram_usage = int((used / total) * 100)
            except Exception:
                try:
                    out_mem = subprocess.check_output("free | grep Mem", shell=True).decode()
                    mem_parts = out_mem.split()
                    total_mem = int(mem_parts[1])
                    used_mem = int(mem_parts[2])
                    ram_usage = int((used_mem / total_mem) * 100)
                except Exception:
                    pass
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

    consecutive_errors = 0
    while True:
        try:
            payload = get_system_stats()
            data = json.dumps(payload).encode('utf-8')
            
            req = urllib.request.Request(
                BACKEND_URL, 
                data=data, 
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                response.read()
                
            if consecutive_errors > 0:
                print(f"[AGENT] Telemetry reporting pipeline restored.")
                consecutive_errors = 0
                
            print(f"[AGENT] Dispatched telemetry check-in. CPU: {payload['cpuUsage']}% | RAM: {payload['ramUsage']}%")
        except Exception as e:
            consecutive_errors += 1
            if consecutive_errors == 1:
                print(f"[AGENT] Waiting for backend server at {BACKEND_URL}...")
            elif consecutive_errors % 10 == 0:
                print(f"[AGENT] Telemetry reporting pipeline bypass: {e}")
            
        time.sleep(3)

if __name__ == "__main__":
    try:
        stream_telemetry()
    except KeyboardInterrupt:
        print("\n[AGENT] Terminating EDR monitoring daemon thread safely.")
        sys.exit(0)
