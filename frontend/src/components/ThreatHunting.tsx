import { useState } from 'react';
import { Search, Compass, Terminal, Cpu, Play, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ThreatHunting({ token }: any) {
  const [huntQuery, setHuntQuery] = useState('source="AuthLog" | stats count by user');
  const [huntResults, setHuntResults] = useState<any[] | null>(null);
  const [huntStats, setHuntStats] = useState<any[] | null>(null);
  const [huntError, setHuntError] = useState('');
  const [loading, setLoading] = useState(false);

  const huntingPlaybooks = [
    {
      name: 'Detect SSH Brute Force Scans',
      description: 'Scans for anomalous authentication failures from external IP sources.',
      query: 'source="AuthLog" | where severity="CRITICAL" | stats count by user',
      mitre: 'Credential Access (T1110)'
    },
    {
      name: 'Detect Windows Registry Persistence Autostarts',
      description: 'Scans Windows registry telemetry for autostart configurations.',
      query: 'message="RunKey" | stats count by host',
      mitre: 'Persistence (T1547)'
    },
    {
      name: 'Detect Active Directory Shadow Copy dumping',
      description: 'Identifies volume shadow copy operations attempting credential exfiltration.',
      query: 'message="vssadmin" | limit 10',
      mitre: 'OS Credential Dumping (T1003)'
    },
    {
      name: 'PowerShell Encoded Script Execution',
      description: 'Scans process telemetry for hidden base64 scripts commands execution.',
      query: 'source="Sysmon" | where severity="CRITICAL" | limit 5',
      mitre: 'Command & Scripting Interpreter (T1059)'
    }
  ];

  const executeHunt = async (queryToRun: string) => {
    setLoading(true);
    setHuntError('');
    setHuntResults(null);
    setHuntStats(null);
    
    try {
      const res = await fetch('/api/siem/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryToRun })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.statistics) {
          setHuntStats(data.statistics);
        } else {
          setHuntResults(data.results);
        }
      } else {
        setHuntError(data.error || 'Failed executing hunt script.');
      }
    } catch {
      setHuntError('Hunting gateway connectivity timeout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT SIDEBAR: HUNT TEMPLATES MAPPING */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Hunting Playbooks Directory</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">MITRE ATT&CK MAPPED TACTICS</p>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {huntingPlaybooks.map((p, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setHuntQuery(p.query);
                  executeHunt(p.query);
                }}
                className="p-3 bg-[#0a0f1d]/50 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 hover:bg-slate-900/60 transition-all space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-200">{p.name}</span>
                </div>
                <p className="text-[10px] text-[#64748b] leading-relaxed leading-snug">{p.description}</p>
                <div className="flex justify-between items-center text-[8px] font-mono border-t border-slate-800/80 pt-2 text-[#64748b]">
                  <span>MITRE:</span>
                  <span className="text-amber-400 font-bold uppercase">{p.mitre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>HUNT TEMPLATES: {huntingPlaybooks.length} Active Profiles</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: HIERARCHICAL QUERY WORKSPACE & TIMELINES */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {/* Advanced Query workbench */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-500" />
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Threat Hunting Workspace</span>
          </div>

          <div className="space-y-3">
            <textarea 
              value={huntQuery}
              onChange={e => setHuntQuery(e.target.value)}
              className="w-full h-24 bg-[#050811] border border-slate-700 p-3 text-xs font-mono text-slate-200 rounded focus:outline-none focus:border-blue-500 resize-none select-text"
              placeholder='Write SPL search directives e.g. source="Sysmon" | where severity="CRITICAL" | limit 10'
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => executeHunt(huntQuery)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold px-4 py-2 rounded transition-all uppercase flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {loading ? 'EXECUTING HUNT...' : 'EXECUTE HUNT SYSTEM SCAN'}
              </button>
            </div>
          </div>

          {huntError && (
            <div className="p-2 bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono rounded">
              SYNTAX EXCEPTION: {huntError}
            </div>
          )}
        </div>

        {/* Dynamic Chronological Investigation Timelines */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Investigation Chronological Timeline</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">CORRELATED SUSPICIOUS OCCURRENCES</p>
          </div>

          {huntStats && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {huntStats.map((s, idx) => (
                <div key={idx} className="p-3 bg-[#0a0f1d]/50 border border-slate-800 rounded">
                  <span className="text-slate-500 uppercase text-[8px]">AGGREGATOR:</span>
                  <p className="text-slate-200 font-bold mt-1 text-sm">{s.name}</p>
                  <p className="text-blue-400 font-bold text-xs mt-1.5">{s.count} occurrence matches</p>
                </div>
              ))}
            </div>
          )}

          {huntResults && (
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
              {huntResults.map((log, idx) => (
                <div key={idx} className="pl-8 relative flex gap-3 text-xs font-mono">
                  {/* Timeline bullet dot */}
                  <span className="w-2.5 h-2.5 bg-blue-500 border border-slate-900 rounded-full absolute left-2 top-1.5"></span>
                  
                  <div className="flex-1 p-3 bg-slate-950/60 border border-slate-900 rounded space-y-1.5 select-text">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                      <span>TIME: {new Date(log.timestamp).toISOString()}</span>
                      <span className="text-blue-400 font-bold">HOST: {log.host}</span>
                    </div>
                    <p className="text-slate-200 font-bold uppercase">{log.source} - Log Ingestion</p>
                    <p className="text-slate-300 text-[10px] leading-relaxed bg-[#050811] p-2 border border-slate-900 rounded">{log.message}</p>
                  </div>
                </div>
              ))}

              {huntResults.length === 0 && (
                <p className="text-center text-slate-500 font-mono py-8">Zero anomalous entities matched query bounds.</p>
              )}
            </div>
          )}

          {!huntResults && !huntStats && (
            <div className="text-center text-slate-500 font-mono py-12 border border-dashed border-slate-800 rounded">
              Launch threat hunting query to construct correlated investigation timeline feeds.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
