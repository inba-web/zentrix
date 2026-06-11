import React, { useState, useEffect } from 'react';
import { Search, Terminal, Play, ShieldAlert, Cpu, Network, Plus, Trash2, Save, Download } from 'lucide-react';

interface Technique {
  id?: number;
  _id?: string;
  name: string;
  description: string;
  mitre: string;
  linux: string;
  windows: string;
  isCustom?: boolean;
}

export default function ThreatHunting({ token }: any) {
  const [presets, setPresets] = useState<Technique[]>([]);
  const [customs, setCustoms] = useState<Technique[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [executedCmd, setExecutedCmd] = useState<string>('');
  
  // Custom technique form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLinux, setNewLinux] = useState('');
  const [newWindows, setNewWindows] = useState('');
  const [newMitre, setNewMitre] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPresets();
    fetchCustoms();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/hunt/presets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
        if (data.length > 0) {
          setSelectedTechnique(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch presets', e);
    }
  };

  const fetchCustoms = async () => {
    try {
      const res = await fetch('/api/hunt/custom', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustoms(data);
      }
    } catch (e) {
      console.error('Failed to fetch custom hunt techniques', e);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLinux.trim()) return;

    try {
      const res = await fetch('/api/hunt/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          linux: newLinux,
          windows: newWindows,
          mitre: newMitre || 'User Custom Audit'
        })
      });
      if (res.ok) {
        fetchCustoms();
        setNewName('');
        setNewDesc('');
        setNewLinux('');
        setNewWindows('');
        setNewMitre('');
        setShowForm(false);
      }
    } catch (e) {
      console.error('Failed to create custom technique', e);
    }
  };

  const handleDeleteCustom = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this custom technique?')) return;
    try {
      const res = await fetch(`/api/hunt/custom/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchCustoms();
        if (selectedTechnique?._id === id) {
          setSelectedTechnique(presets[0] || null);
        }
      }
    } catch (e) {
      console.error('Failed to delete custom technique', e);
    }
  };

  const handleRunHunt = async () => {
    if (!selectedTechnique) return;
    setIsScanning(true);
    setOutput('Initiating secure system call thread...');
    setExecutedCmd('');

    try {
      const isCustom = !!selectedTechnique.isCustom;
      const bodyPayload = isCustom
        ? { isCustom: true, command: selectedTechnique.linux, name: selectedTechnique.name }
        : { isCustom: false, techniqueId: selectedTechnique.id };

      const res = await fetch('/api/hunt/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data.output || 'No output resolved.');
        setExecutedCmd(data.cmd || '');
      } else {
        setOutput(`[ERROR] Hunting execution failed: ${data.error}`);
      }
    } catch (err: any) {
      setOutput(`[ERROR] Transmission failure: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToReport = async () => {
    if (!output || !selectedTechnique) return;
    try {
      const res = await fetch('/api/incidents/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Threat Hunt Discovery: ${selectedTechnique.name}`,
          severity: 'HIGH',
          impact: 'Host level diagnostics mapping completed.',
          rootCause: `Command Execution: ${executedCmd}`,
          recommendations: ['Inspect processes logs on workstation', 'Review command history logs'],
          evidence: {
            technique: selectedTechnique.name,
            mitre: selectedTechnique.mitre,
            command: executedCmd,
            logResult: output
          }
        })
      });
      if (res.ok) {
        alert('Discovery evidence saved as a Case file successfully!');
      }
    } catch (e) {
      console.error('Failed to log case file', e);
    }
  };

  // Threat line parser highlighting common names & paths
  const formatOutputLine = (line: string, idx: number) => {
    const dangerousPatterns = [
      'failed', 'invalid', 'vssadmin', 'delete', 'shadows', 'powershell', 'wget', 'curl',
      'base64', 'nc', 'ncat', 'netcat', 'nmap', 'mimikatz', 'cron', 'rootkit', 'deleted', 'promisc'
    ];
    const isDangerous = dangerousPatterns.some(pat => line.toLowerCase().includes(pat));
    
    return (
      <div 
        key={idx} 
        className={`${isDangerous ? 'text-red-400 font-bold bg-red-950/10' : 'text-slate-350'} whitespace-pre-wrap`}
      >
        {line}
      </div>
    );
  };

  const techniquesList = [...presets, ...customs.map(c => ({ ...c, isCustom: true }))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-white select-none">
      
      {/* 1. LEFT COLUMN: TECHNIQUES SELECTOR & CUSTOM BUILDER */}
      <div className="lg:col-span-1 p-5 bg-[#0D1117] border border-white/5 rounded-xl h-[620px] flex flex-col justify-between overflow-y-auto shadow-xl">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Threat Hunting Techniques</span>
              <p className="text-[10px] text-slate-500 leading-tight font-mono">MITRE ATT&CK AUDITS</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold font-mono text-[9px] px-2.5 py-1 rounded-lg uppercase flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Custom
            </button>
          </div>

          {showForm ? (
            <form onSubmit={handleCreateCustom} className="space-y-2.5 p-3.5 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] animate-fadeIn">
              <p className="text-[9px] text-cyan-400 font-bold uppercase border-b border-white/5 pb-1">[+] BUILD CUSTOM TECHNIQUE</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-0.5">TECHNIQUE NAME</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Audit SSH"
                    className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5">MITRE ATT&CK ID</label>
                  <input
                    type="text"
                    value={newMitre}
                    onChange={e => setNewMitre(e.target.value)}
                    placeholder="e.g. T1059"
                    className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">DESCRIPTION</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe hunting goals..."
                  className="w-full h-11 bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded resize-none focus:outline-none focus:border-cyan-500/30"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">LINUX COMMAND</label>
                <input
                  type="text"
                  required
                  value={newLinux}
                  onChange={e => setNewLinux(e.target.value)}
                  placeholder="e.g. ps aux"
                  className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-xs text-cyan-400 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">WINDOWS COMMAND</label>
                <input
                  type="text"
                  value={newWindows}
                  onChange={e => setNewWindows(e.target.value)}
                  placeholder="e.g. Get-Process"
                  className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-xs text-cyan-400 rounded focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-black border border-white/10 hover:border-white/20 text-slate-400 py-1.5 rounded-lg transition-colors uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black py-1.5 rounded-lg transition-colors uppercase font-bold"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {techniquesList.map((t, idx) => {
                const isSelected = selectedTechnique?.name === t.name;
                const isCustom = !!t.isCustom;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedTechnique(t)}
                    className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-start gap-2 ${
                      isSelected 
                        ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-400 shadow-glow shadow-cyan-500/5' 
                        : 'bg-black/40 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-200">{t.name}</span>
                        {isCustom && (
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[7px] font-bold px-1.5 rounded font-mono">CUSTOM</span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-slate-500 mt-1 leading-snug truncate">{t.description}</p>
                    </div>
                    {isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustom(t._id || '', e)}
                        className="hover:bg-slate-900 text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
          <span>CATALOG: {techniquesList.length} PROFILES</span>
        </div>
      </div>

      {/* 2. RIGHT COLUMN: EXECUTIVE COMMAND DETAILS & MONOSPACE OUTPUT LOGS */}
      <div className="lg:col-span-2 space-y-4 h-[620px] flex flex-col justify-between">
        
        {/* Selection description bar */}
        {selectedTechnique ? (
          <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl space-y-4 shadow-xl select-text flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/5 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-cyan-400">Selected Hunt Scenario</span>
                  <h3 className="text-sm font-bold text-slate-100 mt-1 uppercase">{selectedTechnique.name}</h3>
                  <p className="text-[10.5px] text-slate-400 mt-1.5 leading-relaxed">{selectedTechnique.description}</p>
                </div>
                <span className="text-[8.5px] bg-[#111827] border border-white/5 px-2 py-1 rounded-lg font-mono font-bold uppercase text-amber-400 shrink-0">
                  {selectedTechnique.mitre}
                </span>
              </div>

              {/* Commands review grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[9.5px]">
                <div className="p-3 bg-black/40 border border-white/5 rounded-lg">
                  <span className="text-slate-500 block text-[8px] uppercase mb-1">Linux System Command</span>
                  <span className="text-cyan-400 font-mono select-all block break-all">{selectedTechnique.linux}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-lg">
                  <span className="text-slate-500 block text-[8px] uppercase mb-1">Windows PowerShell Command</span>
                  <span className="text-cyan-400 font-mono select-all block break-all">{selectedTechnique.windows || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Run button */}
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleRunHunt}
                disabled={isScanning}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold font-mono text-xs px-5 py-2.5 rounded-lg uppercase shadow-md shadow-cyan-500/5 transition-all"
              >
                {isScanning ? 'RUNNING HUNT...' : '▶ Run Hunt'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl h-24 flex items-center justify-center font-mono text-xs text-slate-500 shadow-xl">
            Select a threat hunting technique profile from the catalog list on the left to initiate command audit.
          </div>
        )}

        {/* Results output Monospace terminal */}
        <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl h-[330px] flex flex-col justify-between shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Terminal Ingest Output</span>
            </div>
            {output && output !== 'Initiating secure system call thread...' && !isScanning && (
              <button 
                onClick={handleSaveToReport}
                className="text-cyan-400 hover:underline text-[9.5px] font-mono font-bold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                Save to Report
              </button>
            )}
          </div>

          <div className="flex-1 bg-black p-4 border border-white/5 rounded-xl font-mono text-[10.5px] leading-relaxed overflow-y-auto my-3 select-text select-all max-h-[200px]">
            {output ? (
              output.split('\n').map((line, idx) => formatOutputLine(line, idx))
            ) : (
              <span className="text-slate-500 italic">No command audit logs active. Run threat hunting technique parameters.</span>
            )}
          </div>

          <div className="text-[9px] font-mono text-slate-500 flex justify-between items-center">
            <span>AUDIT TRACE: LOCAL EXECUTION</span>
            <span>LOG LINES: {output ? output.split('\n').length : 0}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
