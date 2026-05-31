import { useState, useEffect } from 'react';
import { Terminal, Search, ChevronRight, Filter, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function SIEM({ websocketLogs, token }: any) {
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

  // Sync WebSocket logs
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
        setLogs(data);
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
          setKqlResults(data.results);
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
      case 'CRITICAL': return 'bg-red-950/50 border-red-500/30 text-red-400 font-bold';
      case 'WARNING': return 'bg-amber-950/40 border-amber-500/20 text-amber-400';
      case 'ERROR': return 'bg-red-950/20 border-red-900/10 text-red-400';
      default: return 'bg-slate-900/50 border-slate-800 text-slate-400';
    }
  };

  const displayedLogs = kqlResults || logs;

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* 1. KQL / SPL ADVANCED QUERY BAR PANEL */}
      <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-blue-500" />
          <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">SPL & KQL Command Shell Console</span>
        </div>

        <form onSubmit={handleKqlSearch} className="flex gap-2">
          <input 
            type="text"
            value={kqlQuery}
            onChange={e => setKqlQuery(e.target.value)}
            placeholder='source="Sysmon" | where severity="CRITICAL" | limit 10'
            className="flex-1 bg-[#050811] border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 rounded focus:outline-none focus:border-blue-500"
          />
          <button 
            type="submit" 
            disabled={kqlLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded transition-colors font-mono uppercase"
          >
            {kqlLoading ? 'PARSING...' : 'RUN QUERY'}
          </button>
          {(kqlResults || kqlStats || kqlError) && (
            <button 
              type="button" 
              onClick={clearKql}
              className="bg-slate-900 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded hover:text-slate-200"
            >
              CLEAR
            </button>
          )}
        </form>

        {kqlError && (
          <div className="mt-3 p-2 bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono rounded">
            SYNTAX EXCEPTION: {kqlError}
          </div>
        )}

        {kqlStats && (
          <div className="mt-4 p-3 bg-[#050811] border border-slate-800 rounded font-mono text-xs space-y-2">
            <p className="text-blue-400 font-bold border-b border-slate-800 pb-1.5">[STATISTICS METRIC MATRIX OUTPUT]</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kqlStats.map((stat, idx) => (
                <div key={idx} className="p-3 bg-[#111625] border border-slate-800 rounded">
                  <p className="text-slate-500 uppercase text-[9px]">{stat.name}</p>
                  <p className="text-lg font-bold text-slate-100 mt-1">{stat.count} Event hits</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. REGULAR INGESTION SEARCH FILTERS PANEL */}
      {!kqlResults && !kqlStats && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-[#111625] border border-slate-800 rounded-lg">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ingest logs payload details..."
              className="w-full bg-[#050811] border border-slate-700 pl-9 pr-3 py-2 text-xs text-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#050811] border border-slate-700 px-3 py-2 text-xs text-slate-300 rounded focus:outline-none"
            >
              <option value="">All Severity</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
            </select>

            <select 
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-[#050811] border border-slate-700 px-3 py-2 text-xs text-slate-300 rounded focus:outline-none"
            >
              <option value="">All Collectors</option>
              <option value="Sysmon">Sysmon (Host Events)</option>
              <option value="AuthLog">Authentication Logs</option>
              <option value="Suricata">Suricata Network IDS</option>
              <option value="WinEvent">Windows Security</option>
            </select>

            <button 
              onClick={fetchLogs}
              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-4 py-2 rounded transition-colors"
            >
              APPLY FILTERS
            </button>
          </div>
        </div>
      )}

      {/* 3. LOG LISTS DATA TABLE GRID */}
      <div className="bg-[#111625] border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 bg-[#0c1325] flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">DISPLAYING: <span className="text-blue-400 font-bold">{displayedLogs.length} LOG RECORDS</span></span>
          {kqlResults && <span className="text-amber-400 font-bold">WARNING: ACTIVE SPL RENDER FILTERS APPLIED</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase font-mono text-[10px]">
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Source Collector</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Target Host</th>
                <th className="p-3">Intrusion Message</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displayedLogs.map((log) => (
                <tr 
                  key={log._id} 
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-blue-400 font-semibold">{log.source}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 border rounded text-[9px] ${getSeverityStyle(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-300 font-bold">{log.host}</td>
                  <td className="p-3 text-slate-300 truncate max-w-md">{log.message}</td>
                  <td className="p-3 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                  </td>
                </tr>
              ))}

              {displayedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                    No matching SIEM records located in local secure databases.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. LOG EXPLORER CONTEXT DRAWER */}
      {selectedLog && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-[#0c1222] border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between slide-in font-sans">
          <div>
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 bg-[#0e172a] flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-blue-500">EVENT EXPLORER FRAME</span>
                <h3 className="text-sm font-bold text-slate-200 mt-1 uppercase">Log Record Metadata</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="bg-slate-900 border border-slate-800 text-slate-400 text-xs px-2 py-1 rounded hover:text-slate-200"
              >
                CLOSE
              </button>
            </div>

            {/* Content list */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] text-xs">
              <div className="space-y-2 border-b border-slate-800/60 pb-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">INGEST TIMESTAMP:</span>
                  <span className="text-slate-300">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">COLLECTOR SOURCE:</span>
                  <span className="text-blue-400 font-semibold">{selectedLog.source}</span>
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
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded font-mono">
                  <p className="text-red-400 font-bold uppercase text-[9px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> MITRE ATT&CK MAPPED TACTIC DETECTED
                  </p>
                  <p className="text-slate-200 mt-2">TACTIC: <span className="text-slate-100 font-bold">{selectedLog.mitreTactic}</span></p>
                  <p className="text-slate-300 mt-1">TECHNIQUE: <span className="text-slate-100">{selectedLog.mitreTechnique}</span></p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono text-slate-500">Payload Message Details</label>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded font-mono text-slate-300 leading-relaxed leading-snug">
                  {selectedLog.message}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono text-slate-500">Raw JSON Telemetry Package</label>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded font-mono text-[10px] text-emerald-400 overflow-x-auto max-w-[450px]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-slate-800 bg-[#0e172a] flex justify-end">
            <button 
              onClick={() => setSelectedLog(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded transition-colors"
            >
              ACKNOWLEDGE LOG DETAILS
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
