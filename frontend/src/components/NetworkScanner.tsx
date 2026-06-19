import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Play, Square, Server, Radio, Network, Terminal, Copy, Trash2, Cpu, Laptop, HardDrive, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { RootState } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const SCAN_PROFILES = [
  { id: 'quick', label: 'Quick Scan' },
  { id: 'full', label: 'Full Scan (All Ports)' },
  { id: 'stealth', label: 'Stealth Scan' },
  { id: 'aggressive', label: 'Aggressive Scan' },
  { id: 'os_detect', label: 'OS Detection' },
  { id: 'svc_version', label: 'Service Version Scan' },
  { id: 'vuln', label: 'Vulnerability Scan' }
];

interface LocalInfo {
  ip: string;
  mac: string;
  hostname: string;
  os: string;
  platform: string;
  arch: string;
}

export default function NetworkScanner() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [target, setTarget] = useState('127.0.0.1');
  const [profile, setProfile] = useState('quick');
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  
  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null);
  const [hosts, setHosts] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'ports' | 'topology' | 'details' | 'console'>('ports');
  const [expandedHosts, setExpandedHosts] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Fetch local system info on mount
  useEffect(() => {
    fetchLocalInfo();
  }, []);

  const fetchLocalInfo = async () => {
    try {
      const res = await fetch('/api/scan/localinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLocalInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch local scanner info', e);
    }
  };

  // Autoscroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle active socket registration when scan starts
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket || !scanId) return;

    const onOutput = (data: { line: string; ts: string }) => {
      setLogs(prev => [...prev, data.line]);
    };

    const onResults = (data: { hosts: any[]; ports: any[] }) => {
      setHosts(data.hosts || []);
      setPorts(data.ports || []);
      
      // Auto expand all hosts by default
      const expansions: Record<string, boolean> = {};
      (data.hosts || []).forEach((h: any) => {
        expansions[h.ip] = true;
      });
      setExpandedHosts(expansions);
    };

    const onDone = () => {
      setIsScanning(false);
      setScanId(null);
    };

    const onError = (data: { msg: string }) => {
      setLogs(prev => [...prev, `[ERROR] ${data.msg}`]);
      setIsScanning(false);
      setScanId(null);
    };

    socket.on(`scan:output:${scanId}`, onOutput);
    socket.on(`scan:results:${scanId}`, onResults);
    socket.on(`scan:done:${scanId}`, onDone);
    socket.on(`scan:error:${scanId}`, onError);

    return () => {
      socket.off(`scan:output:${scanId}`, onOutput);
      socket.off(`scan:results:${scanId}`, onResults);
      socket.off(`scan:done:${scanId}`, onDone);
      socket.off(`scan:error:${scanId}`, onError);
    };
  }, [scanId]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isScanning) return;

    setIsScanning(true);
    setHosts([]);
    setPorts([]);
    setLogs([`[ZENTRIX] Initialising scan grid target: ${target} [Profile: ${profile}]`]);
    setSelectedNode(null);

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target, profile })
      });
      const data = await res.json();
      if (res.ok && data.scanId) {
        setScanId(data.scanId);
      } else {
        setIsScanning(false);
        setLogs(prev => [...prev, `[ERROR] Failed to launch scan: ${data.error || 'Unknown response'}`]);
      }
    } catch (err: any) {
      setIsScanning(false);
      setLogs(prev => [...prev, `[ERROR] Network failure: ${err.message}`]);
    }
  };

  const handleCancelScan = async () => {
    if (!isScanning || !scanId) return;
    try {
      await fetch('/api/scan/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scanId })
      });
      setLogs(prev => [...prev, `[ZENTRIX] Cancellation command transmitted to scan process.`]);
    } catch (err: any) {
      setLogs(prev => [...prev, `[WARN] Failed to transmit cancellation: ${err.message}`]);
    }
    setIsScanning(false);
    setScanId(null);
  };

  const toggleHostExpand = (ip: string) => {
    setExpandedHosts(prev => ({ ...prev, [ip]: !prev[ip] }));
  };

  const copyConsoleLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
  };

  const clearConsoleLogs = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* 3.1 — System Info Bar */}
      {localInfo && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-[#0D1117] border border-cyan-500/20 rounded-lg text-[10px] font-mono shadow-md">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase">
            <Laptop className="w-3.5 h-3.5" />
            <span>[ 🖥 DEVICE ]</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>IP: <strong className="text-slate-200">{localInfo.ip}</strong></span>
            <span className="text-white/10">|</span>
            <span>MAC: <strong className="text-slate-200">{localInfo.mac}</strong></span>
            <span className="text-white/10">|</span>
            <span>HOST: <strong className="text-slate-200 uppercase">{localInfo.hostname}</strong></span>
            <span className="text-white/10">|</span>
            <span>OS: <strong className="text-slate-200">{localInfo.os}</strong></span>
          </div>
        </div>
      )}

      {/* Target Config Header Form */}
      <form onSubmit={handleStartScan} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-[#0D1117] border border-white/5 rounded-xl shadow-xl items-end relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
        
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Target Address Range</label>
          <input 
            type="text"
            required
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 192.168.1.1/24 or 127.0.0.1"
            className="w-full bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-cyan-400 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Scan Profile</label>
          <select 
            value={profile}
            onChange={e => setProfile(e.target.value)}
            className="w-full bg-[#111827] border border-white/10 px-2 py-2 text-xs font-mono text-slate-300 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
          >
            {SCAN_PROFILES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isScanning}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-mono font-bold uppercase transition-all shadow-md ${
              isScanning 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-900' 
                : 'bg-black border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 text-cyan-400 shadow-cyan-500/5 hover:shadow-cyan-500/10'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            type="button"
            onClick={handleCancelScan}
            disabled={!isScanning}
            className={`flex items-center justify-center p-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all border ${
              isScanning 
                ? 'border-red-500/50 text-red-500 bg-red-950/10 hover:bg-red-950/20' 
                : 'border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </form>

      {/* Dynamic Loader */}
      {isScanning && (
        <div className="w-full bg-[#0D1117] border border-cyan-500/20 p-3 rounded-lg flex items-center gap-4 shadow-inner">
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase animate-pulse">Scan Engine In Progress...</span>
          <div className="flex-1 bg-black h-2 rounded-full overflow-hidden relative">
            <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-full absolute left-0 top-0 animate-pulse transition-all"></div>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Hosts List Summary */}
        <div className="lg:col-span-1 p-5 bg-[#0D1117] border border-white/5 rounded-xl h-[calc(100vh-230px)] flex flex-col justify-between overflow-y-auto shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Discovered Targets</span>
            </div>
            
            <div className="space-y-2 select-text font-mono text-[10px] overflow-y-auto max-h-[calc(100vh-340px)]">
              {hosts.map((host, idx) => (
                <div key={idx} className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center hover:border-cyan-500/20 transition-all">
                  <div className="min-w-0">
                    <p className="text-slate-200 font-bold truncate">{host.host || host.ip}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{host.ip}</p>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold border ${
                    host.status === 'Up' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}>
                    {host.status}
                  </span>
                </div>
              ))}

              {hosts.length === 0 && (
                <div className="text-center py-20 text-slate-500 font-mono text-[10px] space-y-2">
                  <p>Grid node inactive.</p>
                  <p className="text-[8px] text-slate-600">Trigger scan payload above to audit network.</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 text-[9px] font-mono text-slate-500 flex justify-between items-center">
            <span>AUDIT SCOPE: NMAP</span>
            <span>HOSTS: {hosts.length}</span>
          </div>
        </div>

        {/* Right Side: Tab Viewport */}
        <div className="lg:col-span-3 bg-[#0D1117] border border-white/5 rounded-xl h-[calc(100vh-230px)] flex flex-col shadow-xl overflow-hidden">
          
          {/* Tabs bar header */}
          <div className="flex border-b border-white/5 bg-black/20 text-xs font-mono">
            <button 
              onClick={() => setActiveTab('ports')}
              className={`px-5 py-3 border-r border-white/5 transition-all ${
                activeTab === 'ports' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ports & Hosts
            </button>
            <button 
              onClick={() => setActiveTab('topology')}
              className={`px-5 py-3 border-r border-white/5 transition-all ${
                activeTab === 'topology' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Topology Mapping
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-5 py-3 border-r border-white/5 transition-all ${
                activeTab === 'details' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Host Profile Card
            </button>
            <button 
              onClick={() => setActiveTab('console')}
              className={`px-5 py-3 transition-all ${
                activeTab === 'console' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Console Output
            </button>
          </div>

          {/* Viewport contents */}
          <div className="flex-1 p-5 overflow-y-auto select-text font-mono text-xs relative">
            
            {/* Tab 1: Ports / Hosts Collapsible view */}
            {activeTab === 'ports' && (
              <div className="space-y-4">
                {hosts.map((host, hIdx) => {
                  const hostPorts = ports.filter(p => p.host === host.ip || p.host === host.host);
                  const isExpanded = expandedHosts[host.ip] !== false;

                  return (
                    <div key={hIdx} className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                      <div 
                        onClick={() => toggleHostExpand(host.ip)}
                        className="flex items-center justify-between p-3 bg-black/40 cursor-pointer hover:bg-black/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                          <span className="font-bold text-slate-200">{host.host || 'Unknown Host'}</span>
                          <span className="text-[10px] text-slate-500">({host.ip})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {host.os !== 'N/A' && <span className="text-[9px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{host.os}</span>}
                          <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/20 border border-cyan-500/20 px-2 py-0.5 rounded">
                            {hostPorts.length} Open Ports
                          </span>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <table className="w-full text-left border-collapse text-[11px] font-mono">
                              <thead>
                                <tr className="bg-black/20 text-slate-500 border-b border-white/5 text-[9px] uppercase">
                                  <th className="p-2.5">Port</th>
                                  <th className="p-2.5">Protocol</th>
                                  <th className="p-2.5">State</th>
                                  <th className="p-2.5">Service</th>
                                  <th className="p-2.5">Version Info</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-slate-300">
                                {hostPorts.map((port, pIdx) => {
                                  const [portNum, proto] = port.port.split('/');
                                  return (
                                    <tr key={pIdx} className="hover:bg-white/5 transition-colors">
                                      <td className="p-2.5 text-cyan-400 font-bold">{portNum}</td>
                                      <td className="p-2.5 text-slate-500 uppercase">{proto || 'tcp'}</td>
                                      <td className="p-2.5">
                                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold border uppercase ${
                                          port.state === 'open' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                            : port.state === 'filtered'
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                                        }`}>
                                          {port.state}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-slate-200">{port.service}</td>
                                      <td className="p-2.5 text-slate-400">{port.version || 'N/A'}</td>
                                    </tr>
                                  );
                                })}
                                {hostPorts.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                                      No open network ports discovered on this node.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {hosts.length === 0 && (
                  <div className="text-center py-24 text-slate-500">
                    No active scan targets found. Enter range and initiate scan.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Topology Visualizer */}
            {activeTab === 'topology' && (
              <div className="h-full flex flex-col justify-between items-center relative min-h-[calc(100vh-340px)]">
                {hosts.length > 0 ? (
                  <div className="relative w-full h-[calc(100vh-340px)] flex items-center justify-center bg-black/10 rounded-xl border border-white/5 overflow-hidden">
                    {/* Scanner Center Host */}
                    <div className="z-10 p-3 bg-black border border-cyan-500/40 rounded-lg text-cyan-400 text-center shadow-glow shadow-cyan-500/5 select-none cursor-pointer">
                      <Laptop className="w-5 h-5 text-cyan-400 mx-auto mb-1 animate-pulse" />
                      <p className="text-[8px] font-bold">LOCAL SCAN NODE</p>
                      <p className="text-[9px] font-bold text-slate-200">{localInfo?.ip || '127.0.0.1'}</p>
                    </div>

                    {/* Discovered host nodes positioned circularly */}
                    {hosts.map((host, idx) => {
                      const total = hosts.length;
                      const radius = 120;
                      const angle = (idx * 360) / total;
                      const radians = (angle * Math.PI) / 180;
                      const x = radius * Math.cos(radians);
                      const y = radius * Math.sin(radians);
                      const isNodeSelected = selectedNode?.ip === host.ip;

                      return (
                        <div key={idx} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {/* Radial connection lines */}
                          <svg className="absolute w-full h-full pointer-events-none z-0">
                            <line 
                              x1="50%" 
                              y1="50%" 
                              x2={`calc(50% + ${x}px)`} 
                              y2={`calc(50% + ${y}px)`} 
                              stroke={isNodeSelected ? 'rgba(0, 212, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)'}
                              strokeWidth={isNodeSelected ? 2 : 1}
                              strokeDasharray={isScanning ? '5,5' : '0'}
                              className={isScanning ? 'animate-pulse' : ''}
                            />
                          </svg>

                          {/* Node Elements */}
                          <div 
                            className={`pointer-events-auto absolute p-2 bg-[#0D1117] border rounded-lg text-center cursor-pointer transition-all hover:scale-105 z-10 ${
                              isNodeSelected 
                                ? 'border-cyan-500 shadow-glow shadow-cyan-500/10' 
                                : 'border-white/10 hover:border-cyan-500/30'
                            }`}
                            style={{ transform: `translate(${x}px, ${y}px)` }}
                            onClick={() => setSelectedNode(host)}
                          >
                            <Server className={`w-3.5 h-3.5 mx-auto mb-0.5 ${isNodeSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                            <p className="text-[7.5px] font-bold text-slate-200 truncate max-w-[80px]">{host.host || 'Host'}</p>
                            <p className="text-[7px] text-slate-500">{host.ip}</p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Node Click Details Panel overlay */}
                    {selectedNode && (
                      <div className="absolute right-4 bottom-4 w-52 bg-black/90 backdrop-blur-md border border-cyan-500/20 rounded-lg p-3 text-[10px] space-y-1.5 z-20">
                        <p className="text-xs font-bold text-cyan-400 border-b border-white/5 pb-1 uppercase">{selectedNode.host || 'Host'}</p>
                        <p className="text-slate-400">IP: <span className="text-slate-200">{selectedNode.ip}</span></p>
                        <p className="text-slate-400">MAC: <span className="text-slate-200">{selectedNode.mac}</span></p>
                        <p className="text-slate-400">OS: <span className="text-slate-200">{selectedNode.os}</span></p>
                        <p className="text-slate-400">Latency: <span className="text-emerald-400">{selectedNode.latency || 'N/A'}</span></p>
                        <p className="text-slate-400">Status: <span className="text-emerald-400 font-bold">UP</span></p>
                        <button 
                          onClick={() => setSelectedNode(null)}
                          className="w-full text-center py-1 mt-1 border border-white/5 hover:border-white/20 text-slate-500 hover:text-slate-300 rounded transition-colors text-[8px]"
                        >
                          Close Details
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-24 text-slate-500">
                    No hosts discovered. Map scanner above to populate visual mesh.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Host Details Grid */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {hosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hosts.map((host, idx) => {
                      const hostPorts = ports.filter(p => p.host === host.ip || p.host === host.host);
                      return (
                        <div key={idx} className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500/20"></div>
                          <div className="pl-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-slate-200 font-mono">{host.host || 'Discovered Target'}</h4>
                                <p className="text-[9px] text-slate-500 font-mono mt-0.5">{host.ip}</p>
                              </div>
                              <span className="text-[9px] text-cyan-400 font-bold bg-cyan-950/20 border border-cyan-500/20 px-2 py-0.5 rounded">
                                {hostPorts.length} PORTS
                              </span>
                            </div>
                            
                            <div className="mt-3 grid grid-cols-2 gap-y-2 text-[10px] text-slate-400 font-mono">
                              <div>
                                <span className="text-slate-600 block text-[8px] uppercase">MAC Address</span>
                                <span className="text-slate-200">{host.mac || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 block text-[8px] uppercase">Operating System</span>
                                <span className="text-slate-200 truncate block max-w-[130px]" title={host.os}>{host.os || 'Generic Linux/Windows'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 block text-[8px] uppercase">Latency</span>
                                <span className="text-emerald-400">{host.latency || '0.002s'}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 block text-[8px] uppercase">Scanner Target</span>
                                <span className="text-slate-200">Active</span>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-white/5">
                              <span className="text-slate-600 block text-[8px] uppercase mb-1">Open Badges</span>
                              <div className="flex flex-wrap gap-1">
                                {hostPorts.slice(0, 10).map((p, pIdx) => (
                                  <span key={pIdx} className="bg-black border border-white/10 px-1.5 py-0.5 rounded text-[8px] text-cyan-400">
                                    {p.port.split('/')[0]}
                                  </span>
                                ))}
                                {hostPorts.length > 10 && (
                                  <span className="bg-black border border-white/10 px-1.5 py-0.5 rounded text-[8px] text-slate-500">
                                    +{hostPorts.length - 10} more
                                  </span>
                                )}
                                {hostPorts.length === 0 && (
                                  <span className="text-[8px] text-slate-600 italic">No open ports</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-24 text-slate-500">
                    No target details compiled. Execute scan task first.
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Monaco Console Output Log */}
            {activeTab === 'console' && (
              <div className="flex flex-col h-full space-y-3 min-h-[calc(100vh-340px)]">
                {/* Console action bar */}
                <div className="flex justify-between items-center bg-black/40 border border-white/5 rounded-lg px-4 py-2 text-[10px]">
                  <span className="font-bold text-slate-500 uppercase">Interactive Log Stream</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyConsoleLogs}
                      className="flex items-center gap-1 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/20 px-2 py-1 bg-black rounded transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <button 
                      onClick={clearConsoleLogs}
                      className="flex items-center gap-1 hover:text-red-400 border border-white/5 hover:border-red-500/20 px-2 py-1 bg-black rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-black p-4 border border-white/5 rounded-xl text-[10.5px] leading-relaxed h-[calc(100vh-380px)] overflow-y-auto font-mono text-slate-300 select-text">
                  {logs.map((log, idx) => {
                    let textClass = 'text-slate-400';
                    if (log.includes('open')) textClass = 'text-emerald-400 font-bold';
                    else if (log.includes('filtered')) textClass = 'text-amber-400';
                    else if (log.includes('closed')) textClass = 'text-slate-600';
                    else if (log.includes('WARN') || log.includes('[ERROR]') || log.includes('failed')) textClass = 'text-red-400 font-bold';
                    else if (log.includes('Nmap scan report') || log.includes('Nmap done')) textClass = 'text-cyan-400 font-bold';

                    return (
                      <div key={idx} className={`${textClass} whitespace-pre-wrap`}>
                        {log}
                      </div>
                    );
                  })}
                  {isScanning && (
                    <div className="animate-pulse text-cyan-400 font-bold mt-2">
                      &gt; Listening for incoming port diagnostics...
                    </div>
                  )}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
