import { useState, useEffect } from 'react';
import { 
  Cpu, Server, ShieldAlert, Activity, Network, FileCode, CheckCircle, XCircle 
} from 'lucide-react';

export default function EDR({ edrUpdates, token }: any) {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Forensics Event stream mocks
  const [forensicTimeline, setForensicTimeline] = useState<any[]>([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  // Sync real-time updates from WebSocket EDR stats pump
  useEffect(() => {
    if (Object.keys(edrUpdates).length > 0) {
      setDevices(prev => prev.map(dev => {
        const update = edrUpdates[dev.hostname];
        if (update) {
          // If the selected device gets updated, update its metrics too
          if (selectedDevice && selectedDevice.hostname === dev.hostname) {
            setSelectedDevice((d: any) => ({
              ...d,
              cpuUsage: update.cpuUsage,
              ramUsage: update.ramUsage,
              status: update.status
            }));
          }
          return {
            ...dev,
            cpuUsage: update.cpuUsage,
            ramUsage: update.ramUsage,
            status: update.status
          };
        }
        return dev;
      }));
    }
  }, [edrUpdates]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/edr/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        if (data.length > 0) {
          selectDevice(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectDevice = (device: any) => {
    setSelectedDevice(device);
    
    // Seed forensic logs matching OS properties
    const isWindows = device.hostname.startsWith('WIN');
    const mockTimeline = [
      { timestamp: '19:12:01', event: 'Process Spawned: services.exe', category: 'Process', desc: 'PID 820 system process execution.' },
      { timestamp: '19:12:05', event: 'TCP socket bind on port 445', category: 'Network', desc: 'Binds listening network connector.' },
      { timestamp: '19:13:20', event: isWindows ? 'Registry RunKey modified: HKLM\\Software\\Updater' : 'File written in directory /etc/cron.d/updater', category: 'Persistence', desc: 'Persistence installation mechanism logged.' },
      { timestamp: '19:14:12', event: isWindows ? 'svchost.exe loaded cryptbase.dll' : 'sshd spawned child bash environment', category: 'System', desc: 'Process DLL handles updates mapping.' },
      { timestamp: '19:14:45', event: 'Outbound proxy telemetry handshake', category: 'Network', desc: 'Outgoing session telemetry dispatched.' },
    ];
    setForensicTimeline(mockTimeline);
  };

  const handleIsolateAction = async (action: 'Isolate' | 'Reconnect') => {
    if (!selectedDevice) return;

    try {
      const res = await fetch('/api/edr/isolate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ hostname: selectedDevice.hostname, action })
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(prev => prev.map(d => d.hostname === selectedDevice.hostname ? { ...d, status: data.status } : d));
        setSelectedDevice((d: any) => ({ ...d, status: data.status }));

        // Append to forensic timeline
        const timestamp = new Date().toLocaleTimeString();
        setForensicTimeline(prev => [
          { timestamp, event: `Agent state update: ${action} Action`, category: 'Containment', desc: `Isolation target triggered state to: ${data.status}` },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Failed to isolate device:', err);
    }
  };

  // Simple hardcoded process paths mock matching CrowdStrike styles
  const renderProcessTree = () => {
    if (!selectedDevice) return null;

    const isWindows = selectedDevice.hostname.startsWith('WIN');

    return (
      <div className="p-4 bg-slate-950/70 border border-slate-900 rounded font-mono text-xs space-y-4">
        <p className="text-[10px] uppercase text-slate-500 border-b border-slate-900 pb-2">Active EDR Process Tree Analysis</p>
        
        <div className="space-y-2 select-text">
          {/* Node 1: Kernel Root */}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-600">├─</span>
            <FileCode className="w-3.5 h-3.5 text-blue-500" />
            <span>[PID 4]</span>
            <span className="text-slate-100 font-bold">{isWindows ? 'System' : 'systemd'}</span>
            <span className="text-[9px] bg-slate-900 px-1 border border-slate-800 text-slate-400 uppercase">SYSTEM PRIVILEGES</span>
          </div>

          {/* Node 2: System Subshell */}
          <div className="flex items-center gap-2 text-slate-400 pl-4">
            <span className="text-slate-600">│  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>[PID 144]</span>
            <span className="text-slate-200">{isWindows ? 'smss.exe' : 'kthreadd'}</span>
            <span className="text-[8px] opacity-60">/sys/kernel/root</span>
          </div>

          {/* Node 3: Core Service Spawning */}
          <div className="flex items-center gap-2 text-slate-400 pl-8">
            <span className="text-slate-600">│  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>[PID 820]</span>
            <span className="text-slate-200">{isWindows ? 'services.exe' : 'cron'}</span>
          </div>

          {/* Node 4: Running Endpoint App */}
          <div className="flex items-center gap-2 text-slate-400 pl-12">
            <span className="text-slate-600">│  │  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>[PID 1040]</span>
            <span className="text-slate-300 font-bold">{isWindows ? 'svchost.exe' : 'rsyslogd'}</span>
            <span className="text-[9px] bg-slate-900 px-1.5 border border-slate-800 text-emerald-400 uppercase font-mono font-bold leading-none">Healthy</span>
          </div>

          {/* Node 5: Threat Process Anomaly Injection (Outlook PowerShell Hack trigger) */}
          <div className="flex flex-col pl-16 border-l-2 border-red-500/30 ml-1 py-1 space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <span className="text-slate-600">├─</span>
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>[PID 4212]</span>
              <span>powershell.exe</span>
              <span className="text-[8px] bg-red-950/40 border border-red-500/20 px-1.5 rounded uppercase text-red-400">Threat Injected</span>
            </div>
            <div className="pl-6 text-[10px] text-slate-500 font-mono select-all">
              CMDLINE: powershell.exe -ExecutionPolicy Bypass -enc SQBFAFgAIAAoAE4AZQB3AC0AT...
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT COLUMN: ENDPOINT REGISTRY LIST */}
      <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg lg:col-span-1 h-[650px] flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">EDR Endpoint Host Registry</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">ACTIVE DOMAIN INVENTORIES</p>
            </div>
            <button 
              onClick={fetchDevices}
              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded"
            >
              REFRESH
            </button>
          </div>

          {loading ? (
            <p className="text-xs font-mono text-slate-500">Querying agent nodes registries...</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {devices.map(dev => {
                const isActive = selectedDevice?.hostname === dev.hostname;
                const isIsolated = dev.status === 'Isolated';
                return (
                  <div 
                    key={dev._id}
                    onClick={() => selectDevice(dev)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-400' 
                        : 'bg-[#0a0f1d]/50 border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Server className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-200">{dev.hostname}</span>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 border rounded uppercase font-bold ${
                        isIsolated 
                          ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                          : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {dev.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 leading-tight">
                      <div>IP Address: <span className="text-slate-300">{dev.ip}</span></div>
                      <div>Memory utilization: <span className="text-slate-300">{dev.ramUsage || 35}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Local environment metrics summary */}
        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>HOSTS: {devices.length} Monitored  |  OFFLINE: 0 Nodes</span>
        </div>
      </div>

      {/* 2. RIGHT COLUMNS: PROCESS TREE & TELEMETRY PANELS */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {selectedDevice ? (
          <>
            {/* System detail dashboard */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-blue-500">ACTIVE TARGET TELEMETRY</span>
                <h3 className="text-base font-bold text-slate-100 mt-1 uppercase">{selectedDevice.hostname} Dashboard</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">IP: {selectedDevice.ip}  |  OS: {selectedDevice.os}</p>
              </div>

              {/* Isolation containment controls */}
              <div>
                {selectedDevice.status === 'Isolated' ? (
                  <button 
                    onClick={() => handleIsolateAction('Reconnect')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold px-4 py-2 rounded transition-colors uppercase"
                  >
                    RECONNECT NETWORK
                  </button>
                ) : (
                  <button 
                    onClick={() => handleIsolateAction('Isolate')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold px-4 py-2 rounded transition-colors uppercase animate-pulse"
                  >
                    CONTAIN & ISOLATE DEVICE
                  </button>
                )}
              </div>
            </div>

            {/* Metrics usage grids */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg flex items-center gap-3">
                <Cpu className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">CPU Ingestion</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice.cpuUsage || 12}%</p>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedDevice.cpuUsage || 12}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">RAM Allocation</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice.ramUsage || 35}%</p>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedDevice.ramUsage || 35}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Process tree visualizer widget */}
            {renderProcessTree()}

            {/* Forensic logs stream */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-sans">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Device Forensic Log Audit Trail</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">CHRONOLOGICAL EVENT TRIGGERS</p>

              <div className="space-y-2 select-text">
                {forensicTimeline.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-900 rounded font-mono text-[10px] flex gap-4">
                    <span className="text-blue-400 font-bold shrink-0">{item.timestamp}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-slate-200 font-bold uppercase">{item.event}</span>
                        <span className="text-[8px] bg-slate-900 border border-slate-800 px-1 text-slate-500 font-bold uppercase">{item.category}</span>
                      </div>
                      <p className="text-slate-400 text-[9px]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs text-slate-500">
            Select an active EDR device registry target from the inventory panel to view forensic structures.
          </div>
        )}

      </div>

    </div>
  );
}
