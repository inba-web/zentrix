import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { ShieldAlert, Cpu, Activity, Server, HardDrive, ShieldCheck, Download, RefreshCw, AlertOctagon } from 'lucide-react';
import { RootState, setLiveTelemetry, addLiveAlert, setLiveAlerts, addWebsocketLog } from '../store';

const COLORS = ['#ef4444', '#f59e0b', '#39ff14', '#00ff66'];

export default function Dashboard() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const liveTelemetry = useSelector((state: RootState) => state.dashboard.liveTelemetry);
  const liveAlerts = useSelector((state: RootState) => state.dashboard.liveAlerts);
  
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  // Sliding history tracker for charts
  useEffect(() => {
    if (liveTelemetry) {
      setTelemetryHistory(prev => {
        const next = [...prev, {
          time: new Date().toLocaleTimeString().substring(3, 8),
          cpu: parseFloat(liveTelemetry.cpuUsage),
          ram: parseFloat(liveTelemetry.ramUsage),
          disk: parseFloat(liveTelemetry.diskUsage),
          download: parseFloat(liveTelemetry.network?.download || 0),
          upload: parseFloat(liveTelemetry.network?.upload || 0)
        }];
        return next.slice(-12); // Keep last 12 points
      });
    }
  }, [liveTelemetry]);

  if (!liveTelemetry) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center space-y-4 font-mono text-xs text-cyber-primary bg-cyber-card border border-cyber-border rounded-lg shadow-2xl">
        <RefreshCw className="w-8 h-8 text-cyber-accent animate-spin" />
        <span className="tracking-widest uppercase animate-pulse">Awaiting Unified Telemetry Stream...</span>
      </div>
    );
  }

  // Calculate live risk ratings
  const criticalCount = liveAlerts.filter((a: any) => a.severity === 'CRITICAL').length;
  const highCount = liveAlerts.filter((a: any) => a.severity === 'HIGH').length;
  const securityScore = Math.max(30, 98 - (criticalCount * 10 + highCount * 4));
  const riskScore = Math.min(100, (criticalCount * 15 + highCount * 5));

  const severityPieData = [
    { name: 'CRITICAL', value: criticalCount },
    { name: 'HIGH', value: highCount },
    { name: 'MEDIUM', value: 4 },
    { name: 'LOW', value: 3 }
  ];

  const handleGenerateReport = async (type: string) => {
    setReportGenerating(true);
    setReportMsg('');
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reportType: type })
      });
      const data = await res.json();
      if (res.ok) {
        setReportMsg(`Successfully generated local report. Download initiated...`);
        // Trigger actual download of PDF/CSV
        const stamp = data.report.fileName;
        const fileToDownload = type === 'CSV' ? stamp.replace('.pdf', '.csv') : stamp;
        window.open(`/api/reports/download/${fileToDownload}?token=${token}`, '_blank');
      } else {
        setReportMsg(data.error || 'Failed to generate report.');
      }
    } catch {
      setReportMsg('Connection error to Reporting engine.');
    } finally {
      setReportGenerating(false);
      setTimeout(() => setReportMsg(''), 5000);
    }
  };

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* HEADER SECTION WITH QUICK REPORT BUTTONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-cyber-card border border-cyber-border rounded-lg shadow-lg">
        <div>
          <h1 className="text-lg font-bold tracking-widest text-slate-100 font-mono">SOC COMMAND METRICS OVERVIEW</h1>
          <p className="text-[10px] text-cyber-primary font-mono uppercase tracking-wider mt-1">Real-time status of threat intelligence and endpoint arrays</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0 items-center">
          {reportMsg && (
            <span className="text-[10px] font-mono text-cyber-accent animate-pulse mr-2">{reportMsg}</span>
          )}
          <button
            onClick={() => handleGenerateReport('Executive Summary')}
            disabled={reportGenerating}
            className="flex items-center gap-1.5 bg-cyber-card border border-cyber-primary/30 hover:border-cyber-primary px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold text-cyber-primary transition-all shadow-md hover:shadow-cyber-primary/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={() => handleGenerateReport('CSV')}
            disabled={reportGenerating}
            className="flex items-center gap-1.5 bg-cyber-card border border-cyber-primary/30 hover:border-cyber-primary px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold text-cyber-primary transition-all shadow-md hover:shadow-cyber-primary/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Active Hosts */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-primary/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Active Hosts</span>
            <Cpu className="w-4 h-4 text-cyber-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{liveTelemetry.activeHosts || 5}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-primary h-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Open Ports */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-primary/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Open Ports</span>
            <Server className="w-4 h-4 text-cyber-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{liveTelemetry.openPorts || 12}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-primary h-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        {/* Active Connections */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-primary/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Connections</span>
            <Activity className="w-4 h-4 text-cyber-primary animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{liveTelemetry.openConnections || 8}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-primary h-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Running Scans */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-primary/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Running Scans</span>
            <RefreshCw className="w-4 h-4 text-cyber-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{(liveTelemetry as any).scansRunning || 0}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-primary h-full" style={{ width: '0%' }}></div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-danger/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Critical Alerts</span>
            <AlertOctagon className="w-4 h-4 text-cyber-danger" />
          </div>
          <p className="text-2xl font-bold text-cyber-danger mt-2 font-mono">{criticalCount}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-danger h-full" style={{ width: `${Math.min(100, criticalCount * 20)}%` }}></div>
          </div>
        </div>

        {/* Threats Detected */}
        <div className="p-4 bg-cyber-card border border-cyber-border rounded-lg hover:border-cyber-danger/40 transition-all select-text shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Threats Detected</span>
            <ShieldAlert className="w-4 h-4 text-cyber-danger" />
          </div>
          <p className="text-2xl font-bold text-slate-200 mt-2 font-mono">{liveTelemetry.threatsDetected || 0}</p>
          <div className="w-full bg-[#111] h-1 rounded mt-3 overflow-hidden">
            <div className="bg-cyber-danger h-full" style={{ width: `${Math.min(100, (liveTelemetry.threatsDetected || 0) * 15)}%` }}></div>
          </div>
        </div>

      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Network performance line chart */}
        <div className="lg:col-span-2 p-5 bg-cyber-card border border-cyber-border rounded-lg flex flex-col justify-between h-[340px] relative shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Network Activity Timeline</span>
              <p className="text-[10px] text-slate-500 font-mono">REAL-TIME PORT & SOCKET TRAFFIC INTENSITY</p>
            </div>
            <div className="bg-black border border-cyber-border px-3 py-1.5 rounded text-[9px] font-mono text-cyber-primary font-bold uppercase leading-none">
              NET I/O: DL:{liveTelemetry.network?.download || 0} KB/s | UL:{liveTelemetry.network?.upload || 0} KB/s
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full mt-4 text-[9px] font-mono">
            {telemetryHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="95%">
                <AreaChart data={telemetryHistory} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff66" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#00ff66" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39ff14" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 9 }} />
                  <YAxis stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000000', border: '1px solid #141418', borderRadius: '4px' }}
                    labelStyle={{ color: '#71717a', fontFamily: 'monospace' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#00ff66" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" name="CPU Usage %" />
                  <Area type="monotone" dataKey="ram" stroke="#39ff14" strokeWidth={1} fillOpacity={1} fill="url(#ramGrad)" name="RAM Usage %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center pt-24 font-mono">Aggregating telemetry signals...</p>
            )}
          </div>
        </div>

        {/* Security / Risk wheel */}
        <div className="p-5 bg-cyber-card border border-cyber-border rounded-lg flex flex-col justify-between h-[340px] shadow-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Alert Severity Distribution</span>
            <p className="text-[10px] text-slate-500 font-mono">PIE SEVERITY SUBCLASSIFICATIONS</p>
          </div>

          <div className="flex-1 flex justify-center items-center min-h-0 relative my-2">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000000', border: '1px solid #141418', borderRadius: '4px' }}
                  itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute right-0 bottom-2 space-y-1 text-[9px] font-mono leading-none">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-400">CRIT ({criticalCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-slate-400">HIGH ({highCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-primary"></span><span className="text-slate-400">MED (4)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-accent"></span><span className="text-slate-400">LOW (3)</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* LOWER ROW: ACTIVE SYSTEM PROCESSES & THREAT TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active processes */}
        <div className="lg:col-span-2 p-5 bg-cyber-card border border-cyber-border rounded-lg flex flex-col justify-between h-[300px] shadow-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Active Workstation Process Monitors</span>
            <p className="text-[10px] text-slate-500 font-mono mb-4">TOP DYNAMIC RUNNING THREADS BY CPU LOAD</p>
          </div>

          <div className="flex-1 overflow-y-auto select-text min-h-0">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-black text-slate-500 border-b border-cyber-border uppercase text-[9px]">
                  <th className="p-2">PID</th>
                  <th className="p-2">Image Process Name</th>
                  <th className="p-2">CPU Usage</th>
                  <th className="p-2">RAM Usage</th>
                  <th className="p-2">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border font-mono text-slate-300">
                {(liveTelemetry.topProcesses || []).map((proc: any, index: number) => (
                  <tr key={index} className="hover:bg-black/50 transition-colors">
                    <td className="p-2 text-slate-500 font-bold">{proc.pid}</td>
                    <td className="p-2 text-slate-200">{proc.name}</td>
                    <td className="p-2 text-cyber-primary font-bold">{proc.cpu}%</td>
                    <td className="p-2 text-slate-400">{proc.mem}%</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-black border border-cyber-primary/20 text-cyber-primary rounded text-[8px] font-bold uppercase">
                        {proc.state || 'running'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Threat timeline / asset health */}
        <div className="p-5 bg-cyber-card border border-cyber-border rounded-lg flex flex-col justify-between h-[300px] shadow-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Asset Safety Posture</span>
            <p className="text-[10px] text-slate-500 font-mono">ACTIVE SYSTEM ANOMALY CALCULATIONS</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative py-2 select-text">
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" cy="72" r="58" 
                  stroke="#111" strokeWidth="8" fill="transparent" 
                />
                <circle 
                  cx="72" cy="72" r="58" 
                  stroke={securityScore > 75 ? '#00ff66' : '#ef4444'} 
                  strokeWidth="8" fill="transparent"
                  strokeDasharray={360}
                  strokeDashoffset={360 - (360 * securityScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] uppercase font-mono text-slate-500">POSTURE</span>
                <span className="text-2xl font-bold text-slate-100 mt-1">{securityScore}%</span>
                <span className={`text-[8px] font-mono font-bold mt-1 uppercase ${securityScore > 75 ? 'text-cyber-primary' : 'text-cyber-danger'}`}>
                  {securityScore > 75 ? 'SAFE' : 'RISKY'}
                </span>
              </div>
            </div>

            <div className="w-full mt-3 flex justify-between border-t border-cyber-border pt-3 text-[9px] font-mono text-slate-500">
              <div>
                <span>RISK RATIO:</span>
                <span className="text-cyber-danger font-bold ml-1">{riskScore}%</span>
              </div>
              <div>
                <span>STATUS:</span>
                <span className="text-cyber-primary font-bold ml-1">MONITORED</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
