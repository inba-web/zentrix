import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Cpu, Server, ShieldAlert, Activity, Network, FileCode, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any) {
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

function EDRComponent({ token }: any) {
  // Derive devices list directly from Redux — always fresh, never stale
  const edrUpdates = useSelector((state: RootState) => state.edr.edrUpdates);

  // Track selected device by hostname (string key), not object reference
  const [selectedHostname, setSelectedHostname] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forensicTimeline, setForensicTimeline] = useState<any[]>([]);

  // Convert edrUpdates map to sorted array; merge with full device records fetched from API
  const [deviceRecords, setDeviceRecords] = useState<Record<string, any>>({});
  const [deviceHistory, setDeviceHistory] = useState<any[]>([]);

  // Derive selectedDevice from merged map so it's always live
  const mergedDevices: any[] = Object.keys(deviceRecords).map(hostname => {
    const base = deviceRecords[hostname] ?? {};
    const live = edrUpdates[hostname] ?? {};
    return {
      ...base,
      ...live,
      hostname,
      cpuUsage: live.cpuUsage ?? base.cpuUsage ?? 0,
      ramUsage: live.ramUsage ?? base.ramUsage ?? 0,
      status: live.status ?? base.status ?? 'Online',
      processes: base.processes ?? [],
      networkConnections: base.networkConnections ?? []
    };
  });

  const selectedDevice = mergedDevices.find(d => d.hostname === selectedHostname) ?? null;

  // Track telemetry history for the selected EDR device
  useEffect(() => {
    if (selectedDevice) {
      const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
      setDeviceHistory(prev => {
        const filtered = prev.filter(p => p.hostname === selectedDevice.hostname);
        const newPoint = {
          time: timestamp,
          cpu: selectedDevice.cpuUsage ?? 0,
          ram: selectedDevice.ramUsage ?? 0,
          hostname: selectedDevice.hostname
        };
        return [...filtered, newPoint].slice(-30);
      });
    } else {
      setDeviceHistory([]);
    }
  }, [selectedDevice?.cpuUsage, selectedDevice?.ramUsage, selectedDevice?.hostname]);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/edr/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const arr: any[] = Array.isArray(data) ? data : [];
        const map: Record<string, any> = {};
        arr.forEach(dev => {
          if (dev?.hostname) map[dev.hostname] = dev;
        });
        setDeviceRecords(map);
        // Auto-select first device if none selected
        if (!selectedHostname && arr.length > 0) {
          setSelectedHostname(arr[0].hostname);
          seedForensicTimeline(arr[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedHostname]);

  useEffect(() => {
    fetchDevices();
  }, []);



  const seedForensicTimeline = (device: any) => {
    const isWindows = device?.hostname?.startsWith('WIN') || false;
    setForensicTimeline([
      { timestamp: '19:12:01', event: 'Process Spawned: services.exe', category: 'Process', desc: 'PID 820 system process execution.' },
      { timestamp: '19:12:05', event: 'TCP socket bind on port 445', category: 'Network', desc: 'Binds listening network connector.' },
      { timestamp: '19:13:20', event: isWindows ? 'Registry RunKey modified: HKLM\\Software\\Updater' : 'File written in directory /etc/cron.d/updater', category: 'Persistence', desc: 'Persistence installation mechanism logged.' },
      { timestamp: '19:14:12', event: isWindows ? 'svchost.exe loaded cryptbase.dll' : 'sshd spawned child bash environment', category: 'System', desc: 'Process DLL handles updates mapping.' },
      { timestamp: '19:14:45', event: 'Outbound proxy telemetry handshake', category: 'Network', desc: 'Outgoing session telemetry dispatched.' },
    ]);
  };

  const selectDevice = (device: any) => {
    if (!device?.hostname) return;
    setSelectedHostname(device.hostname);
    seedForensicTimeline(device);
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
        // Update local record so UI reflects change immediately
        setDeviceRecords(prev => ({
          ...prev,
          [selectedDevice.hostname]: { ...prev[selectedDevice.hostname], status: data.status }
        }));

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
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-700">├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>[PID 4]</span>
            <span className="text-slate-100 font-bold">{isWindows ? 'System' : 'systemd'}</span>
            <span className="text-[8px] bg-cyan-950/20 border border-cyan-500/20 px-1 text-cyan-400 uppercase font-bold rounded">SYSTEM PRIVILEGES</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 pl-4">
            <span className="text-slate-700">│  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
            <span>[PID 144]</span>
            <span className="text-slate-200">{isWindows ? 'smss.exe' : 'kthreadd'}</span>
            <span className="text-[8px] text-slate-500 font-mono">/sys/kernel/root</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 pl-8">
            <span className="text-slate-700">│  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
            <span>[PID 820]</span>
            <span className="text-slate-200">{isWindows ? 'services.exe' : 'cron'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 pl-12">
            <span className="text-slate-700">│  │  │  ├─</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-500/50 shrink-0" />
            <span>[PID 1040]</span>
            <span className="text-slate-300 font-bold">{isWindows ? 'svchost.exe' : 'rsyslogd'}</span>
            <span className="text-[8px] bg-emerald-950/20 border border-emerald-500/20 px-1.5 text-emerald-400 uppercase font-mono font-bold leading-none rounded">Healthy</span>
          </div>

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans select-none text-white">
      
      {/* 1. LEFT COLUMN: ENDPOINT REGISTRY LIST */}
      <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl lg:col-span-1 h-[calc(100vh-140px)] flex flex-col justify-between shadow-xl">
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
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
              {mergedDevices.map((dev, dIdx) => {
                const isActive = selectedHostname === dev?.hostname;
                const isIsolated = dev?.status === 'Isolated';
                return (
                  <div 
                    key={dev?.hostname || dIdx}
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
                      <div>IP Address: <span className="text-slate-300">{dev?.ip || '127.0.0.1'}</span></div>
                      <div>Memory Util: <span className="text-slate-300">{dev?.ramUsage ?? 0}%</span></div>
                    </div>
                  </div>
                );
              })}
              {mergedDevices.length === 0 && (
                <p className="text-slate-500 text-center py-20 font-mono text-[10px]">No registered endpoints detected.</p>
              )}
            </div>
          )}
        </div>

        {/* Local environment metrics summary */}
        <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>HOSTS: {mergedDevices.length} Monitored</span>
          <span>OFFLINE: {mergedDevices.filter(d => d?.status === 'Isolated').length} Isolated</span>
        </div>
      </div>

      {/* 2. RIGHT COLUMNS: PROCESS TREE & TELEMETRY PANELS */}
      <div className="lg:col-span-2 space-y-6 h-[calc(100vh-140px)] overflow-y-auto pr-1">
        
        {selectedDevice ? (
          <>
            {/* System detail dashboard */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">ACTIVE TARGET TELEMETRY</span>
                <h3 className="text-base font-bold text-slate-100 mt-1 uppercase">{selectedDevice?.hostname} Dashboard</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">IP: {selectedDevice?.ip || '127.0.0.1'}  |  OS: {selectedDevice?.os || 'Unknown'}</p>
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
                    CONTAIN &amp; ISOLATE DEVICE
                  </button>
                )}
              </div>
            </div>

            {/* Metrics usage grids — live values from Redux */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl flex items-center gap-3 shadow-lg">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">CPU Ingestion</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice?.cpuUsage ?? 0}%</p>
                  <div className="w-full bg-black h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selectedDevice?.cpuUsage ?? 0, 100)}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl flex items-center gap-3 shadow-lg">
                <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-mono text-slate-500">RAM Allocation</p>
                  <p className="text-base font-bold text-slate-200 mt-0.5">{selectedDevice?.ramUsage ?? 0}%</p>
                  <div className="w-full bg-black h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(selectedDevice?.ramUsage ?? 0, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Virtual Real-time Graph for EDR Endpoint */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col h-64 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">System Monitor Health Graph</span>
                  <p className="text-[9px] text-slate-500 font-mono">REAL-TIME CPU &amp; RAM INGESTION FOR {selectedDevice.hostname}</p>
                </div>
              </div>
              <div className="flex-1 min-h-0 w-full text-[9px] font-mono">
                {deviceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={deviceHistory} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="edrCpuGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="edrRamGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00FF87" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#00FF87" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 8 }} />
                      <YAxis stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 8 }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px' }}
                        labelStyle={{ color: '#71717a', fontFamily: 'monospace' }}
                        itemStyle={{ fontFamily: 'monospace' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="cpu" stroke="#00D4FF" strokeWidth={2} fillOpacity={1} fill="url(#edrCpuGrad)" name="CPU Usage %" isAnimationActive={true} />
                      <Area type="monotone" dataKey="ram" stroke="#00FF87" strokeWidth={1.5} fillOpacity={1} fill="url(#edrRamGrad)" name="RAM Usage %" isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center pt-20 font-mono">Aggregating telemetry signals...</p>
                )}
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
