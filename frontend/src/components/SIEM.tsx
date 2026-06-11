import React, { useState, useEffect } from 'react';
import { Terminal, Search, ChevronRight, Filter, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught a SIEM render crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0D1117] border border-[#EF4444]/30 rounded-xl text-center font-mono space-y-4 max-w-md mx-auto my-12 shadow-2xl text-white">
          <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto animate-bounce" />
          <h2 className="text-sm font-bold uppercase">SIEM Monitor Crash Recovered</h2>
          <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
            A rendering exception occurred inside the live SIEM logs pipeline.
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-1.5 bg-black border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 text-[10px] rounded uppercase font-bold transition-all"
          >
            Reset Ingestion Viewport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SIEMComponent({ websocketLogs, token }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  
  // KQL search engine states
  const [kqlQuery, setKqlQuery] = useState('source="Sysmon" | limit 20');
  const [kqlResults, setKqlResults] = useState<any[] | null>(null);
  const [kqlStats, setKqlStats] = useState<any[] | null>(null);
  const [kqlError, setKqlError] = useState('');
  const [kqlLoading, setKqlLoading] = useState(false);

  // Selected Log Drawer
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Sync WebSocket logs safely
  useEffect(() => {
    fetchLogs();
  }, [websocketLogs]);

  const fetchLogs = async () => {
    try {
      const qParams = new URLSearchParams();
      if (search) qParams.append('search', search);
      if (severityFilter) qParams.append('severity', severityFilter);
      if (sourceFilter) qParams.append('source', sourceFilter);

      const res = await fetch(`/api/siem/logs?${qParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch SIEM logs:', err);
    }
  };

  const handleKqlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setKqlLoading(true);
    setKqlError('');
    setKqlResults(null);
    setKqlStats(null);

    try {
      const res = await fetch('/api/siem/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: kqlQuery })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.statistics) {
          setKqlStats(data.statistics);
        } else {
          setKqlResults(Array.isArray(data.results) ? data.results : []);
        }
      } else {
        setKqlError(data.error || 'Syntax execution error.');
      }
    } catch {
      setKqlError('Unable to route query parser request.');
    } finally {
      setKqlLoading(false);
    }
  };

  const clearKql = () => {
    setKqlResults(null);
    setKqlStats(null);
    setKqlError('');
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/20 text-red-400 font-bold';
      case 'WARNING': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'ERROR': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/20 text-orange-400 font-bold';
      default: return 'bg-zinc-800/50 border-white/5 text-slate-400';
    }
  };

  const rawLogs = kqlResults || logs || [];
  const displayedLogs = Array.isArray(rawLogs) ? rawLogs : [];

  return (
    <div className="space-y-6 font-sans text-white select-none relative">
      
      {/* 1. KQL / SPL ADVANCED QUERY BAR PANEL */}
      <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">SPL & KQL Command Shell Console</span>
        </div>

        <form onSubmit={handleKqlSearch} className="flex gap-2">
          <input 
            type="text"
            value={kqlQuery}
            onChange={e => setKqlQuery(e.target.value)}
            placeholder='source="Sysmon" | where severity="CRITICAL" | limit 10'
            className="flex-1 bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-cyan-400 rounded-lg focus:outline-none focus:border-cyan-500/40"
          />
          <button 
            type="submit" 
            disabled={kqlLoading}
            className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs px-4 py-2 rounded-lg transition-colors font-mono font-bold uppercase"
          >
            {kqlLoading ? 'PARSING...' : 'RUN QUERY'}
          </button>
          {(kqlResults || kqlStats || kqlError) && (
            <button 
              type="button" 
              onClick={clearKql}
              className="bg-black border border-white/10 text-slate-400 text-xs px-3 py-2 rounded-lg hover:text-slate-200"
            >
              CLEAR
            </button>
          )}
        </form>

        {kqlError && (
          <div className="mt-3 p-2.5 bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono rounded-lg">
            SYNTAX EXCEPTION: {kqlError}
          </div>
        )}

        {kqlStats && (
          <div className="mt-4 p-3 bg-black/40 border border-white/5 rounded-lg font-mono text-xs space-y-2">
            <p className="text-cyan-400 font-bold border-b border-white/5 pb-1.5">[STATISTICS METRIC MATRIX OUTPUT]</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(kqlStats ?? []).map((stat: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#0D1117] border border-white/5 rounded-lg">
                  <p className="text-slate-500 uppercase text-[9px]">{stat.name}</p>
                  <p className="text-base font-bold text-slate-200 mt-1">{stat.count} Event hits</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. REGULAR INGESTION SEARCH FILTERS PANEL */}
      {!kqlResults && !kqlStats && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-[#0D1117] border border-white/5 rounded-xl shadow-lg">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ingest logs payload details..."
              className="w-full bg-[#111827] border border-white/10 pl-9 pr-3 py-2 text-xs text-slate-200 rounded-lg focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#111827] border border-white/10 px-3 py-2 text-xs text-slate-300 rounded-lg focus:outline-none"
            >
              <option value="">All Severity</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>

            <select 
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-[#111827] border border-white/10 px-3 py-2 text-xs text-slate-300 rounded-lg focus:outline-none"
            >
              <option value="">All Collectors</option>
              <option value="Sysmon">Sysmon (Host Events)</option>
              <option value="AuthLog">Authentication Logs</option>
              <option value="Suricata">Suricata Network IDS</option>
              <option value="WinEvent">Windows Security</option>
              <option value="SIM">Simulated Logs [SIM]</option>
            </select>

            <button 
              onClick={fetchLogs}
              className="bg-black border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 text-xs px-4 py-2 rounded-lg transition-colors font-mono font-bold"
            >
              APPLY FILTERS
            </button>
          </div>
        </div>
      )}

      {/* 3. LOG LISTS DATA TABLE GRID */}
      <div className="bg-[#0D1117] border border-white/5 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">DISPLAYING: <span className="text-cyan-400 font-bold">{displayedLogs.length} LOG RECORDS</span></span>
          {kqlResults && <span className="text-amber-400 font-bold">WARNING: ACTIVE SPL RENDER FILTERS APPLIED</span>}
        </div>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-black/20 text-[#64748b] border-b border-white/5 uppercase font-mono text-[9px] font-bold">
                <th className="p-3">Timestamp (IST)</th>
                <th className="p-3">Source Collector</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Target Host</th>
                <th className="p-3">Intrusion Message</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px] select-text">
              {(displayedLogs ?? []).map((log, lIdx) => {
                const isSim = log.source === 'SIM';
                return (
                  <tr 
                    key={log._id || lIdx} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-cyan-500/5 transition-colors cursor-pointer"
                  >
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="p-3 whitespace-nowrap text-cyan-400 font-semibold flex items-center gap-1.5">
                      {isSim && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 mr-1">[SIM]</span>
                      )}
                      <span>{log.source}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 border rounded text-[9px] ${getSeverityStyle(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-200 font-bold">{log.host}</td>
                    <td className="p-3 text-slate-350 truncate max-w-md">{log.message}</td>
                    <td className="p-3 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                    </td>
                  </tr>
                );
              })}

              {displayedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                    No matching SIEM records located in secure database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. LOG EXPLORER CONTEXT DRAWER */}
      {selectedLog && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-[#070B14] border-l border-white/10 shadow-2xl z-50 flex flex-col justify-between slide-in font-sans">
          <div>
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 bg-[#0D1117] flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">EVENT EXPLORER FRAME</span>
                <h3 className="text-sm font-bold text-slate-200 mt-1 uppercase">Log Record Metadata</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="bg-black border border-white/10 text-slate-400 text-xs px-2.5 py-1 rounded-lg hover:text-slate-200 font-mono text-[10px]"
              >
                CLOSE
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] text-xs">
              <div className="space-y-2 border-b border-white/5 pb-4 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">INGEST TIMESTAMP (IST):</span>
                  <span className="text-slate-300">{new Date(selectedLog.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">COLLECTOR SOURCE:</span>
                  <span className="text-cyan-400 font-semibold">{selectedLog.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SEVERITY RATING:</span>
                  <span className={`px-2 py-0.5 border rounded text-[9px] ${getSeverityStyle(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TARGET SYSTEM:</span>
                  <span className="text-slate-300 font-bold">{selectedLog.host}</span>
                </div>
              </div>

              {selectedLog.mitreTactic && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg font-mono text-[10px]">
                  <p className="text-red-400 font-bold uppercase text-[9px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> MITRE ATT&CK MAPPED TACTIC DETECTED
                  </p>
                  <p className="text-slate-200 mt-2">TACTIC: <span className="text-slate-100 font-bold">{selectedLog.mitreTactic}</span></p>
                  <p className="text-slate-300 mt-1">TECHNIQUE: <span className="text-slate-100">{selectedLog.mitreTechnique}</span></p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono text-slate-500">Payload Message Details</label>
                <div className="p-3 bg-black/40 border border-white/5 rounded-lg font-mono text-slate-300 leading-relaxed text-[11px]">
                  {selectedLog.message}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono text-slate-500">Raw JSON Telemetry Package</label>
                <pre className="p-3 bg-black border border-white/5 rounded-lg font-mono text-[9.5px] text-emerald-400 overflow-x-auto max-w-[450px]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-white/5 bg-[#0D1117] flex justify-end">
            <button 
              onClick={() => setSelectedLog(null)}
              className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs px-4 py-2 rounded-lg font-bold font-mono transition-colors"
            >
              ACKNOWLEDGE LOG DETAILS
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SIEM(props: any) {
  return (
    <ErrorBoundary>
      <SIEMComponent {...props} />
    </ErrorBoundary>
  );
}
