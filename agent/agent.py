import os
import sys
import time
import json
import socket
import platform
import subprocess
import urllib.request
import urllib.parse

BACKEND_URL = "http://localhost:5001/api/edr/agent-telemetry"

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
            out_cpu = subprocess.check_output("wmic cpu get LoadPercentage", shell=True).decode()
            cpu_usage = int(out_cpu.split("\n")[1].strip())
            
            # Windows RAM usage
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
        else:
            # Linux CPU usage
            try:
                out_cpu = subprocess.check_output("top -bn1 | grep 'Cpu(s)'", shell=True).decode()
                cpu_usage = int(float(out_cpu.split()[1].replace(',', '.')))
            except Exception:
                try:
                    with open('/proc/loadavg', 'r') as f:
                        cpu_usage = min(100, int(float(f.readline().split()[0]) * 10))
                except Exception:
                    pass
            
            # Linux RAM usage
            try:
                out_mem = subprocess.check_output("free | grep Mem", shell=True).decode()
                mem_parts = out_mem.split()
                total_mem = int(mem_parts[1])
                used_mem = int(mem_parts[2])
                ram_usage = int((used_mem / total_mem) * 100)
            except Exception:
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
                        used = total - free - buffers - cached
                        ram_usage = int((used / total) * 100)
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
