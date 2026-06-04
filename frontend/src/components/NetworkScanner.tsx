import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Shield, Play, Square, Server, Radio, Network, HelpCircle, HardDrive, ListFilter } from 'lucide-react';
import { RootState, startScan, updateScanProgress, completeScan, setScannerState } from '../store';

const SCAN_PROFILES = ['Quick Scan', 'Full Scan', 'Aggressive Scan', 'Custom Scan'];

export default function NetworkScanner() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const scanner = useSelector((state: RootState) => state.scanner);

  const [target, setTarget] = useState(scanner.target);
  const [profile, setProfile] = useState(scanner.profile);
  const [activeTab, setActiveTab] = useState<'output' | 'ports' | 'topology' | 'details'>('output');

  // Listen to WebSocket events for real-time progress
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleProgress = (data: { scanId: string; progress: number; log?: string }) => {
      dispatch(updateScanProgress(data));
    };

    const handleComplete = (data: { scanId: string; hosts: any[]; ports: any[]; logs: string[] }) => {
      dispatch(completeScan(data));
    };

    socket.on('scan_progress', handleProgress);
    socket.on('scan_complete', handleComplete);

    return () => {
      socket.off('scan_progress', handleProgress);
      socket.off('scan_complete', handleComplete);
    };
  }, [dispatch]);

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scanner.isScanning) return;

    dispatch(startScan({ target, profile }));

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
      if (!res.ok) {
        dispatch(setScannerState({ isScanning: false, outputLogs: [`[ERROR] Failed to start scan: ${data.error}`] }));
      }
    } catch {
      dispatch(setScannerState({ isScanning: false, outputLogs: ['[ERROR] Network error connecting to scan engine.'] }));
    }
  };

  const handleCancelScan = async () => {
    if (!scanner.isScanning) return;

    try {
      await fetch('/api/scan/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target })
      });
    } catch {}

    dispatch(setScannerState({ isScanning: false, progress: 0, outputLogs: [...scanner.outputLogs, '[NMAP] Scan execution cancelled by administrator.'] }));
  };

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* Target config Header */}
      <form onSubmit={handleStartScan} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-cyber-card border border-cyber-border rounded-lg shadow-lg items-end">
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Target Address Range</label>
          <input 
            type="text"
            required
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="e.g. 192.168.1.1/24 or localhost"
            className="w-full bg-black border border-cyber-border px-3 py-2 text-xs font-mono text-cyber-primary rounded focus:outline-none focus:border-cyber-primary"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Scan Profile</label>
          <select 
            value={profile}
            onChange={e => setProfile(e.target.value)}
            className="w-full bg-black border border-cyber-border px-2 py-2 text-xs font-mono text-slate-305 rounded focus:outline-none focus:border-cyber-primary"
          >
            {SCAN_PROFILES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={scanner.isScanning}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded text-xs font-mono font-bold uppercase transition-all shadow-md ${
              scanner.isScanning 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-900' 
                : 'bg-black border border-cyber-primary hover:border-cyber-accent text-cyber-primary hover:text-cyber-accent'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            type="button"
            onClick={handleCancelScan}
            disabled={!scanner.isScanning}
            className={`flex items-center justify-center p-2 rounded text-xs font-mono font-bold uppercase transition-all border ${
              scanner.isScanning 
                ? 'border-red-500/50 text-red-500 hover:bg-red-950/20' 
                : 'border-zinc-800 text-zinc-650 cursor-not-allowed'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Progress Bar */}
      {scanner.isScanning && (
        <div className="w-full bg-cyber-card border border-cyber-border p-3 rounded-lg flex items-center gap-4">
          <span className="text-[10px] font-mono text-cyber-primary font-bold uppercase">Scanning: {scanner.progress}%</span>
          <div className="flex-1 bg-black h-2 rounded overflow-hidden">
            <div className="bg-cyber-primary h-full transition-all duration-300" style={{ width: `${scanner.progress}%` }}></div>
          </div>
        </div>
      )}

      {/* Main Scanner Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar lists of detected hosts */}
        <div className="lg:col-span-1 p-5 bg-cyber-card border border-cyber-border rounded-lg h-[500px] flex flex-col justify-between overflow-y-auto shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyber-primary" />
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Discovered Hosts</span>
            </div>
            
            <div className="space-y-2 select-text font-mono text-[10px]">
              {scanner.hosts.map((host, idx) => (
                <div key={idx} className="p-2.5 bg-black border border-cyber-border rounded flex justify-between items-center">
                  <div>
                    <p className="text-slate-200 font-bold">{host.ip}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{host.mac}</p>
                  </div>
                  <span className="bg-cyber-primary/10 border border-cyber-primary/20 px-1.5 py-0.5 rounded text-cyber-primary text-[8px] font-bold">
                    {host.status}
                  </span>
                </div>
              ))}

              {scanner.hosts.length === 0 && (
                <p className="text-slate-500 text-center py-10">No hosts mapped yet.</p>
              )}
            </div>
          </div>

          <div className="border-t border-cyber-border pt-3 text-[9px] font-mono text-slate-500">
            <span>DISCOVERY METRICS: Ping/Stealth</span>
          </div>
        </div>

        {/* Tab content area */}
        <div className="lg:col-span-3 bg-cyber-card border border-cyber-border rounded-lg h-[500px] flex flex-col shadow-lg">
          
          {/* Tabs bar */}
          <div className="flex border-b border-cyber-border bg-black/40 text-xs font-mono">
            <button 
              onClick={() => setActiveTab('output')}
              className={`px-5 py-3 border-r border-cyber-border transition-all ${
                activeTab === 'output' ? 'bg-cyber-card text-cyber-primary font-bold border-b border-b-cyber-primary' : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              Nmap Output
            </button>
            <button 
              onClick={() => setActiveTab('ports')}
              className={`px-5 py-3 border-r border-cyber-border transition-all ${
                activeTab === 'ports' ? 'bg-cyber-card text-cyber-primary font-bold border-b border-b-cyber-primary' : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              Ports / Hosts
            </button>
            <button 
              onClick={() => setActiveTab('topology')}
              className={`px-5 py-3 border-r border-cyber-border transition-all ${
                activeTab === 'topology' ? 'bg-cyber-card text-cyber-primary font-bold border-b border-b-cyber-primary' : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              Topology
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-5 py-3 transition-all ${
                activeTab === 'details' ? 'bg-cyber-card text-cyber-primary font-bold border-b border-b-cyber-primary' : 'text-slate-400 hover:text-slate-250'
              }`}
            >
              Host Details
            </button>
          </div>

          {/* Viewports */}
          <div className="flex-1 p-5 overflow-y-auto select-text font-mono text-xs">
            
            {activeTab === 'output' && (
              <div className="bg-black p-4 border border-cyber-border rounded text-[11px] text-cyber-primary leading-relaxed h-full overflow-y-auto font-mono max-h-[380px]">
                {scanner.outputLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">{log}</div>
                ))}
                {scanner.isScanning && (
                  <div className="animate-pulse text-cyber-accent">Scanning address grid...</div>
                )}
              </div>
            )}

            {activeTab === 'ports' && (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black text-slate-500 border-b border-cyber-border uppercase text-[9px]">
                      <th className="p-2.5">Port</th>
                      <th className="p-2.5">State</th>
                      <th className="p-2.5">Service</th>
                      <th className="p-2.5">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-border text-slate-300">
                    {scanner.ports.map((port, idx) => (
                      <tr key={idx} className="hover:bg-black/40">
                        <td className="p-2.5 text-cyber-primary font-bold">{port.port}</td>
                        <td className="p-2.5 uppercase font-bold">
                          <span className={`px-2 py-0.5 rounded text-[9px] ${
                            port.state === 'open' ? 'bg-cyber-primary/10 border border-cyber-primary/20 text-cyber-primary' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                          }`}>
                            {port.state}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200">{port.service}</td>
                        <td className="p-2.5 text-slate-450">{port.version}</td>
                      </tr>
                    ))}
                    {scanner.ports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500">
                          Launch a scan profile to map target ports.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'topology' && (
              <div className="flex flex-col justify-center items-center h-full">
                {scanner.hosts.length > 0 ? (
                  <div className="relative w-80 h-80 flex items-center justify-center border border-cyber-border/40 rounded-full bg-black/20">
                    {/* Scanner Host Center */}
                    <div className="z-10 p-3 bg-black border border-cyber-primary rounded-lg text-cyber-primary text-center">
                      <p className="text-[8px] font-bold">LOCAL WORKSTATION</p>
                      <p className="text-[9px] font-bold">127.0.0.1</p>
                    </div>

                    {/* Dotted Connections lines */}
                    <div className="absolute w-full h-[1px] bg-dashed bg-cyber-primary/20 border-t border-dashed border-cyber-primary/30"></div>
                    <div className="absolute h-full w-[1px] bg-dashed bg-cyber-primary/20 border-l border-dashed border-cyber-primary/30"></div>

                    {/* Discovered host nodes around */}
                    {scanner.hosts.map((host, idx) => {
                      const angle = (idx * 360) / scanner.hosts.length;
                      const rad = (angle * Math.PI) / 180;
                      const x = Math.round(110 * Math.cos(rad));
                      const y = Math.round(110 * Math.sin(rad));
                      return (
                        <div 
                          key={idx}
                          className="absolute p-2 bg-black border border-cyber-accent rounded text-[8px] text-cyber-accent text-center transition-all hover:scale-105"
                          style={{ transform: `translate(${x}px, ${y}px)` }}
                        >
                          <p className="font-bold">{host.host}</p>
                          <p className="font-mono">{host.ip}</p>
                          <p className="text-[7px] text-slate-500">{host.os}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500">Scan details required to build network topology mapping.</p>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="space-y-4">
                {scanner.hosts.map((host, idx) => (
                  <div key={idx} className="p-4 bg-black border border-cyber-border rounded space-y-2">
                    <p className="text-cyber-primary font-bold">Host: {host.host}</p>
                    <table className="w-full text-xs text-slate-400">
                      <tbody>
                        <tr className="border-b border-cyber-border/40"><td className="py-1.5 font-bold text-slate-500">IP Address</td><td className="text-slate-200">{host.ip}</td></tr>
                        <tr className="border-b border-cyber-border/40"><td className="py-1.5 font-bold text-slate-500">MAC Address</td><td className="text-slate-200">{host.mac}</td></tr>
                        <tr className="border-b border-cyber-border/40"><td className="py-1.5 font-bold text-slate-500">Operating System</td><td className="text-slate-200">{host.os}</td></tr>
                        <tr className="border-b border-cyber-border/40"><td className="py-1.5 font-bold text-slate-500">System Latency</td><td className="text-slate-200">{host.latency}</td></tr>
                        <tr><td className="py-1.5 font-bold text-slate-500">Discovery Protocol</td><td className="text-slate-200">ICMP Stealth Ping</td></tr>
                      </tbody>
                    </table>
                  </div>
                ))}

                {scanner.hosts.length === 0 && (
                  <p className="text-slate-500 text-center py-10">No host details available.</p>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
