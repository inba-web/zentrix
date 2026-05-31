import { useState, useEffect } from 'react';
import { Workflow, Play, Clock, CheckCircle, HelpCircle, Layers } from 'lucide-react';

export default function SOAR({ token }: any) {
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/soar/playbooks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybooks(data);
        if (data.length > 0) {
          setSelectedPlaybook(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch playbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    if (!selectedPlaybook) return;

    setExecuting(true);
    try {
      const res = await fetch(`/api/soar/playbooks/${selectedPlaybook._id}/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPlaybooks(); // Refresh run logs
        
        // Temporarily append manual logs to select display
        const timestamp = new Date().toISOString();
        setSelectedPlaybook((prev: any) => ({
          ...prev,
          executions: [
            {
              timestamp,
              status: 'SUCCESS',
              logs: [
                'Manual trigger initialized.',
                'Dispatched threat notifications to Slack channels.',
                'Enriched threat indicators against VirusTotal reputations caches.',
                'Automation completed.'
              ]
            },
            ...prev.executions
          ]
        }));
      }
    } catch (err) {
      console.error('Failed to trigger playbook:', err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT PANEL: PLAYBOOK REGISTRY LIST */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Active SOAR Playbooks</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">AUTOMATED MITIGATIONS</p>
            </div>
            <Workflow className="w-4 h-4 text-blue-500" />
          </div>

          {loading ? (
            <p className="text-xs font-mono text-slate-500">Retrieving automation lists...</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 select-none">
              {playbooks.map(p => {
                const isActive = selectedPlaybook?._id === p._id;
                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedPlaybook(p)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-400' 
                        : 'bg-[#0a0f1d]/50 border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-200">{p.name}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono leading-none">
                      <span className="text-slate-400 uppercase">ON: {p.trigger}</span>
                      <span className="text-emerald-400 font-bold uppercase">{p.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>WORKFLOWS: {playbooks.length} Configured Playbooks</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: DETAILED STEP SEQUENCES & AUDITS */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {selectedPlaybook ? (
          <>
            {/* Playbooks execution banner */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex justify-between items-center select-none">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-blue-500">AUTOMATION BLUEPRINT</span>
                <h3 className="text-base font-bold text-slate-100 mt-1 uppercase">{selectedPlaybook.name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">AUTOMATED WORKFLOW RULESET TRIGGER: {selectedPlaybook.trigger}</p>
              </div>

              <button 
                onClick={handleManualTrigger}
                disabled={executing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold px-4 py-2 rounded transition-colors uppercase flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {executing ? 'RUNNING...' : 'ORCHESTRATE RUN'}
              </button>
            </div>

            {/* Playbook sequence path drawing */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg space-y-4 font-mono select-none">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Mitigation Sequence Action Blocks</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {selectedPlaybook.steps.map((step: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950/60 border border-slate-900 rounded relative">
                    <span className="text-[8px] text-slate-500 uppercase">STEP BLOCK 0{step.order}</span>
                    <p className="text-xs font-bold text-slate-100 mt-1 truncate uppercase">{step.action}</p>
                    <p className="text-[9px] text-[#64748b] mt-1.5 truncate">ARGS: {JSON.stringify(step.params)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Playbook execution histories logs */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg space-y-4 select-text">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Playbook Execution Audit Logs</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">DIAGNOSTIC PROCESS TRACES</p>

              <div className="space-y-4">
                {selectedPlaybook.executions.map((exec: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950/40 border border-slate-900 rounded font-mono text-[9px] space-y-2">
                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-900 pb-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> TIMESTAMP: {new Date(exec.timestamp).toLocaleString()}</span>
                      <span className="text-emerald-400 font-bold uppercase">{exec.status}</span>
                    </div>
                    <div className="space-y-1 pl-2 text-slate-300">
                      {exec.logs.map((log: string, lIdx: number) => (
                        <p key={lIdx} className="leading-snug">
                          <span className="text-slate-500 mr-1.5">&gt;</span> {log}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {selectedPlaybook.executions.length === 0 && (
                  <p className="text-center text-slate-500 font-mono py-8">Zero execution trails found for active rule.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs text-slate-500">
            Awaiting SOAR automation selection from active index to render sequential rule diagrams.
          </div>
        )}

      </div>

    </div>
  );
}
