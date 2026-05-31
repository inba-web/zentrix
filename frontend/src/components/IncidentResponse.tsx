import { useState, useEffect } from 'react';
import { 
  FolderLock, User, Clock, AlertTriangle, CheckCircle, Plus, FileCode, Play 
} from 'lucide-react';

export default function IncidentResponse({ liveAlerts, token }: any) {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Manual input fields
  const [customNote, setCustomNote] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');

  useEffect(() => {
    fetchCases();
  }, [liveAlerts]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents/cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0) {
          setSelectedCase(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedCase) return;

    try {
      const res = await fetch(`/api/incidents/cases/${selectedCase._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchCases(); // Refresh entire list
        setSelectedCase((prev: any) => ({ ...prev, status }));
      }
    } catch (err) {
      console.error('Failed to update case:', err);
    }
  };

  const handleAppendTimelineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !customNote.trim()) return;

    try {
      const res = await fetch(`/api/incidents/cases/${selectedCase._id}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activity: customNote })
      });
      if (res.ok) {
        const timestamp = new Date().toISOString();
        setSelectedCase((prev: any) => ({
          ...prev,
          timeline: [...prev.timeline, { timestamp, activity: customNote, actor: 'Analyst' }]
        }));
        setCustomNote('');
      }
    } catch (err) {
      console.error('Failed to append timeline:', err);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-950/50 border-red-500/30 text-red-400 font-bold';
      case 'HIGH': return 'bg-amber-950/40 border-amber-500/20 text-amber-400';
      default: return 'bg-blue-950/40 border-blue-500/20 text-blue-400';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED': return 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400';
      case 'CONTAINED': return 'bg-blue-950/40 border-blue-500/20 text-blue-400';
      case 'INVESTIGATING': return 'bg-amber-950/40 border-amber-500/20 text-amber-400';
      default: return 'bg-red-950/50 border-red-500/30 text-red-400 font-bold';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT PANEL: INCIDENT REGISTRY LIST */}
      <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg lg:col-span-1 h-[650px] flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Incident Triage Queue</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">CASE REGISTERS</p>
            </div>
            <select
              value={caseStatusFilter}
              onChange={e => setCaseStatusFilter(e.target.value)}
              className="bg-[#050811] border border-slate-700 text-slate-400 px-2 py-1 text-[10px] font-mono rounded"
            >
              <option value="">All States</option>
              <option value="NEW">New</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="CONTAINED">Contained</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {loading ? (
            <p className="text-xs font-mono text-slate-500">Retrieving incident cases...</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 select-none">
              {cases
                .filter(c => !caseStatusFilter || c.status === caseStatusFilter)
                .map(c => {
                  const isActive = selectedCase?._id === c._id;
                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedCase(c)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-blue-950/40 border-blue-500/40 text-blue-400' 
                          : 'bg-[#0a0f1d]/50 border-slate-800 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{c.title}</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono leading-none">
                        <span className={`px-1.5 py-0.5 border rounded uppercase ${getSeverityStyle(c.severity)}`}>
                          {c.severity}
                        </span>
                        <span className={`px-1.5 py-0.5 border rounded uppercase ${getStatusStyle(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>CASES: {cases.length} Open Profiles</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: SPLIT ANALYSIS WORKSPACE */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {selectedCase ? (
          <>
            {/* Case metrics banner */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-blue-500">CASE PROFILE ANALYSIS</span>
                <h3 className="text-base font-bold text-slate-100 mt-1 uppercase leading-snug">{selectedCase.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  CREATED: {new Date(selectedCase.createdAt).toLocaleString()}  |  OWNER: {selectedCase.assignedTo || 'Unassigned'}
                </p>
              </div>

              {/* Status progression actions */}
              <div className="flex gap-2 shrink-0">
                {selectedCase.status !== 'INVESTIGATING' && selectedCase.status !== 'CONTAINED' && selectedCase.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus('INVESTIGATING')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-bold px-3 py-1.5 rounded transition-colors"
                  >
                    INVESTIGATE
                  </button>
                )}
                {selectedCase.status !== 'CONTAINED' && selectedCase.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus('CONTAINED')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold px-3 py-1.5 rounded transition-colors"
                  >
                    CONTAIN THREAT
                  </button>
                )}
                {selectedCase.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold px-3 py-1.5 rounded transition-colors"
                  >
                    RESOLVE CASE
                  </button>
                )}
              </div>
            </div>

            {/* Impact / recommendations panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg space-y-2">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Intrusion Impact & Cause</span>
                <p className="text-xs font-bold text-slate-200 mt-1 font-sans leading-normal select-text">{selectedCase.impact}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono select-text">ROOT CAUSE: {selectedCase.rootCause}</p>
              </div>

              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg space-y-2 select-text">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Threat Mitigation Guides</span>
                <ul className="space-y-1.5 mt-1">
                  {selectedCase.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-xs text-slate-300 font-sans flex items-start gap-1.5">
                      <span className="text-blue-400 font-mono font-bold">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Incident Chronological Timeline track */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg space-y-4">
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Incident Sequential Timeline Reconstruction</span>
                <p className="text-[10px] text-[#64748b] leading-tight font-mono">COMPLIANCE SECURITY AUDITING PATHS</p>
              </div>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800 font-mono select-text">
                {selectedCase.timeline.map((act: any, idx: number) => (
                  <div key={idx} className="pl-8 relative text-[10px] space-y-1">
                    <span className="w-2.5 h-2.5 bg-blue-500 border border-slate-900 rounded-full absolute left-2 top-1.5"></span>
                    <div className="flex justify-between items-center text-[8px] text-slate-500 leading-none">
                      <span>TIME: {new Date(act.timestamp).toLocaleTimeString()}</span>
                      <span className="text-blue-400">ACTOR: {act.actor}</span>
                    </div>
                    <p className="text-slate-300 bg-slate-950/50 p-2 border border-slate-900 rounded leading-snug">{act.activity}</p>
                  </div>
                ))}
              </div>

              {/* Append timeline comments */}
              <form onSubmit={handleAppendTimelineNote} className="flex gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  placeholder="Record custom forensic discovery note... e.g. Loaded memory buffer for svchost"
                  className="flex-1 bg-[#050811] border border-slate-700 px-3 py-1.5 text-xs text-slate-200 rounded focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs px-4 py-1.5 rounded transition-colors font-mono uppercase"
                >
                  ADD NOTE
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs text-slate-500">
            Awaiting incident case selection from the triage queue register to initiate forensic reconstruction.
          </div>
        )}

      </div>

    </div>
  );
}
