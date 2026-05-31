import { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Mail, Clock, CheckCircle, HelpCircle, FileCheck2 } from 'lucide-react';

export default function Reporting({ token }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [recipient, setRecipient] = useState('soc-director@enterprise.com');
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports list:', err);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipientEmail: recipient })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Report generated successfully.');
        fetchReports(); // Refresh history table
      }
    } catch {
      setSuccessMsg('Report compiler gateway timeout.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 1. LEFT COLUMN: REPORT COMPILER CONTROLS */}
      <div className="lg:col-span-1 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[650px] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">PDF Report Compiler</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">12-HOUR CRON SCHEDULER</p>
            </div>
          </div>

          {/* Form to manual generate report */}
          <form onSubmit={handleGenerateReport} className="space-y-3 p-3 bg-slate-950/40 border border-slate-850 rounded font-mono text-[10px]">
            <p className="text-[9px] text-blue-500 font-bold uppercase border-b border-slate-900 pb-1">[+] MANUAL DISPATCH FORM</p>
            
            <div>
              <label className="block text-slate-500 mb-1">RECIPIENT EMAIL</label>
              <input 
                type="email"
                required
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder="soc-director@enterprise.com"
                className="w-full bg-[#050811] border border-slate-800 px-2.5 py-1.5 text-slate-200 rounded text-xs select-all"
              />
            </div>

            <button 
              type="submit"
              disabled={generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-all uppercase flex items-center justify-center gap-1.5 text-xs font-mono"
            >
              <FileCheck2 className="w-4 h-4" />
              {generating ? 'COMPILING SECURITY METRICS...' : 'DISPATCH PDF SECURE'}
            </button>
          </form>

          {successMsg && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded select-text">
              {successMsg}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500">
          <span>COMPILER: pdfkit Engine v0.15.0</span>
        </div>
      </div>

      {/* 2. RIGHT PANEL: EMAIL DISPATCH LOGS & FILE DIRECTORIES */}
      <div className="lg:col-span-2 space-y-6 h-[650px] overflow-y-auto pr-1">
        
        {/* Table list of reports */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Email Dispatch & PDF Records Queue</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">SMTP DISPATCH VERIFICATIONS</p>
          </div>

          <div className="overflow-x-auto select-text">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase font-mono text-[9px]">
                  <th className="p-2.5">Date Ingestion</th>
                  <th className="p-2.5">Recipient</th>
                  <th className="p-2.5">Security Posture</th>
                  <th className="p-2.5">Alerts Count</th>
                  <th className="p-2.5">Delivery Status</th>
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(report.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-slate-300 truncate max-w-[120px]">{report.recipient}</td>
                    <td className="p-2.5 text-slate-300 font-bold">{report.securityScore}% Posture</td>
                    <td className="p-2.5 text-slate-400">{report.alertsCount} Cases</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold uppercase">
                        {report.deliveryStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <a 
                        href={`/api/reports/download/${report.fileName}`} 
                        download
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-1 rounded inline-block text-blue-400 hover:text-blue-300"
                        title="Download PDF Document File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}

                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                      No compiled dispatches located on PDF system registries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
