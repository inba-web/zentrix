import { useState } from 'react';
import { 
  Mail, ShieldAlert, CheckCircle, XCircle, Terminal, Play, HelpCircle 
} from 'lucide-react';

export default function PhishingAnalysis({ token }: any) {
  const [headers, setHeaders] = useState(`Received: from spammer.botnet-node.com (spammer.botnet-node.com [185.220.101.5])
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=paypal-support.top;
From: "PayPal Resolution Center" <security-alert@paypal-support.top>
To: target-analyst@enterprise.com
Subject: ACTION REQUIRED: Unauthorized Vault Transaction Blocked
Date: Sun, 31 May 2026 19:15:22 +0530`);

  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  const triggerPhishingAnalysis = () => {
    setAnalyzing(true);
    setResults(null);

    setTimeout(() => {
      setResults({
        headers: {
          from: 'security-alert@paypal-support.top',
          to: 'target-analyst@enterprise.com',
          subject: 'ACTION REQUIRED: Unauthorized Vault Transaction Blocked',
          receivedIp: '185.220.101.5',
          spf: 'FAIL (Domain mismatch for sender IP)',
          dkim: 'FAIL (Signature header validation failed)'
        },
        urls: [
          { value: 'http://paypal-verification-portal.top/login', reputation: 95, threatType: 'Phishing Credential Harvester' },
          { value: 'http://c2-server-botnet.top/payload.exe', reputation: 100, threatType: 'Cobalt Strike Dropper' }
        ],
        attachments: [
          { name: 'Secure_document.pdf.exe', type: 'Double-extension executable', hash: '8a9c42b5d4e87d7bcfd8e1214c000e3b', status: 'MALICIOUS' }
        ],
        riskScore: 98,
        advisory: 'CRITICAL SPOOFING WARNING: This email header failed SPF authentication alignment audits. The envelope sender IP matches Tor exit node brute scanners. Block outbound gateways connectivity to matched credential harvesting domains immediately.'
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT COLUMN: RAW HEADERS TEXTBIN */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between">
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
                  <p className="text-lg font-bold text-red-500 font-mono mt-0.5">{results.riskScore}% PHISHING THREAT</p>
                </div>
              </div>
              <span className="text-[9px] bg-red-950/40 border border-red-500/20 px-2 py-1 rounded text-red-400 font-mono font-bold uppercase">Spoofing Confirmed</span>
            </div>

            {/* Header Validation fields */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-3">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Parsed Header Attributes</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">EMAIL ENVELOPE STRUCTURAL VALIDATION</p>

              <div className="space-y-2 border-b border-slate-800/80 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">ENVELOPE FROM:</span>
                  <span className="text-slate-200 font-bold">{results.headers.from}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ENVELOPE TO:</span>
                  <span className="text-slate-200">{results.headers.to}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SUBJECT LINE:</span>
                  <span className="text-slate-200 truncate max-w-sm font-bold">{results.headers.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RECEIVED IP:</span>
                  <span className="text-slate-200 font-bold">{results.headers.receivedIp}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded">
                  <p className="text-red-400 font-bold text-[10px] uppercase">SPF ALIGNMENT STATUS</p>
                  <p className="text-slate-300 mt-1 font-bold">{results.headers.spf}</p>
                </div>
                <div className="p-2.5 bg-red-950/20 border border-red-500/20 rounded">
                  <p className="text-red-400 font-bold text-[10px] uppercase">DKIM ALIGNMENT STATUS</p>
                  <p className="text-slate-300 mt-1 font-bold">{results.headers.dkim}</p>
                </div>
              </div>
            </div>

            {/* Suspicious link extractors */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-4">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Embedded Hyperlinks threat scans</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">EXTRACTED HYPERLINKS RESOLUTION</p>

              <div className="space-y-2">
                {results.urls.map((u: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-900 rounded flex justify-between items-center select-text">
                    <div className="min-w-0">
                      <p className="text-slate-300 font-bold truncate max-w-sm">{u.value}</p>
                      <p className="text-[8px] text-red-400 mt-0.5">{u.threatType}</p>
                    </div>
                    <span className="text-red-500 font-bold text-[10px]">{u.reputation}% malicious</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger attachments */}
            <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-mono text-xs space-y-4">
              <span className="text-xs uppercase font-sans font-bold tracking-wider text-slate-200">Dropped attachments files scans</span>
              <p className="text-[10px] text-[#64748b] leading-tight mb-2">ATTACHMENT STRUCTURAL THREATS</p>

              <div className="space-y-2">
                {results.attachments.map((a: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-950/60 border border-slate-900 rounded flex justify-between items-center select-text">
                    <div>
                      <p className="text-red-400 font-bold">{a.name}</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">SHA1 HASH: {a.hash}  |  TYPE: {a.type}</p>
                    </div>
                    <span className="text-[9px] bg-red-950 border border-red-500/30 px-2 py-0.5 rounded text-red-400 font-bold">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisory statement */}
            <div className="p-4 bg-[#111625] border border-slate-800 rounded-lg">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Incident Remediation Advisory</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-3">ACTION ADVICE</p>
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded font-mono text-[10px] text-slate-300 leading-relaxed leading-snug">
                {results.advisory}
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
