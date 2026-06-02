import React, { useState } from 'react';
import { 
  Mail, ShieldAlert, CheckCircle, XCircle, Terminal, Play, AlertTriangle 
} from 'lucide-react';

export default function PhishingAnalysis({ token }: any) {
  const [headers, setHeaders] = useState(`From: "ZENTRIX Security Gateway" <security-alert@zentrix-spoofed.com>
To: analyst@zentrix.local
Subject: ACTION REQUIRED: Critical Workstation Credentials Exfiltration Blocked
Date: Sun, 31 May 2026 19:15:22 +0530
Received-SPF: fail
Authentication-Results: spf=fail; dkim=fail; dmarc=fail

Dear Analyst,
Please click http://185.220.101.5/login to update your passkeys immediately. urgent attention required!`);

  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState('');

  const triggerPhishingAnalysis = async () => {
    setAnalyzing(true);
    setResults(null);
    setError('');

    try {
      const res = await fetch('/api/phishing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ headersContent: headers })
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Phishing headers analysis failed.');
      }
    } catch {
      setError('Phishing analyser gateway timed out.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT COLUMN: RAW HEADERS TEXTBIN */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Email Header paste bin</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">EML RAW PAYLOADS</p>
            </div>
          </div>

          <textarea 
            value={headers}
            onChange={e => setHeaders(e.target.value)}
            className="w-full h-[400px] bg-[#050811] border border-slate-700 p-3 text-xs font-mono text-slate-200 rounded focus:outline-none focus:border-blue-500 resize-none select-text leading-normal"
            placeholder="Paste raw email headers parameters including SPF fields..."
          />

          <button 
            onClick={triggerPhishingAnalysis}
            disabled={analyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold py-2 rounded transition-all uppercase flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {analyzing ? 'DISSECTING EML SECTIONS...' : 'ANALYZE EMAIL HEADERS'}
          </button>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/25 text-red-400 text-[10px] font-mono rounded">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>PARSER STATE: {analyzing ? 'PARSING RUNNING' : 'AWAITING CORES'}</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: PARSED RESULTS & MITIGATION ALIGNMENT */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {analyzing && (
          <div className="p-8 bg-[#111625] border border-slate-800 rounded-lg flex flex-col items-center justify-center space-y-3 h-[300px]">
            <span className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-slate-800 animate-spin"></span>
            <p className="text-xs font-mono text-slate-400">Verifying SPF configurations, parsing DKIM certificates signatures...</p>
          </div>
        )}

        {results ? (
          <div className="space-y-6 select-text">
            
            {/* KPI Risk indicators */}
            <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
                <div>
                  <p className="text-[10px] uppercase font-mono text-slate-500">AGGREGATED RISK METRIC</p>
                  <p className="text-lg font-bold text-red-500 font-mono mt-0.5">{results.score}% PHISHING THREAT</p>
                </div>
              </div>
              <span className="text-[9px] bg-red-950/40 border border-red-500/20 px-2 py-1 rounded text-red-400 font-mono font-bold uppercase">
                {results.status.toUpperCase()}
              </span>
            </div>

            {/* Header Validation fields */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Parsed Header Attributes</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">EMAIL ENVELOPE STRUCTURAL VALIDATION</p>

              <div className="space-y-2 border-b border-slate-800/80 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">ENVELOPE FROM:</span>
                  <span className="text-slate-200 font-bold">{results.sender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SUBJECT LINE:</span>
                  <span className="text-slate-200 truncate max-w-sm font-bold">{results.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SENDER REPUTATION:</span>
                  <span className={`font-bold ${results.senderReputation === 'Dangerous' ? 'text-red-500' : 'text-slate-300'}`}>{results.senderReputation}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-2.5 bg-slate-950/40 border border-slate-850 rounded">
                  <p className="text-slate-500 font-bold text-[9px] uppercase">SPF STATUS</p>
                  <p className={`mt-1 font-bold text-[10px] ${results.spfStatus === 'FAIL' ? 'text-red-400' : 'text-slate-300'}`}>{results.spfStatus}</p>
                </div>
                <div className="p-2.5 bg-slate-950/40 border border-slate-850 rounded">
                  <p className="text-slate-500 font-bold text-[9px] uppercase">DKIM STATUS</p>
                  <p className={`mt-1 font-bold text-[10px] ${results.dkimStatus === 'FAIL' ? 'text-red-400' : 'text-slate-300'}`}>{results.dkimStatus}</p>
                </div>
                <div className="p-2.5 bg-slate-950/40 border border-slate-850 rounded">
                  <p className="text-slate-500 font-bold text-[9px] uppercase">DMARC STATUS</p>
                  <p className={`mt-1 font-bold text-[10px] ${results.dmarcStatus === 'FAIL' ? 'text-red-400' : 'text-slate-300'}`}>{results.dmarcStatus}</p>
                </div>
              </div>
            </div>

            {/* Header Anomalies List */}
            {results.headerAnomalies.length > 0 && (
              <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
                <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Header Anomalies Logged</span>
                <p className="text-[10px] text-[#64748b] leading-tight mb-2">CRITICAL AUDITING ANOMALIES</p>
                
                <div className="space-y-1.5">
                  {results.headerAnomalies.map((anom: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-red-950/20 border border-red-500/20 rounded text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{anom}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Hyperlinks */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-4">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Embedded Hyperlinks scans</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">EXTRACTED HYPERLINKS RESOLUTION</p>

              <div className="space-y-2">
                {results.extractedUrls.map((u: string, idx: number) => {
                  const isSuspicious = results.suspiciousUrls.includes(u);
                  return (
                    <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-900 rounded flex justify-between items-center select-text">
                      <p className="text-slate-300 font-bold truncate max-w-sm">{u}</p>
                      <span className={`font-bold text-[10px] ${isSuspicious ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                        {isSuspicious ? 'Suspicious Link' : 'Safe Link'}
                      </span>
                    </div>
                  );
                })}

                {results.extractedUrls.length === 0 && (
                  <p className="text-xs text-slate-500 text-center font-mono p-2">No links identified in body.</p>
                )}
              </div>
            </div>

            {/* Phishing keywords matched */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Urgent Keyword Detections</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">HARVESTING KEYWORD MATCHES</p>
              
              <div className="flex gap-2 flex-wrap">
                {results.matchedKeywords.map((word: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-red-950/40 border border-red-500/20 text-red-400 font-mono font-bold rounded uppercase text-[8px]">
                    {word}
                  </span>
                ))}

                {results.matchedKeywords.length === 0 && (
                  <p className="text-xs text-slate-500 text-center font-mono w-full p-2">No phishing urgent keywords matched.</p>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center p-8 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs text-slate-500">
            Awaiting raw email headers logs to activate structural parsing and VirusTotal link resolution.
          </div>
        )}

      </div>

    </div>
  );
}
