import { useState, useEffect } from 'react';
import { Radio, Terminal, Server, ShieldAlert, Cpu, Network, Globe } from 'lucide-react';

export default function Honeypot({ honeypotUpdates, token }: any) {
  const [consoleEntries, setConsoleEntries] = useState<any[]>([]);
  const [attackerActivity, setAttackerActivity] = useState<any[]>([]);

  // Sync real-time updates from WebSockets honeypot simulation
  useEffect(() => {
    if (honeypotUpdates.length > 0) {
      const latest = honeypotUpdates[0];
      
      // Update terminal console entries
      setConsoleEntries(prev => [
        ...prev,
        { type: 'input', text: `root@web-sandbox-01:~# ${latest.command}` },
        { type: 'output', text: latest.output }
      ].slice(-60)); // Keep last 60 lines

      // Update activity logs table
      setAttackerActivity(prev => [latest, ...prev].slice(0, 40));
    } else {
      seedInitialHoneypotData();
    }
  }, [honeypotUpdates]);

  const seedInitialHoneypotData = () => {
    // Standard terminal seed
    setConsoleEntries([
      { type: 'input', text: 'root@web-sandbox-01:~# whoami' },
      { type: 'output', text: 'root' },
      { type: 'input', text: 'root@web-sandbox-01:~# uname -a' },
      { type: 'output', text: 'Linux web-sandbox-01 5.4.0-74-generic #83-Ubuntu SMP Wed May 13 23:52:18 UTC' }
    ]);

    setAttackerActivity([
      { timestamp: new Date(), attackerIp: '185.220.101.5', country: 'Netherlands', command: 'whoami', output: 'root' },
      { timestamp: new Date(Date.now() - 60000), attackerIp: '45.146.165.34', country: 'Russia', command: 'uname -a', output: 'Linux...' }
    ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT SIDEBAR: ATTACKER GEOGRAPHY PROFILE */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Honeypot Attacker Coordinates</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">INTELLIGENCE BLOCKLISTS</p>
            </div>
          </div>

          {/* Table of active connections */}
          <div className="space-y-3 font-mono text-[9px] text-slate-400">
            <span className="text-[10px] font-sans font-bold text-slate-300">Live Scanners Registry</span>
            <div className="space-y-2 select-text">
              {[
                { ip: '185.220.101.5', origin: 'Netherlands', hits: 142, port: 22 },
                { ip: '45.146.165.34', origin: 'Russia', hits: 98, port: 22 },
                { ip: '194.26.135.10', origin: 'Russia', hits: 76, port: 23 },
                { ip: '89.248.167.142', origin: 'Netherlands', hits: 43, port: 22 }
              ].map((attacker, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-900 rounded flex justify-between items-center">
                  <div>
                    <p className="text-slate-200 font-bold">{attacker.ip}</p>
                    <p className="text-[8px] mt-0.5 text-slate-500">COUNTRY: {attacker.origin}  |  PORT: {attacker.port}</p>
                  </div>
                  <span className="bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded text-red-400 font-bold">{attacker.hits} scans</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>PORT STATUS: 22/SSH 23/TELNET Active</span>
        </div>
      </div>

      {/* 2. RIGHT COLUMNS: TERMINAL & ACTIVITY STREAM */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {/* Hacker live typing terminal console */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col h-[320px] font-mono select-text">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Attacker Command Console (Decoy Environment)</span>
            </div>
            <div className="bg-[#050811] px-2 py-1 border border-slate-850 rounded text-[9px] text-[#64748b]">
              FEED: <span className="text-emerald-400 font-bold animate-pulse">STREAMING</span>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 p-4 border border-slate-900 rounded overflow-y-auto font-mono text-[10px] text-emerald-400 leading-relaxed max-h-[220px]">
            {consoleEntries.map((line, idx) => (
              <div 
                key={idx} 
                className={`whitespace-pre-wrap ${
                  line.type === 'input' ? 'text-slate-100 font-bold' : 'text-emerald-400 pl-4 bg-slate-950/30 py-0.5'
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>

        {/* Honeypot events timeline table */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Decoy System Telemetry Stream</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">INGEST LOGS CHRONOLOGY</p>
          </div>

          <div className="overflow-x-auto select-text">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase font-mono text-[9px]">
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Source Scanner</th>
                  <th className="p-2">Country</th>
                  <th className="p-2">Intercepted Hacker input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {attackerActivity.map((act, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-2 text-slate-500 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2 text-slate-300 font-bold whitespace-nowrap">{act.attackerIp}</td>
                    <td className="p-2 text-slate-400 whitespace-nowrap">{act.country}</td>
                    <td className="p-2 text-slate-200 truncate max-w-xs">{act.command}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
