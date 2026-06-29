import React, { useState, useEffect } from 'react';
import { 
  FolderLock, User, Clock, AlertTriangle, CheckCircle, Plus, FileCode, Play, List, Columns, X, ArrowRight, ShieldAlert, Paperclip, PlusCircle
} from 'lucide-react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

interface TimelineEntry {
  timestamp: string;
  activity: string;
  actor: string;
}

interface IncidentCase {
  _id: string;
  title: string;
  severity: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  impact: string;
  rootCause: string;
  recommendations: string[];
  timeline: TimelineEntry[];
  evidence: any[];
}

const STATUS_LIFECYCLE = ['NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'];

// Draggable Card component for Kanban
function KanbanCard({ item, onClick }: { item: IncidentCase; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item._id,
  });

  const style: React.CSSProperties = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : {};

  const getSeverityPill = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'MEDIUM': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'LOW': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default: return 'bg-zinc-800 border-white/5 text-slate-400';
    }
  };

  const getAgeString = (createdAt: string) => {
    if (!createdAt) return 'Just now';
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-black/40 border border-white/5 rounded-xl space-y-3 cursor-grab hover:border-cyan-500/35 transition-all select-none relative active:cursor-grabbing ${
        isDragging ? 'opacity-40 border-cyan-500/40' : ''
      }`}
    >
      <div {...listeners} {...attributes} className="absolute inset-0 z-0"></div>
      
      <div className="relative z-10 space-y-2.5">
        <div className="flex justify-between items-start">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded uppercase ${getSeverityPill(item.severity)}`}>
            {item.severity}
          </span>
          <span className="text-[8px] font-mono text-slate-500 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {getAgeString(item.createdAt)}
          </span>
        </div>

        <h4 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="text-[11px] font-bold text-slate-200 hover:text-cyan-400 transition-colors line-clamp-2 cursor-pointer pointer-events-auto"
        >
          {item.title}
        </h4>

        <div className="flex justify-between items-center text-[9px] font-mono border-t border-white/5 pt-2 text-slate-500">
          <span className="flex items-center gap-0.5 truncate max-w-[100px]">
            <User className="w-2.5 h-2.5" />
            {item.assignedTo || 'Unassigned'}
          </span>
          <span>{item.evidence?.length || 0} evidence</span>
        </div>
      </div>
    </div>
  );
}

// Droppable swimlane column
function KanbanLane({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col gap-3 p-3 bg-black/20 border border-white/5 rounded-xl min-h-[420px] transition-colors ${
        isOver ? 'bg-cyan-500/5 border-cyan-500/20' : ''
      }`}
    >
      <div className="flex justify-between items-center pb-1 border-b border-white/5 font-mono">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{status}</span>
      </div>
      <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] pr-0.5">
        {children}
      </div>
    </div>
  );
}

export default function IncidentResponse({ liveAlerts, token }: any) {
  const [cases, setCases] = useState<IncidentCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<IncidentCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Modal and form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('MEDIUM');
  const [newDesc, setNewDesc] = useState('');
  const [newHosts, setNewHosts] = useState('');
  const [newAlerts, setNewAlerts] = useState<string[]>([]);

  // Selected Case Detail Panel States
  const [customNote, setCustomNote] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');

  // Live Toast notification on new CRITICAL/HIGH alerts
  const [incomingAlert, setIncomingAlert] = useState<any | null>(null);

  useEffect(() => {
    fetchCases();
  }, []);

  // Register Socket.io events
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleIncidentChange = () => {
      fetchCases();
    };

    socket.on('incident', handleIncidentChange);
    socket.on('incident:updated', handleIncidentChange);

    socket.on('alert', (alert: any) => {
      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        setIncomingAlert(alert);
      }
    });

    return () => {
      socket.off('incident', handleIncidentChange);
      socket.off('incident:updated', handleIncidentChange);
      socket.off('alert');
    };
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents/cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setCases(arr);
        if (arr.length > 0) {
          // Keep current selection details refreshed
          setSelectedCase(prev => {
            if (prev) {
              const fresh = arr.find(c => c._id === prev._id);
              return fresh || arr[0];
            }
            return arr[0];
          });
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
        fetchCases();
      }
    } catch (err) {
      console.error('Failed to update case:', err);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;
    
    const caseId = active.id;
    const newStatus = over.id;
    
    const targetCase = cases.find(c => c._id === caseId);
    if (targetCase && targetCase.status !== newStatus) {
      try {
        const res = await fetch(`/api/incidents/cases/${caseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          fetchCases();
        }
      } catch (err) {
        console.error('Failed to update case status via drag and drop', err);
      }
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
        setCustomNote('');
        fetchCases();
      }
    } catch (err) {
      console.error('Failed to append timeline:', err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/incidents/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          severity: newSeverity,
          impact: `Affected hosts: ${newHosts || 'N/A'}. Details: ${newDesc}`,
          rootCause: `Correlated alerts: ${newAlerts.join(', ') || 'N/A'}`,
          recommendations: ['Perform full host endpoint containment checks', 'Review proxy egress bounds']
        })
      });
      if (res.ok) {
        fetchCases();
        setNewTitle('');
        setNewSeverity('MEDIUM');
        setNewDesc('');
        setNewHosts('');
        setNewAlerts([]);
        setShowCreateModal(false);
      }
    } catch (e) {
      console.error('Failed to create incident case', e);
    }
  };

  // Mock upload evidence file
  const handleEvidenceMockUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCase || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const timestamp = new Date().toLocaleTimeString();

    const note = `Analyst uploaded evidence artifact: "${file.name}" (Size: ${(file.size / 1024).toFixed(1)} KB)`;
    try {
      await fetch(`/api/incidents/cases/${selectedCase._id}/timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activity: note })
      });
      fetchCases();
    } catch (err) {
      console.error('Failed to log evidence', err);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/20 text-red-400 font-bold';
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      default: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'CONTAINED': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'INVESTIGATING': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default: return 'bg-red-500/10 border-red-500/20 text-red-400 font-bold';
    }
  };

  return (
    <div className="space-y-6 font-sans text-white select-none relative h-full">
      
      {/* Alert toast notification */}
      {incomingAlert && (
        <div className="p-4 bg-[#0D1117] border border-red-500/20 rounded-xl flex items-center justify-between shadow-glow shadow-red-500/5 animate-fadeIn relative">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-red-400 uppercase leading-none">Correlated Threat Detected</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">{incomingAlert.title} - Severity: {incomingAlert.severity}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setNewTitle(`Incident: ${incomingAlert.title}`);
                setNewSeverity(incomingAlert.severity);
                setNewDesc(incomingAlert.description);
                setNewHosts(incomingAlert.host || '');
                setNewAlerts([incomingAlert._id]);
                setShowCreateModal(true);
                setIncomingAlert(null);
              }}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-black text-[9px] font-bold font-mono rounded-lg flex items-center gap-0.5 uppercase"
            >
              <ArrowRight className="w-3 h-3" />
              Create Case
            </button>
            <button 
              onClick={() => setIncomingAlert(null)}
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header controls bar */}
      <div className="flex justify-between items-center bg-[#0D1117] p-3 border border-white/5 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <FolderLock className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Incident Lifecycle Board</span>
            <p className="text-[9px] text-slate-500 font-mono">DRAG & DROP WORKSPACE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Toggle View Mode */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden bg-black text-[10px] font-mono shrink-0">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 flex items-center gap-1 transition-all ${
                viewMode === 'kanban' ? 'bg-[#0D1117] text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 flex items-center gap-1 transition-all ${
                viewMode === 'list' ? 'bg-[#0D1117] text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold font-mono text-[10px] px-4 py-2 rounded-lg uppercase flex items-center gap-1 shadow-md shadow-cyan-500/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Incident
          </button>
        </div>
      </div>

      {/* Kanban Board Mode */}
      {viewMode === 'kanban' ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STATUS_LIFECYCLE.map(status => {
              const laneCases = cases.filter(c => c.status === status);
              return (
                <KanbanLane key={status} status={status}>
                  {laneCases.map((c, idx) => (
                    <KanbanCard 
                      key={c._id || idx} 
                      item={c} 
                      onClick={() => setSelectedCase(c)} 
                    />
                  ))}
                  {laneCases.length === 0 && (
                    <div className="text-center py-12 text-slate-600 font-mono text-[9px] italic">No active cases.</div>
                  )}
                </KanbanLane>
              );
            })}
          </div>
        </DndContext>
      ) : (
        /* Dense List View Mode */
        <div className="bg-[#0D1117] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-black/25 text-[#64748b] border-b border-white/5 uppercase font-mono text-[9px] font-bold">
                  <th className="p-3">Title</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Age</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[10.5px]">
                {cases.map((c, idx) => (
                  <tr 
                    key={c._id || idx} 
                    onClick={() => setSelectedCase(c)}
                    className="hover:bg-cyan-500/5 transition-colors cursor-pointer text-slate-300"
                  >
                    <td className="p-3 font-bold text-slate-100">{c.title}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 border rounded text-[9px] ${getSeverityStyle(c.severity)}`}>
                        {c.severity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 border rounded text-[9px] ${getStatusStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{c.assignedTo || 'Unassigned'}</td>
                    <td className="p-3 text-slate-400">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3 text-right">
                      <ArrowRight className="w-4 h-4 text-slate-500 ml-auto" />
                    </td>
                  </tr>
                ))}
                {cases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">No incident cases compiled.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side Slide-In drawer Details Panel */}
      {selectedCase && (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-[#070B14] border-l border-white/10 shadow-2xl z-50 flex flex-col justify-between slide-in font-sans select-text">
          <div>
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/5 bg-[#0D1117] flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">CASE DETAIL MANAGER</span>
                <h3 className="text-sm font-bold text-slate-200 mt-1 uppercase truncate max-w-[320px]">{selectedCase.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedCase(null)}
                className="bg-black border border-white/10 text-slate-400 hover:text-slate-200 text-[9px] font-mono px-2.5 py-1 rounded-lg uppercase"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3 font-mono text-[9.5px] text-slate-400">
                <div>CREATED AT (IST): <span className="text-slate-200 block font-bold mt-0.5">{new Date(selectedCase.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
                <div>CASE OWNER: <span className="text-cyan-400 block font-bold mt-0.5">{selectedCase.assignedTo || 'Unassigned'}</span></div>
                <div>SEVERITY: <span className={`px-2 py-0.5 border rounded uppercase text-[8.5px] mt-0.5 inline-block ${getSeverityStyle(selectedCase.severity)}`}>{selectedCase.severity}</span></div>
                <div>STATUS STATE: <span className={`px-2 py-0.5 border rounded uppercase text-[8.5px] mt-0.5 inline-block ${getStatusStyle(selectedCase.status)}`}>{selectedCase.status}</span></div>
              </div>

              {/* Status progression toggles */}
              <div className="space-y-1.5 border-b border-white/5 pb-3">
                <label className="block text-[8.5px] uppercase font-mono text-slate-500">Progress Status lifecycle</label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_LIFECYCLE.map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold border transition-colors ${
                        selectedCase.status === s 
                          ? 'bg-cyan-500 text-black border-cyan-500' 
                          : 'bg-black border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Impact cause */}
              <div className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-1">
                <span className="text-[8.5px] uppercase font-mono text-slate-500">Impact Analysis</span>
                <p className="text-slate-200 text-[11px] leading-relaxed">{selectedCase.impact}</p>
                {selectedCase.rootCause && (
                  <p className="text-[9.5px] text-slate-500 font-mono mt-1 pt-1.5 border-t border-white/5">ROOT: {selectedCase.rootCause}</p>
                )}
              </div>

              {/* Recommendations */}
              <div className="space-y-1.5">
                <label className="block text-[8.5px] uppercase font-mono text-slate-500">Mitigation Playbook steps</label>
                <ul className="space-y-1.5">
                  {selectedCase.recommendations.map((rec, rIdx) => (
                    <li key={rIdx} className="text-[11px] text-slate-350 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold font-mono">{rIdx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evidence upload attachment */}
              <div className="p-3.5 bg-black/50 border border-white/5 rounded-lg space-y-2">
                <span className="text-[8.5px] uppercase font-mono text-slate-500 block">Forensics Evidence Attachments</span>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9.5px] text-slate-400 font-mono">Upload dynamic evidence log:</span>
                  <label className="bg-black border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0">
                    <Paperclip className="w-3 h-3" />
                    Attach
                    <input 
                      type="file"
                      onChange={handleEvidenceMockUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Timeline Reconstruction */}
              <div className="space-y-3">
                <label className="block text-[8.5px] uppercase font-mono text-slate-500">Forensics Timeline Audit logs</label>
                <div className="space-y-2.5 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5 font-mono text-[10px]">
                  {(selectedCase.timeline ?? []).map((t, tIdx) => (
                    <div key={tIdx} className="pl-8 relative space-y-1">
                      <span className="w-2.5 h-2.5 bg-cyan-500 border border-slate-900 rounded-full absolute left-2 top-1"></span>
                      <div className="flex justify-between items-center text-[7.5px] text-slate-500 leading-none">
                        <span>{new Date(t.timestamp).toLocaleTimeString()} IST</span>
                        <span className="text-cyan-400">ACTOR: {t.actor}</span>
                      </div>
                      <p className="text-slate-300 bg-black/40 p-2 border border-white/5 rounded-lg leading-snug">{t.activity}</p>
                    </div>
                  ))}
                </div>

                {/* Timeline comment insert */}
                <form onSubmit={handleAppendTimelineNote} className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="Append forensic note..."
                    className="flex-1 bg-[#111827] border border-white/10 px-3 py-1.5 text-xs text-slate-200 rounded-lg focus:outline-none focus:border-cyan-500/40"
                  />
                  <button
                    type="submit"
                    className="bg-black border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 text-[10px] px-3 py-1.5 rounded-lg font-bold font-mono"
                  >
                    ADD
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-4 border-t border-white/5 bg-[#0D1117] flex justify-end">
            <button 
              onClick={() => setSelectedCase(null)}
              className="bg-cyan-500 hover:bg-cyan-600 text-black text-xs px-4 py-2 rounded-lg font-bold font-mono"
            >
              ACKNOWLEDGE CASE
            </button>
          </div>
        </div>
      )}

      {/* Create Case Modal popup overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1117] border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl animate-fadeIn relative">
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-cyan-400">Initialize Security Case</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-5 space-y-4 font-mono text-[10px]">
              <div>
                <label className="block text-slate-500 mb-1">INCIDENT TITLE</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Brute Force Intrusion detected"
                  className="w-full bg-[#111827] border border-white/10 px-3 py-2 text-xs text-cyan-400 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">SEVERITY LEVEL</label>
                  <select 
                    value={newSeverity}
                    onChange={e => setNewSeverity(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 px-2 py-2 text-xs text-slate-300 rounded-lg focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">AFFECTED WORKSTATION</label>
                  <input 
                    type="text" 
                    value={newHosts}
                    onChange={e => setNewHosts(e.target.value)}
                    placeholder="e.g. WIN-NODE01"
                    className="w-full bg-[#111827] border border-white/10 px-3 py-2 text-xs text-slate-300 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">INCIDENT SCENARIO DESCRIPTION</label>
                <textarea 
                  required
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Record summary details..."
                  className="w-full h-20 bg-[#111827] border border-white/10 px-3 py-2 text-xs text-slate-300 rounded-lg resize-none focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="bg-black border border-white/10 hover:border-white/20 text-slate-400 px-4 py-2 rounded-lg uppercase font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-black px-5 py-2 rounded-lg font-bold uppercase"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
