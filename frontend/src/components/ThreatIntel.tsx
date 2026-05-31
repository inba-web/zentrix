import { useState, useEffect } from 'react';
import { 
  Compass, ShieldAlert, Cpu, Terminal, Search, Trash2, CheckCircle, AlertTriangle, Info 
} from 'lucide-react';

export default function ThreatIntel({ token }: any) {
  const [iocs, setIocs] = useState<any[]>([]);
  const [lookupValue, setLookupValue] = useState('185.220.101.5');
  const [lookupType, setLookupType] = useState('IP');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // New IOC form
  const [newType, setNewType] = useState('IP');
  const [newValue, setNewValue] = useState('');
  const [newThreat, setNewThreat] = useState('');
  const [newRep, setNewRep] = useState(85);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    fetchIOCs();
  }, []);

  const fetchIOCs = async () => {
    try {
      const res = await fetch('/api/intel/iocs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIocs(data);
      }
    } catch (err) {
      console.error('Failed to fetch IOCs:', err);
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
          threatType: newThreat,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT PANEL: IOC MANAGER REGISTRY */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Indicator Catalog Setup</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">THREAT INTELLIGENCE INVENTORIES</p>
          </div>

          {/* Form to insert new indicator */}
          <form onSubmit={handleRegisterIOC} className="space-y-3 p-3 bg-slate-950/40 border border-slate-800 rounded font-mono text-[10px]">
            <p className="text-[9px] text-blue-500 font-bold uppercase border-b border-slate-900 pb-1">[+] REGISTRATION FORCES</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 mb-1">INDICATOR TYPE</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-[#050811] border border-slate-800 px-2 py-1 text-slate-300 rounded"
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
                  className="w-full bg-[#050811] border border-slate-800 px-2 py-1 text-slate-300 rounded"
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
                placeholder="e.g. 185.220.101.5 or badurl.com"
                className="w-full bg-[#050811] border border-slate-800 px-2 py-1 text-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">THREAT TYPE ASSIGNMENT</label>
              <input 
                type="text"
                value={newThreat}
                onChange={e => setNewThreat(e.target.value)}
                placeholder="e.g. Tor Node Scanner"
                className="w-full bg-[#050811] border border-slate-800 px-2 py-1 text-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">NOTES</label>
              <textarea 
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Record community pulse links..."
                className="w-full h-12 bg-[#050811] border border-slate-800 px-2 py-1 text-slate-300 rounded resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded transition-all uppercase"
            >
              REGISTER IOC VALUE
            </button>
          </form>

          {/* IOC local list table */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">IOC Catalog Indexes ({iocs.length})</span>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {iocs.map(ioc => (
                <div key={ioc._id} className="p-2 bg-slate-950/60 border border-slate-900 rounded font-mono text-[9px] flex justify-between items-center select-text">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 uppercase">[{ioc.type}]</span>
                      <span className="text-slate-200 font-bold truncate max-w-[120px]">{ioc.value}</span>
                    </div>
                    <p className="text-[8px] text-red-400 mt-0.5 truncate">{ioc.threatType}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteIOC(ioc._id)}
                    className="p-1 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>ACTIVE ENTITIES: {iocs.length} Registries</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: INTELLIGENCE MULTI-SOURCE ANALYSIS WORKSPACE */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {/* Unified Search tool */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4 text-blue-500" />
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Global Indicators Reputation Lookup</span>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <select 
              value={lookupType}
              onChange={e => setLookupType(e.target.value)}
              className="bg-[#050811] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded focus:outline-none"
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
              className="flex-1 bg-[#050811] border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 rounded focus:outline-none focus:border-blue-500 select-text"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded transition-colors font-mono uppercase"
            >
              {loading ? 'LOOKUP...' : 'SEARCH INTEL'}
            </button>
          </form>
        </div>

        {/* Enrichment Multi-Vendor Cards */}
        {lookupResult ? (
          <div className="space-y-6 select-text">
            
            {/* VT analysis cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* VirusTotal Panel */}
              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
                <p className="text-[10px] text-blue-500 font-bold border-b border-slate-900 pb-1.5 uppercase">[X] VIRUSTOTAL API FEED</p>
                <div className="space-y-1">
                  <p className="text-slate-500">MALICIOUS ENGINES:</p>
                  <p className="text-lg font-bold text-red-500">{lookupResult.enrichment.virusTotal.maliciousVotes} / 68 Engines</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">CLASSIFICATION TARGET:</p>
                  <p className="text-slate-300 font-bold">{lookupResult.enrichment.virusTotal.category}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-900 pt-2 text-slate-500">
                  <span>LAST SCAN:</span>
                  <span>{lookupResult.enrichment.virusTotal.lastScanDate.substring(0, 10)}</span>
                </div>
              </div>

              {/* AbuseIPDB Panel */}
              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
                <p className="text-[10px] text-cyan-500 font-bold border-b border-slate-900 pb-1.5 uppercase">[X] ABUSEIPDB DATA FEED</p>
                <div className="space-y-1">
                  <p className="text-slate-500">ABUSE CONFIDENCE RATING:</p>
                  <p className="text-lg font-bold text-red-500">{lookupResult.enrichment.abuseIPDB.abuseScore}% Score</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">ISP GATEWAY:</p>
                  <p className="text-slate-300 truncate font-bold">{lookupResult.enrichment.abuseIPDB.isp}</p>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-900 pt-2 text-slate-500">
                  <span>GEOLOCAL ORIGIN:</span>
                  <span>{lookupResult.enrichment.abuseIPDB.country}</span>
                </div>
              </div>

              {/* AlienVault OTX Panel */}
              <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
                <p className="text-[10px] text-amber-500 font-bold border-b border-slate-900 pb-1.5 uppercase">[X] ALIENVAULT OTX FEEDS</p>
                <div className="space-y-1">
                  <p className="text-slate-500">COMMUNITY PULSES MATCHED:</p>
                  <p className="text-lg font-bold text-amber-400">{lookupResult.enrichment.alienVaultOTX.pulseCount} Pulses</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">KNOWN ADVERSARY GROUPS:</p>
                  <p className="text-slate-300 font-bold truncate">
                    {lookupResult.enrichment.alienVaultOTX.adversaries.join(', ') || 'APT groups unmapped'}
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] border-t border-slate-900 pt-2 text-slate-500">
                  <span>TARGETED INDUSTRIES:</span>
                  <span className="truncate max-w-[80px]">
                    {lookupResult.enrichment.alienVaultOTX.industriesTargeted.join(', ') || 'N/A'}
                  </span>
                </div>
              </div>

            </div>

            {/* Analyst recommendations summary */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Threat Intelligence Analyst Advisory</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">CORRELATED COMMUNITY THREAT REPORTS</p>

              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded font-mono text-xs text-slate-300 leading-relaxed leading-snug">
                The lookup target: <span className="text-red-400 font-bold">{lookupResult.value} ({lookupResult.type})</span> matches community indicators for active host compromise cycles. Internal operations recommended blocking network ports binding matching indicators.
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center p-8 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs text-slate-500">
            Awaiting threat intelligence query to parse indicators records from public databases.
          </div>
        )}

      </div>

    </div>
  );
}
