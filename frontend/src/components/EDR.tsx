import React, { useState, useEffect } from 'react';
import { Cpu, Server, ShieldAlert, Activity, Network, FileCode, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an EDR render crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0D1117] border border-[#EF4444]/30 rounded-xl text-center font-mono space-y-4 max-w-md mx-auto my-12 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto animate-bounce" />
          <h2 className="text-sm font-bold text-slate-100 uppercase">EDR Module Crash Recovered</h2>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            A rendering exception occurred inside the active EDR workspace. Null checks have isolated the thread.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-1.5 bg-black border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 text-[10px] rounded uppercase font-bold transition-all"
          >
            Reset Module Viewport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function EDRComponent({ edrUpdates, token }: any) {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [forensicTimeline, setForensicTimeline] = useState<any[]>([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  // Sync real-time updates from WebSocket EDR stats pump
  useEffect(() => {
    const updatesKeys = Object.keys(edrUpdates ?? {});
    if (updatesKeys.length > 0) {
      setDevices(prev => (prev ?? []).map(dev => {
        const update = edrUpdates[dev.hostname];
        if (update) {
          // If the selected device gets updated, update its metrics too
          if (selectedDevice && selectedDevice.hostname === dev.hostname) {
            setSelectedDevice((d: any) => d ? ({
              ...d,
              cpuUsage: update.cpuUsage,
              ramUsage: update.ramUsage,
              status: update.status
            }) : d);
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
        const arr = Array.isArray(data) ? data : [];
        setDevices(arr);
        if (arr.length > 0) {
          selectDevice(arr[0]);
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
    const isWindows = device?.hostname?.startsWith('WIN') || false;
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
        setDevices(prev => (prev ?? []).map(d => d.hostname === selectedDevice.hostname ? { ...d, status: data.status } : d));
        setSelectedDevice((d: any) => d ? ({ ...d, status: data.status }) : d);

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

  const renderProcessTree = () => {
    if (!selectedDevice) return null;
    const isWindows = selectedDevice.hostname?.startsWith('WIN') || false;

    return (
      <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-[11px] space-y-4 shadow-lg">
        <p className="text-[10px] uppercase text-slate-500 border-b border-white/5 pb-2 font-bold flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          Active EDR Process Tree Analysis
        </p>
        
        <div className="space-y-2 select-text leading-snug">
          {/* Node 1: Kernel Root */}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-700">├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>[PID 4]</span>
            <span className="text-slate-100 font-bold">{isWindows ? 'System' : 'systemd'}</span>
            <span className="text-[8px] bg-cyan-950/20 border border-cyan-500/20 px-1 text-cyan-400 uppercase font-bold rounded">SYSTEM PRIVILEGES</span>
          </div>

          {/* Node 2: System Subshell */}
          <div className="flex items-center gap-2 text-slate-400 pl-4">
            <span className="text-slate-700">│  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
            <span>[PID 144]</span>
            <span className="text-slate-200">{isWindows ? 'smss.exe' : 'kthreadd'}</span>
            <span className="text-[8px] text-slate-500 font-mono">/sys/kernel/root</span>
          </div>

          {/* Node 3: Core Service Spawning */}
          <div className="flex items-center gap-2 text-slate-400 pl-8">
            <span className="text-slate-700">│  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
            <span>[PID 820]</span>
            <span className="text-slate-200">{isWindows ? 'services.exe' : 'cron'}</span>
          </div>

          {/* Node 4: Running Endpoint App */}
          <div className="flex items-center gap-2 text-slate-400 pl-12">
            <span className="text-slate-700">│  │  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/50 shrink-0" />
            <span>[PID 1040]</span>
            <span className="text-slate-300 font-bold">{isWindows ? 'svchost.exe' : 'rsyslogd'}</span>
            <span className="text-[8px] bg-emerald-950/20 border border-emerald-500/20 px-1.5 text-emerald-400 uppercase font-mono font-bold leading-none rounded">Healthy</span>
          </div>

          {/* Node 5: Threat Process Anomaly Injection */}
          <div className="flex flex-col pl-16 border-l border-red-500/30 ml-1 py-1 space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <span className="text-slate-700">├─</span>
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
              <span>[PID 4212]</span>
              <span>powershell.exe</span>
              <span className="text-[8px] bg-red-950/40 border border-red-500/30 px-1.5 rounded uppercase text-red-400 font-bold">Threat Injected</span>
            </div>
            <div className="pl-6 text-[9.5px] text-slate-500 font-mono select-all truncate max-w-md" title="powershell.exe -ExecutionPolicy Bypass -enc SQBFAFgAIAAoAE4AZQB3AC0AT...">
              CMDLINE: powershell.exe -ExecutionPolicy Bypass -enc SQBFAFgAIAAoAE4AZQB3AC0AT...
            </div>
          </div>
        </div>
      </div>
    );
  };

  const devicesList = Array.isArray(devices) ? devices : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans select-none text-white">
      
      {/* 1. LEFT COLUMN: ENDPOINT REGISTRY LIST */}
      <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl lg:col-span-1 h-[650px] flex flex-col justify-between shadow-xl">
        <div>
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">EDR Endpoint Host Registry</span>
              <p className="text-[10px] text-slate-500 leading-tight font-mono">ACTIVE DOMAIN INVENTORIES</p>
            </div>
            <button 
              onClick={fetchDevices}
              className="bg-black border border-white/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
            >
              <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" style={{ animationDuration: '6s' }} />
              REFRESH
            </button>
          </div>

          {loading ? (
            <p className="text-xs font-mono text-slate-500 animate-pulse">Querying agent nodes registries...</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {(devicesList ?? []).map((dev, dIdx) => {
                const isActive = selectedDevice?.hostname === dev?.hostname;
                const isIsolated = dev?.status === 'Isolated';
                return (
                  <div 
                    key={dev?._id || dIdx}
                    onClick={() => selectDevice(dev)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-400 shadow-glow shadow-cyan-500/5' 
                        : 'bg-black/30 border-white/5 hover:bg-black/60 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Server className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-200">{dev?.hostname}</span>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 border rounded uppercase font-bold ${
                        isIsolated 
                          ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                          : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {dev?.status || 'Online'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono text-slate-400 leading-tight">
                      <div>IP Address: <span className="text-slate-350">{dev?.ip}</span></div>
                      <div>Memory Util: <span className="text-slate-350">{dev?.ramUsage || 35}%</span></div>
                    </div>
                  </div>
                );
              })}
              {devicesList.length === 0 && (
                <p className="text-slate-500 text-center py-20 font-mono text-[10px]">No registered endpoints detected.</p>
              )}
            </div>
          )}
        </div>

        {/* Local environment metrics summary */}
        <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>HOSTS: {devicesList.length} Monitored</span>
          <span>OFFLINE: 0 Nodes</span>
        </div>
      </div>

      {/* 2. RIGHT COLUMNS: PROCESS TREE & TELEMETRY PANELS */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {selectedDevice ? (
          <>
            {/* System detail dashboard */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">ACTIVE TARGET TELEMETRY</span>
                <h3 className="text-base font-bold text-slate-100 mt-1 uppercase">{selectedDevice?.hostname} Dashboard</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">IP: {selectedDevice?.ip}  |  OS: {selectedDevice?.os}</p>
              </div>

              {/* Isolation containment controls */}
              <div>
                {selectedDevice?.status === 'Isolated' ? (
                  <button 
                    onClick={() => handleIsolateAction('Reconnect')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold px-4 py-2 rounded-lg transition-colors uppercase shadow-md shadow-emerald-600/10"
                  >
                    RECONNECT NETWORK
                  </button>
                ) : (
                  <button 
                    onClick={() => handleIsolateAction('Isolate')}
                    className="bg-[#EF4444] hover:bg-red-700 text-white text-xs font-mono font-bold px-4 py-2 rounded-lg transition-colors uppercase animate-pulse shadow-md shadow-red-500/10"
                  >
                    CONTAIN & ISOLATE DEVICE
                  </button>
                )}
              </div>
            </div>

            {/* Metrics usage grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl flex items-center gap-3 shadow-lg">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">CPU Ingestion</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice?.cpuUsage || 12}%</p>
                  <div className="w-full bg-black h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedDevice?.cpuUsage || 12}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl flex items-center gap-3 shadow-lg">
                <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">RAM Allocation</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice?.ramUsage || 35}%</p>
                  <div className="w-full bg-black h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${selectedDevice?.ramUsage || 35}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Process tree visualizer widget */}
            {renderProcessTree()}

            {/* List process tables */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-[10px] space-y-3 shadow-xl">
              <p className="text-xs font-bold text-slate-200 uppercase flex items-center gap-2 pb-2 border-b border-white/5">
                <Server className="w-4 h-4 text-cyan-400" />
                Active Process Inventory List
              </p>
              <div className="overflow-x-auto select-text max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500 text-[8px] uppercase">
                      <th className="py-2 pr-4">PID</th>
                      <th className="py-2 pr-4">Process Name</th>
                      <th className="py-2">Executable Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {(selectedDevice?.processes ?? []).map((p: any, pIdx: number) => (
                      <tr key={pIdx} className="hover:bg-white/5">
                        <td className="py-2 pr-4 font-bold text-cyan-400">{p?.pid}</td>
                        <td className="py-2 pr-4 font-bold text-slate-200">{p?.name}</td>
                        <td className="py-2 text-slate-400 truncate max-w-xs" title={p?.path}>{p?.path || 'N/A'}</td>
                      </tr>
                    ))}
                    {(selectedDevice?.processes ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-500 italic">No processes logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Forensic logs stream */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl font-sans shadow-xl">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Device Forensic Log Audit Trail</span>
              <p className="text-[10px] text-slate-500 leading-tight font-mono mb-4">CHRONOLOGICAL EVENT TRIGGERS</p>

              <div className="space-y-2 select-text">
                {forensicTimeline.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-black/40 border border-white/5 rounded-lg font-mono text-[10px] flex gap-4 hover:border-cyan-500/10 transition-colors">
                    <span className="text-cyan-400 font-bold shrink-0">{item.timestamp}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-slate-200 font-bold uppercase">{item.event}</span>
                        <span className="text-[8px] bg-[#111827] border border-white/5 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">{item.category}</span>
                      </div>
                      <p className="text-slate-400 text-[9px]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs text-slate-500 shadow-xl">
            Select an active EDR device registry target from the inventory panel to view forensic structures.
          </div>
        )}

      </div>

    </div>
  );
}

export default function EDR(props: any) {
  return (
    <ErrorBoundary>
      <EDRComponent {...props} />
    </ErrorBoundary>
  );
}
