import React, { useState, useEffect } from 'react';
import { 
  Compass, ShieldAlert, Cpu, Terminal, Search, Trash2, CheckCircle, AlertTriangle, Info, Download, ArrowUpDown, Key, Edit, Save, Plus
} from 'lucide-react';

interface IOC {
  _id: string;
  type: string;
  value: string;
  threatType: string;
  reputation: number;
  source: string;
  notes: string;
  createdAt: string;
}

interface ApiStatus {
  virustotal: boolean;
  abuseipdb: boolean;
  otx: boolean;
}

export default function ThreatIntel({ token }: any) {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [lookupValue, setLookupValue] = useState('185.220.101.5');
  const [lookupType, setLookupType] = useState('IP');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ virustotal: false, abuseipdb: false, otx: false });
  const [activeTab, setActiveTab] = useState<'search' | 'rules'>('search');

  // Rules manager state
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [ruleEditorContent, setRuleEditorContent] = useState('');
  const [ruleEditorFilename, setRuleEditorFilename] = useState('');
  const [ruleEditorType, setRuleEditorType] = useState<'yara' | 'sigma'>('yara');
  const [isNewRule, setIsNewRule] = useState(false);

  // Sorting state for IOCs
  const [sortField, setSortField] = useState<'value' | 'type' | 'reputation'>('value');
  const [sortAsc, setSortAsc] = useState(true);

  // New IOC registration form
  const [newType, setNewType] = useState('IP');
  const [newValue, setNewValue] = useState('');
  const [newThreat, setNewThreat] = useState('');
  const [newRep, setNewRep] = useState(75);
  const [newNotes, setNewNotes] = useState('');

  // Expandable JSON section
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  useEffect(() => {
    fetchIOCs();
    checkApiStatus();
    fetchRules();
  }, []);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('/api/intel/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiStatus(data);
      }
    } catch (e) {
      console.error('Failed to retrieve API configurations', e);
    }
  };

  const fetchIOCs = async () => {
    try {
      const res = await fetch('/api/intel/iocs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIocs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch IOCs:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/malware/rules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch malware analysis rules', e);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupValue.trim()) return;

    setLoading(true);
    setLookupResult(null);

    try {
      const res = await fetch('/api/intel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: lookupType, value: lookupValue })
      });
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
      }
    } catch (err) {
      console.error('Threat intelligence lookup timeout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterIOC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    try {
      const res = await fetch('/api/intel/iocs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: newType,
          value: newValue,
          threatType: newThreat || 'Analyst Custom Entry',
          reputation: newRep,
          notes: newNotes
        })
      });
      if (res.ok) {
        fetchIOCs(); // Refresh catalog list
        setNewValue('');
        setNewThreat('');
        setNewNotes('');
      }
    } catch (err) {
      console.error('Failed to register IOC:', err);
    }
  };

  const handleDeleteIOC = async (id: string) => {
    try {
      const res = await fetch(`/api/intel/iocs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchIOCs();
      }
    } catch (err) {
      console.error('Failed to retract IOC:', err);
    }
  };

  // Rule management CRUD actions
  const selectRule = async (filename: string) => {
    setIsNewRule(false);
    try {
      const res = await fetch(`/api/malware/rules/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRule(data);
        setRuleEditorContent(data.content || '');
        setRuleEditorFilename(data.filename || '');
        setRuleEditorType(data.filename.endsWith('.yar') || data.filename.endsWith('.yara') ? 'yara' : 'sigma');
      }
    } catch (e) {
      console.error('Failed to select rule details', e);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleEditorFilename || !ruleEditorContent) return;

    try {
      const res = await fetch('/api/malware/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: ruleEditorFilename,
          content: ruleEditorContent
        })
      });
      if (res.ok) {
        fetchRules();
        setIsNewRule(false);
        setSelectedRule({ filename: ruleEditorFilename, content: ruleEditorContent });
      }
    } catch (e) {
      console.error('Failed to save rule', e);
    }
  };

  const handleDeleteRule = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const res = await fetch(`/api/malware/rules/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRules();
        setSelectedRule(null);
        setRuleEditorContent('');
        setRuleEditorFilename('');
      }
    } catch (e) {
      console.error('Failed to delete rule', e);
    }
  };

  const initNewRule = () => {
    setIsNewRule(true);
    setSelectedRule(null);
    setRuleEditorFilename(ruleEditorType === 'yara' ? 'custom_rule.yar' : 'custom_rule.yml');
    setRuleEditorContent(
      ruleEditorType === 'yara' 
        ? `// Custom YARA rule template\nrule MyCustomRule {\n    meta:\n        description = "Detects custom binary signatures"\n    strings:\n        $my_hex = { E2 34 56 78 }\n        $my_string = "sus_payload"\n    condition:\n        $my_hex or $my_string\n}`
        : `# Custom Sigma behavioral rule\ntitle: My Custom Rule\nid: ${Math.random().toString(36).substring(7)}\ndescription: Detects behavioral string injections\nlogsource:\n    product: windows\n    service: sysmon\ndetection:\n    keywords:\n        - "sus_command"\n    condition: keywords`
    );
  };

  // Sort function for IOC list
  const handleSort = (field: 'value' | 'type' | 'reputation') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSortedIOCs = () => {
    const list = [...iocs];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  };

  // Export IOCs to CSV format
  const exportIOCsToCSV = () => {
    if (iocs.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Type,Value,Threat Type,Reputation score,Source,Notes,Created At\n';

    iocs.forEach(ioc => {
      const row = [
        `"${ioc.type}"`,
        `"${ioc.value}"`,
        `"${ioc.threatType}"`,
        `"${ioc.reputation}"`,
        `"${ioc.source}"`,
        `"${ioc.notes.replace(/"/g, '""')}"`,
        `"${ioc.createdAt}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zentrix_threat_intel_iocs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getReputationBadgeColor = (rep: number) => {
    if (rep >= 80) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (rep >= 50) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  };

  const sortedIOCs = getSortedIOCs();

  // Score circular SVG gauge helpers
  const score = lookupResult?.enrichment?.virusTotal?.reputationScore || 0;
  const radius = 40;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-6 font-sans text-white select-none relative h-full">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>

      {/* Tabs bar */}
      <div className="flex border-b border-white/5 bg-[#0D1117]/80 text-xs font-mono rounded-t-xl overflow-hidden shadow-lg">
        <button 
          onClick={() => setActiveTab('search')}
          className={`px-5 py-3 border-r border-white/5 transition-all flex items-center gap-2 ${
            activeTab === 'search' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4" />
          Enrichment Reputation & Catalog
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 transition-all flex items-center gap-2 ${
            activeTab === 'rules' ? 'bg-[#0D1117] text-cyan-400 font-bold border-b border-b-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit className="w-4 h-4" />
          YARA / Sigma Rule Manager
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. LEFT PANEL: IOC MANAGER REGISTRY */}
          <div className="lg:col-span-1 p-5 bg-[#0D1117] border border-white/5 rounded-xl h-[560px] flex flex-col justify-between overflow-y-auto shadow-xl">
            <div className="space-y-5">
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Indicator Catalog Setup</span>
                <p className="text-[10px] text-slate-500 leading-tight font-mono">THREAT INTELLIGENCE INVENTORIES</p>
              </div>

              {/* Form to insert new indicator */}
              <form onSubmit={handleRegisterIOC} className="space-y-3 p-3.5 bg-black/40 border border-white/5 rounded-lg font-mono text-[10px]">
                <p className="text-[9px] text-cyan-400 font-bold uppercase border-b border-white/5 pb-1">[+] REGISTRATION FORCES</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1">INDICATOR TYPE</label>
                    <select 
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none"
                    >
                      <option value="IP">IP Address</option>
                      <option value="Domain">Domain</option>
                      <option value="Hash">File Hash</option>
                      <option value="URL">URL link</option>
                      <option value="Registry Key">Registry Key</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">MALICIOUS %</label>
                    <input 
                      type="number"
                      value={newRep}
                      onChange={e => setNewRep(parseInt(e.target.value))}
                      className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none"
                      max="100" min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">INDICATOR VALUE</label>
                  <input 
                    type="text"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    placeholder="e.g. 185.220.101.5"
                    className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">THREAT TYPE ASSIGNMENT</label>
                  <input 
                    type="text"
                    value={newThreat}
                    onChange={e => setNewThreat(e.target.value)}
                    placeholder="e.g. Tor Node Exit Point"
                    className="w-full bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded focus:outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">NOTES</label>
                  <textarea 
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    placeholder="Describe context alerts..."
                    className="w-full h-11 bg-[#111827] border border-white/10 px-2 py-1 text-slate-300 rounded resize-none focus:outline-none focus:border-cyan-500/30"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-1.5 rounded-lg transition-all uppercase"
                >
                  REGISTER IOC VALUE
                </button>
              </form>

              {/* IOC local list table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">IOC Catalog Indexes ({iocs.length})</span>
                  <button 
                    onClick={exportIOCsToCSV}
                    className="text-[9px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                </div>
                
                {/* Headers */}
                <div className="grid grid-cols-6 border-b border-white/5 pb-1 font-mono text-[8.5px] text-slate-500 uppercase font-bold">
                  <button onClick={() => handleSort('type')} className="col-span-2 text-left flex items-center gap-0.5 hover:text-white">TYPE <ArrowUpDown className="w-2 h-2" /></button>
                  <button onClick={() => handleSort('value')} className="col-span-3 text-left flex items-center gap-0.5 hover:text-white">VALUE <ArrowUpDown className="w-2 h-2" /></button>
                  <button onClick={() => handleSort('reputation')} className="col-span-1 text-right flex items-center gap-0.5 hover:text-white justify-end">SCORE <ArrowUpDown className="w-2 h-2" /></button>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {sortedIOCs.map((ioc, idx) => (
                    <div key={ioc._id || idx} className="grid grid-cols-6 p-2 bg-black/40 border border-white/5 rounded-lg font-mono text-[9px] items-center hover:border-cyan-500/10 transition-colors">
                      <span className="col-span-2 text-slate-500 uppercase truncate pr-1">[{ioc.type}]</span>
                      <span className="col-span-3 text-slate-200 font-bold truncate pr-1" title={ioc.value}>{ioc.value}</span>
                      <div className="col-span-1 flex items-center justify-end gap-1.5">
                        <span className={`text-[8.5px] font-bold ${getReputationBadgeColor(ioc.reputation).split(' ')[1]}`}>{ioc.reputation}%</span>
                        <button 
                          onClick={() => handleDeleteIOC(ioc._id)}
                          className="hover:bg-slate-900 text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {sortedIOCs.length === 0 && (
                    <p className="text-slate-500 text-center py-6 font-mono text-[9px]">No catalog indexes mapped.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
              <span>ACTIVE ENTITIES: {iocs.length}</span>
              <span>CSV DOWNLOAD: READY</span>
            </div>
          </div>

          {/* 2. RIGHT PANEL: INTELLIGENCE MULTI-SOURCE SEARCH & REPUTATION WORKSPACE */}
          <div className="lg:col-span-2 space-y-4 h-[560px] overflow-y-auto pr-1">
            
            {/* Unified Search tool */}
            <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Indicator Reputation Lookup</span>
              </div>

              <form onSubmit={handleLookup} className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                <select 
                  value={lookupType}
                  onChange={e => setLookupType(e.target.value)}
                  className="bg-[#111827] border border-white/10 text-slate-300 text-xs px-2.5 py-2 rounded-lg focus:outline-none"
                >
                  <option value="IP">IP Address</option>
                  <option value="Domain">Domain</option>
                  <option value="Hash">File Hash</option>
                  <option value="URL">URL link</option>
                </select>
                <input 
                  type="text"
                  value={lookupValue}
                  onChange={e => setLookupValue(e.target.value)}
                  placeholder="e.g. 185.220.101.5"
                  className="flex-1 bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-cyan-400 rounded-lg focus:outline-none focus:border-cyan-500/40"
                />
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors font-mono uppercase"
                >
                  {loading ? 'LOOKUP...' : 'SEARCH'}
                </button>
              </form>
            </div>

            {/* API Status Check Setup Guide */}
            {(!apiStatus.virustotal || !apiStatus.abuseipdb || !apiStatus.otx) && (
              <div className="p-4 bg-[#0D1117] border border-[#F59E0B]/30 rounded-xl flex gap-3 text-xs leading-relaxed relative overflow-hidden shadow-lg">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#F59E0B]/50"></div>
                <Key className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[#F59E0B] uppercase font-mono text-[10.5px]">Enrichment API Setup Required</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Some external feeds are operating in local offline simulation mode. For live validation, configure the keys inside `.env` configuration file:
                  </p>
                  <div className="flex flex-wrap gap-3 font-mono text-[9px] pt-1">
                    <span className={apiStatus.virustotal ? 'text-emerald-400' : 'text-slate-500'}>VirusTotal: {apiStatus.virustotal ? '✓ SET' : '✗ MISSING (VIRUSTOTAL_API_KEY)'}</span>
                    <span className={apiStatus.abuseipdb ? 'text-emerald-400' : 'text-slate-500'}>AbuseIPDB: {apiStatus.abuseipdb ? '✓ SET' : '✗ MISSING (ABUSEIPDB_API_KEY)'}</span>
                    <span className={apiStatus.otx ? 'text-emerald-400' : 'text-slate-500'}>OTX Pulses: {apiStatus.otx ? '✓ SET' : '✗ MISSING (OTX_API_KEY)'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Enrichment Multi-Vendor Cards */}
            {lookupResult ? (
              <div className="space-y-4 select-text">
                
                {/* VT analysis cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Gauge Arc & Geolocation card */}
                  <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs flex flex-col justify-between items-center shadow-lg relative overflow-hidden text-center">
                    <p className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 uppercase w-full">RISK SCORE ASSESS</p>
                    
                    {/* SVG Gauge */}
                    <div className="relative flex items-center justify-center my-3">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          className="text-white/5"
                          strokeWidth={stroke}
                          stroke="currentColor"
                          fill="transparent"
                          r={normalizedRadius}
                          cx="40"
                          cy="40"
                        />
                        <circle
                          className="text-red-500 transition-all duration-1000 shadow-glow"
                          strokeWidth={stroke}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r={normalizedRadius}
                          cx="40"
                          cy="40"
                        />
                      </svg>
                      <div className="absolute text-sm font-bold text-slate-100 font-mono">
                        {score}%
                      </div>
                    </div>

                    <div className="space-y-1 font-mono text-[10px] w-full text-center">
                      <p className="text-slate-500">GEOLOCAL ORIGIN:</p>
                      <p className="text-slate-200 font-bold">
                        🇳🇱 {lookupResult.enrichment?.abuseIPDB?.country || 'Netherlands (NL)'}
                      </p>
                    </div>
                  </div>

                  {/* VirusTotal Panel */}
                  <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs flex flex-col justify-between shadow-lg">
                    <p className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 uppercase">VIRUSTOTAL FEEDS</p>
                    <div className="space-y-3 py-2 text-[10px]">
                      <div>
                        <p className="text-slate-500 text-[8.5px] uppercase">Malicious Engines:</p>
                        <p className="text-sm font-bold text-red-400">
                          {lookupResult.enrichment?.virusTotal?.maliciousVotes || 0} / 68
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[8.5px] uppercase">Threat Category Label:</p>
                        <p className="text-slate-200 font-bold truncate max-w-[150px]">
                          {lookupResult.enrichment?.virusTotal?.category || 'Tor Exit Node'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[8px] border-t border-white/5 pt-2 text-slate-500">
                      <span>LAST ANALYSIS:</span>
                      <span>{lookupResult.enrichment?.virusTotal?.lastScanDate?.substring(11, 19) || 'N/A'} IST</span>
                    </div>
                  </div>

                  {/* AbuseIPDB Panel */}
                  <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs flex flex-col justify-between shadow-lg">
                    <p className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 uppercase">ABUSEIPDB METADATA</p>
                    <div className="space-y-3 py-2 text-[10px]">
                      <div>
                        <p className="text-slate-500 text-[8.5px] uppercase">Abuse Score Rating:</p>
                        <p className="text-sm font-bold text-red-400">
                          {lookupResult.enrichment?.abuseIPDB?.abuseScore || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[8.5px] uppercase">ISP Gateway ISP:</p>
                        <p className="text-slate-200 font-bold truncate max-w-[150px]" title={lookupResult.enrichment?.abuseIPDB?.isp}>
                          {lookupResult.enrichment?.abuseIPDB?.isp || 'DigitalOcean LLC'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[8px] border-t border-white/5 pt-2 text-slate-500">
                      <span>REPORTS MATCH:</span>
                      <span>{lookupResult.enrichment?.abuseIPDB?.totalReports || 0} hits</span>
                    </div>
                  </div>

                </div>

                {/* Correlated pulses / threat details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pulse detail */}
                  <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs space-y-2.5 shadow-lg">
                    <p className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 uppercase">ALIENVAULT OTX FEEDS</p>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">COMMUNITY PULSES:</span>
                        <span className="text-amber-400 font-bold">{lookupResult.enrichment?.alienVaultOTX?.pulseCount || 0} Pulses</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">KNOWN ADVERSARY:</span>
                        <span className="text-slate-200 truncate max-w-[160px]" title={lookupResult.enrichment?.alienVaultOTX?.adversaries?.join(', ')}>
                          {lookupResult.enrichment?.alienVaultOTX?.adversaries?.join(', ') || 'No groups linked'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">INDUSTRIES IMPACTED:</span>
                        <span className="text-slate-200 truncate max-w-[160px]" title={lookupResult.enrichment?.alienVaultOTX?.industriesTargeted?.join(', ')}>
                          {lookupResult.enrichment?.alienVaultOTX?.industriesTargeted?.join(', ') || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* URLHaus Details */}
                  <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs space-y-2.5 shadow-lg">
                    <p className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 uppercase">URLHAUS THREAT INTEL</p>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">HOST STATUS:</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                          lookupResult.enrichment?.urlHaus?.status === 'online' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {lookupResult.enrichment?.urlHaus?.status || 'offline'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">MALWARE PAYLOAD TYPE:</span>
                        <span className="text-slate-200">{lookupResult.enrichment?.urlHaus?.threatType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">INTEL REPORTER:</span>
                        <span className="text-slate-200">{lookupResult.enrichment?.urlHaus?.reporter || 'ZENTRIX'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analyst Advisory note */}
                <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl shadow-lg relative">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Threat Intelligence Analyst Advisory</span>
                  <p className="text-[9px] text-slate-500 leading-tight font-mono mb-3">CORRELATED COMMUNITY THREAT REPORTS</p>
                  <p className="p-3 bg-black/40 border border-white/5 rounded-lg font-mono text-xs text-slate-350 leading-relaxed">
                    {lookupResult.localNotes || 'Reputation audit finished. Blocking ports matching this endpoint range is recommended.'}
                  </p>
                </div>

                {/* Raw JSON expandable section */}
                <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0D1117]">
                  <button
                    onClick={() => setShowJsonRaw(!showJsonRaw)}
                    className="w-full text-left p-3.5 bg-black/20 text-xs font-mono font-bold text-slate-400 flex items-center justify-between"
                  >
                    <span>Raw JSON Reputation Package</span>
                    <span>{showJsonRaw ? 'Collapse' : 'Expand'}</span>
                  </button>
                  {showJsonRaw && (
                    <pre className="p-4 bg-black text-[9px] text-emerald-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(lookupResult, null, 2)}
                    </pre>
                  )}
                </div>

              </div>
            ) : (
              <div className="h-[360px] flex items-center justify-center p-8 bg-[#0D1117] border border-white/5 rounded-xl font-mono text-xs text-slate-500 shadow-xl">
                Awaiting threat intelligence query to parse indicators records from public databases.
              </div>
            )}

          </div>

        </div>
      )}

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[560px] select-text">
          
          {/* Rules inventory catalog */}
          <div className="lg:col-span-1 p-5 bg-[#0D1117] border border-white/5 rounded-xl h-full flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Rules Manager</span>
                  <p className="text-[10px] text-slate-500 leading-tight font-mono">SIGNATURES & BEHAVIOR</p>
                </div>
                <button
                  onClick={initNewRule}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black text-[9px] px-2 py-1 rounded font-bold uppercase flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  New Rule
                </button>
              </div>

              {/* Lists of YARA & Sigma rules */}
              <div className="space-y-3">
                <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">ACTIVE SIGNATURES ({rules.length})</span>
                <div className="space-y-1.5 overflow-y-auto max-h-[400px] pr-1">
                  {rules.map((rule, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectRule(rule.filename)}
                      className={`p-2 border rounded-lg cursor-pointer transition-all flex justify-between items-center font-mono text-[9px] ${
                        selectedRule?.filename === rule.filename
                          ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-400'
                          : 'bg-black/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-slate-200 font-bold truncate">{rule.filename}</p>
                        <p className="text-[8px] text-slate-500 truncate mt-0.5">{rule.description}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 border rounded uppercase text-[7px] font-bold ${
                        rule.type === 'yara' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {rule.type}
                      </span>
                    </div>
                  ))}
                  {rules.length === 0 && (
                    <p className="text-slate-500 text-center py-10 font-mono text-[10px]">No rules registered.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
              <span>SCAN PATHS: /rules</span>
              <button 
                onClick={fetchRules}
                className="text-[9px] text-cyan-400 hover:underline"
              >
                Reload
              </button>
            </div>
          </div>

          {/* Rule editor workspace */}
          <div className="lg:col-span-2 bg-[#0D1117] border border-white/5 rounded-xl h-full flex flex-col justify-between shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">
                  {isNewRule ? 'Compose New Rule' : 'Rule Signature Editor'}
                </span>
              </div>
              {!isNewRule && selectedRule && (
                <button
                  onClick={() => handleDeleteRule(selectedRule.filename)}
                  className="text-red-400 hover:underline text-[9px] font-mono font-bold"
                >
                  DELETE RULE
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRule} className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8.5px] uppercase font-mono text-slate-500 mb-1">Rule Filename</label>
                    <input
                      type="text"
                      required
                      value={ruleEditorFilename}
                      onChange={e => setRuleEditorFilename(e.target.value)}
                      placeholder="e.g. exploit_rule.yar"
                      className="w-full bg-black border border-white/10 px-3 py-1.5 text-xs font-mono text-cyan-400 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] uppercase font-mono text-slate-500 mb-1">Rule Class Type</label>
                    <select
                      value={ruleEditorType}
                      onChange={e => {
                        const val = e.target.value as 'yara' | 'sigma';
                        setRuleEditorType(val);
                        if (isNewRule) {
                          setRuleEditorFilename(val === 'yara' ? 'custom_rule.yar' : 'custom_rule.yml');
                          setRuleEditorContent(val === 'yara' 
                            ? `rule Custom_Rule {\n    strings:\n        $s1 = "malicious_string"\n    condition:\n        $s1\n}`
                            : `title: Custom Rule\ndetection:\n    keywords:\n        - "malicious_cmd"\n    condition: keywords`
                          );
                        }
                      }}
                      className="w-full bg-black border border-white/10 px-2.5 py-1.5 text-xs font-mono text-slate-350 rounded-lg focus:outline-none"
                    >
                      <option value="yara">YARA (.yar/.yara)</option>
                      <option value="sigma">Sigma (.yml/.yaml)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[8.5px] uppercase font-mono text-slate-500 mb-1">Rule Syntax Content</label>
                  <textarea
                    value={ruleEditorContent}
                    onChange={e => setRuleEditorContent(e.target.value)}
                    className="w-full h-72 bg-black border border-white/10 p-3 text-xs font-mono text-slate-200 rounded-lg resize-none focus:outline-none focus:border-cyan-500/30 leading-relaxed select-text"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRule(null);
                    setRuleEditorFilename('');
                    setRuleEditorContent('');
                    setIsNewRule(false);
                  }}
                  className="bg-black border border-white/10 hover:border-white/20 text-slate-400 text-[10px] px-4 py-2 rounded-lg font-mono font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-black text-[10px] px-5 py-2 rounded-lg font-mono font-bold uppercase transition-all flex items-center gap-1 shadow-md shadow-cyan-500/5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Rule
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Live IOC Marquee Scrolling Ticker */}
      <div className="bg-black/60 border border-white/5 p-2 rounded-xl overflow-hidden font-mono text-[9px] text-cyan-400 relative h-7 shrink-0 flex items-center shadow-inner mt-4">
        <div className="animate-marquee whitespace-nowrap absolute flex gap-8">
          {(iocs ?? []).map((ioc, idx) => (
            <span key={idx} className="mr-6 shrink-0 flex items-center gap-1.5 select-text">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-ping"></span>
              <strong>[{ioc.type}]</strong> {ioc.value} - <span className="text-red-400 font-bold">{ioc.threatType} ({ioc.reputation}%)</span>
            </span>
          ))}
          {(iocs ?? []).length === 0 && (
            <span className="shrink-0">&bull; Threat Intelligence Feed Active: Awaiting Indicator Catalog mapping.</span>
          )}
        </div>
      </div>

    </div>
  );
}
