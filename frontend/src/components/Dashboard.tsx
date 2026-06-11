// frontend/src/components/Dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar
} from 'recharts';
import { 
  ShieldAlert, 
  Cpu, 
  Activity, 
  Server, 
  Radio, 
  AlertOctagon, 
  Download, 
  Loader2,
  ListCollapse,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { RootState } from '../store';

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#00D4FF'
};

// Custom Hook to animate counters locally without extra npm dependencies
function useAnimatedCounter(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

// Performant custom SVG Sparkline
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="h-6 w-24 bg-zinc-900/50 animate-pulse rounded" />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 24;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-24 h-6 shrink-0 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dashboard() {
  const token = useSelector((state: RootState) => state.auth.token);
  const liveTelemetry = useSelector((state: RootState) => state.dashboard.liveTelemetry);
  const openPorts = useSelector((state: RootState) => state.dashboard.openPorts);
  const activeHosts = useSelector((state: RootState) => state.dashboard.activeHosts);
  const runningScans = useSelector((state: RootState) => state.dashboard.runningScans);
  const alertsDistribution = useSelector((state: RootState) => state.dashboard.alertsDistribution);

  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [showAllProcs, setShowAllProcs] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [pulseDot, setPulseDot] = useState(false);

  // Sparkline history buffers
  const [portsHistory, setPortsHistory] = useState<number[]>([]);
  const [hostsHistory, setHostsHistory] = useState<number[]>([]);
  const [connsHistory, setConnsHistory] = useState<number[]>([]);
  const [scansHistory, setScansHistory] = useState<number[]>([]);
  const [alertsHistory, setAlertsHistory] = useState<number[]>([]);
  const [threatsHistory, setThreatsHistory] = useState<number[]>([]);

  // Telemetry buffer ref to maintain 150 points (5-min window)
  const historyBuffer = useRef<any[]>([]);

  useEffect(() => {
    if (liveTelemetry) {
      setPulseDot(true);
      const timer = setTimeout(() => setPulseDot(false), 300);

      // Append to rolling chart window
      const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
      historyBuffer.current = [...historyBuffer.current, {
        time: timestamp,
        cpu: liveTelemetry.cpu,
        ram: liveTelemetry.ram
      }].slice(-150);
      setTelemetryHistory([...historyBuffer.current]);

      // Sparkline history update
      setConnsHistory(prev => [...prev, liveTelemetry.activeConnections || 0].slice(-30));
    }
    return () => clearTimeout(300);
  }, [liveTelemetry]);

  // Synchronize separate metric history counts
  useEffect(() => {
    setPortsHistory(prev => [...prev, openPorts].slice(-30));
  }, [openPorts]);

  useEffect(() => {
    setHostsHistory(prev => [...prev, activeHosts].slice(-30));
  }, [activeHosts]);

  useEffect(() => {
    setScansHistory(prev => [...prev, runningScans].slice(-30));
  }, [runningScans]);

  useEffect(() => {
    const totalAlerts = alertsDistribution.CRITICAL + alertsDistribution.HIGH + alertsDistribution.MEDIUM + alertsDistribution.LOW;
    setAlertsHistory(prev => [...prev, alertsDistribution.CRITICAL].slice(-30));
    setThreatsHistory(prev => [...prev, alertsDistribution.CRITICAL + alertsDistribution.HIGH].slice(-30));
  }, [alertsDistribution]);

  // Calculate live threat severity metrics
  const criticalCount = alertsDistribution.CRITICAL;
  const highCount = alertsDistribution.HIGH;
  const mediumCount = alertsDistribution.MEDIUM;
  const lowCount = alertsDistribution.LOW;

  const totalUnresolved = criticalCount + highCount + mediumCount + lowCount;
  const threatsDetected = criticalCount + highCount;
  const securityScore = Math.max(30, 100 - (criticalCount * 12 + highCount * 5 + mediumCount * 2));
  const riskScore = Math.min(100, (criticalCount * 18 + highCount * 8));

  // Animating values
  const animatedPorts = useAnimatedCounter(openPorts);
  const animatedHosts = useAnimatedCounter(activeHosts);
  const animatedConns = useAnimatedCounter(liveTelemetry?.activeConnections || 0);
  const animatedScans = useAnimatedCounter(runningScans);
  const animatedAlerts = useAnimatedCounter(criticalCount);
  const animatedThreats = useAnimatedCounter(threatsDetected);

  // Radial Bar Data
  const radialData = [
    { name: 'LOW', value: Math.max(1, lowCount), fill: SEVERITY_COLORS.LOW },
    { name: 'MEDIUM', value: Math.max(1, mediumCount), fill: SEVERITY_COLORS.MEDIUM },
    { name: 'HIGH', value: Math.max(1, highCount), fill: SEVERITY_COLORS.HIGH },
    { name: 'CRITICAL', value: Math.max(1, criticalCount), fill: SEVERITY_COLORS.CRITICAL }
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
        setReportMsg(`Report generated. Initiating download...`);
        const stamp = data.report.fileName;
        const fileToDownload = type === 'CSV' ? stamp.replace('.pdf', '.csv') : (type === 'JSON' ? stamp.replace('.pdf', '.json') : stamp);
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

  if (!liveTelemetry) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center space-y-4 font-mono text-xs text-[#00D4FF] bg-[#0D1117] border border-white/5 rounded-lg shadow-2xl backdrop-blur-md">
        <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
        <span className="tracking-widest uppercase animate-pulse">Awaiting ZENTRIX Telemetry Stream...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* HEADER SECTION WITH QUICK REPORT BUTTONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[#0D1117] border border-white/5 rounded-xl shadow-lg backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold tracking-widest text-slate-100 font-mono">SOC COMMAND METRICS OVERVIEW</h1>
          <p className="text-[10px] text-[#00D4FF] font-mono uppercase tracking-wider mt-1">Real-time status of threat intelligence and endpoint arrays</p>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0 items-center">
          {reportMsg && (
            <span className="text-[10px] font-mono text-cyber-accent animate-pulse mr-2">{reportMsg}</span>
          )}
          <button
            onClick={() => handleGenerateReport('Executive Summary')}
            disabled={reportGenerating}
            className="flex items-center gap-1.5 bg-[#111827] border border-white/10 hover:border-[#00D4FF] px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold text-[#00D4FF] transition-all shadow-md hover:shadow-cyan-500/10"
          >
            {reportGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>
          <button
            onClick={() => handleGenerateReport('CSV')}
            disabled={reportGenerating}
            className="flex items-center gap-1.5 bg-[#111827] border border-white/10 hover:border-[#00D4FF] px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold text-[#00D4FF] transition-all shadow-md hover:shadow-cyan-500/10"
          >
            {reportGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download CSV
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Open Ports */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-[#00D4FF]/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Open Ports</span>
            <Server className="w-4 h-4 text-[#00D4FF]" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-slate-200 font-mono leading-none">{animatedPorts}</p>
            <Sparkline data={portsHistory} color="#00D4FF" />
          </div>
        </div>

        {/* Active Hosts */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-[#00FF87]/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Active Hosts</span>
            <Cpu className="w-4 h-4 text-[#00FF87]" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-slate-200 font-mono leading-none">{animatedHosts}</p>
            <Sparkline data={hostsHistory} color="#00FF87" />
          </div>
        </div>

        {/* Active Connections */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-cyan-500/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Active Connections</span>
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-slate-200 font-mono leading-none">{animatedConns}</p>
            <Sparkline data={connsHistory} color="#06b6d4" />
          </div>
        </div>

        {/* Running Scans */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-[#F59E0B]/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Running Scans</span>
            <Radio className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-slate-200 font-mono leading-none">{animatedScans}</p>
            <Sparkline data={scansHistory} color="#F59E0B" />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-[#EF4444]/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Critical Alerts</span>
            <AlertOctagon className="w-4 h-4 text-[#EF4444] animate-bounce" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-[#EF4444] font-mono leading-none">{animatedAlerts}</p>
            <Sparkline data={alertsHistory} color="#EF4444" />
          </div>
        </div>

        {/* Threats Detected */}
        <div className="p-4 bg-[#0D1117] border border-white/5 rounded-xl hover:border-[#F97316]/30 transition-all shadow-md flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-mono text-slate-500">Threats Detected</span>
            <ShieldAlert className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold text-slate-200 font-mono leading-none">{animatedThreats}</p>
            <Sparkline data={threatsHistory} color="#F97316" />
          </div>
        </div>

      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Network Activity Timeline (CPU & RAM Chart) */}
        <div className="lg:col-span-2 p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col justify-between h-[340px] relative shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Network Activity Timeline</span>
              <p className="text-[10px] text-slate-500 font-mono">REAL-TIME CPU & MEMORY WORKSTATION PROFILE</p>
            </div>
            <div className="bg-black border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-mono text-[#00D4FF] font-bold uppercase leading-none">
              CPU: {liveTelemetry.cpu}% | RAM: {liveTelemetry.ram}% ({liveTelemetry.ramUsedGB} GB / {liveTelemetry.ramTotalGB} GB)
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full mt-4 text-[9px] font-mono">
            {telemetryHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="95%">
                <AreaChart data={telemetryHistory} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF87" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#00FF87" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 8 }} />
                  <YAxis stroke="#222" strokeWidth={0.5} tick={{ fill: '#71717a', fontSize: 8 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px' }}
                    labelStyle={{ color: '#71717a', fontFamily: 'monospace' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#00D4FF" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" name="CPU Usage %" />
                  <Area type="monotone" dataKey="ram" stroke="#00FF87" strokeWidth={1.5} fillOpacity={1} fill="url(#ramGrad)" name="RAM Usage %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center pt-24 font-mono">Aggregating telemetry signals...</p>
            )}
          </div>
        </div>

        {/* Alert Severity Distribution */}
        <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col justify-between h-[340px] shadow-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Alert Severity Distribution</span>
            <p className="text-[10px] text-slate-500 font-mono">PIE SEVERITY SUBCLASSIFICATIONS</p>
          </div>

          <div className="flex-1 flex justify-center items-center min-h-0 relative my-2">
            {totalUnresolved === 0 ? (
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-full text-[#00FF87] animate-pulse">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <p className="text-xs font-mono font-bold text-slate-350">NO ACTIVE ALERTS</p>
                <p className="text-[9px] font-mono text-slate-500">System is fully monitored and operational.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="40%" 
                    outerRadius="90%" 
                    barSize={10} 
                    data={radialData}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={5}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                
                <div className="absolute flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="text-2xl font-extrabold text-slate-100 font-mono">{totalUnresolved}</span>
                  <span className="text-[7px] text-slate-500 font-mono uppercase mt-1">Total Cases</span>
                </div>
                
                <div className="absolute right-0 bottom-2 space-y-1 text-[8px] font-mono leading-none">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span><span className="text-slate-400">CRIT ({criticalCount})</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F97316]"></span><span className="text-slate-400">HIGH ({highCount})</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span><span className="text-slate-400">MED ({mediumCount})</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00D4FF]"></span><span className="text-slate-400">LOW ({lowCount})</span></div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* LOWER ROW: ACTIVE SYSTEM PROCESSES & THREAT TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Workstation Process Monitors */}
        <div className="lg:col-span-2 p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col justify-between h-[300px] shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Active Workstation Process Monitors</span>
              <p className="text-[10px] text-slate-500 font-mono">TOP DYNAMIC RUNNING THREADS BY CPU LOAD</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Spinning data pulse indicator */}
              <span className={`w-2 h-2 rounded-full bg-[#00D4FF] shrink-0 ${pulseDot ? 'scale-125 opacity-100' : 'scale-75 opacity-40'} transition-all duration-300`} />
              
              <button 
                onClick={() => setShowAllProcs(true)}
                className="flex items-center gap-1 bg-[#111827] hover:bg-zinc-800 border border-white/10 px-2 py-1 rounded text-[9px] font-mono text-slate-350"
              >
                <ListCollapse className="w-3 h-3" />
                View All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto select-text min-h-0">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-black/55 text-slate-500 border-b border-white/5 uppercase text-[9px] tracking-wider font-mono">
                  <th className="p-2">PID</th>
                  <th className="p-2">Image Process Name</th>
                  <th className="p-2 text-right">CPU</th>
                  <th className="p-2 text-right">Memory (MB)</th>
                  <th className="p-2 text-center">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {(liveTelemetry.topProcesses || []).slice(0, 10).map((proc: any, index: number) => {
                  const cpuVal = parseFloat(proc.cpu);
                  const rowStyle = cpuVal > 70 
                    ? 'bg-red-500/10 hover:bg-red-500/15' 
                    : cpuVal > 30 
                    ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                    : 'hover:bg-white/5';
                  return (
                    <tr key={index} className={`transition-colors ${rowStyle}`}>
                      <td className="p-2 text-slate-500 font-bold">{proc.pid}</td>
                      <td className="p-2 text-slate-200 font-semibold">{proc.name}</td>
                      <td className="p-2 text-right text-cyber-accent font-bold">{proc.cpu}%</td>
                      <td className="p-2 text-right text-slate-400">{proc.ram} MB</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 bg-black/60 border rounded text-[7px] font-bold uppercase ${
                          cpuVal > 70 ? 'border-red-500/30 text-red-400' : 'border-white/10 text-slate-400'
                        }`}>
                          {proc.state || 'running'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asset Safety Posture Circular Meter */}
        <div className="p-5 bg-[#0D1117] border border-white/5 rounded-xl flex flex-col justify-between h-[300px] shadow-lg">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Asset Safety Posture</span>
            <p className="text-[10px] text-slate-500 font-mono">ACTIVE SYSTEM ANOMALY CALCULATIONS</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative py-2 select-text">
            
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Base track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" cy="72" r="54" 
                  stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" 
                />
                <circle 
                  cx="72" cy="72" r="54" 
                  stroke={securityScore > 75 ? '#00FF87' : '#EF4444'} 
                  strokeWidth="6" fill="transparent"
                  strokeDasharray={340}
                  strokeDashoffset={340 - (340 * securityScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] uppercase font-mono text-slate-500">POSTURE</span>
                <span className="text-2xl font-bold text-slate-100 mt-1">{securityScore}%</span>
                <span className={`text-[8px] font-mono font-bold mt-1.5 uppercase ${securityScore > 75 ? 'text-[#00FF87]' : 'text-red-500'}`}>
                  {securityScore > 75 ? 'SAFE' : 'ATTACKED'}
                </span>
              </div>
            </div>

            <div className="w-full mt-3 flex justify-between border-t border-white/5 pt-3 text-[9px] font-mono text-slate-500">
              <div>
                <span>RISK RATIO:</span>
                <span className="text-[#EF4444] font-bold ml-1">{riskScore}%</span>
              </div>
              <div>
                <span>STATUS:</span>
                <span className="text-[#00D4FF] font-bold ml-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#00D4FF] animate-pulse" />
                  MONITORED
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* PROCESSES MODAL */}
      {showAllProcs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-text">
          <div className="bg-[#0d1117] border border-white/10 rounded-xl max-w-3xl w-full h-[500px] flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <div>
                <h3 className="font-bold font-mono text-sm uppercase text-slate-200">Workstation Running Threads List</h3>
                <p className="text-[9px] font-mono text-[#00D4FF]">Dynamic full report filtered by CPU load</p>
              </div>
              <button 
                onClick={() => setShowAllProcs(false)}
                className="bg-[#111827] border border-white/10 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-black text-slate-500 border-b border-white/5 uppercase text-[9px] tracking-wider">
                    <th className="p-2">PID</th>
                    <th className="p-2">Process Name</th>
                    <th className="p-2 text-right">CPU</th>
                    <th className="p-2 text-right">Memory (MB)</th>
                    <th className="p-2 text-center">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-350">
                  {(liveTelemetry.topProcesses || []).map((proc: any, index: number) => {
                    const cpuVal = parseFloat(proc.cpu);
                    return (
                      <tr key={index} className={`transition-colors ${cpuVal > 70 ? 'bg-red-500/10' : cpuVal > 30 ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}>
                        <td className="p-2 text-slate-500 font-bold">{proc.pid}</td>
                        <td className="p-2 text-slate-100 font-semibold">{proc.name}</td>
                        <td className="p-2 text-right text-cyber-accent font-bold">{proc.cpu}%</td>
                        <td className="p-2 text-right text-slate-400">{proc.ram} MB</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 bg-black/60 border rounded text-[7px] font-bold uppercase ${
                            cpuVal > 70 ? 'border-red-500/30 text-red-400' : 'border-white/10 text-slate-400'
                          }`}>
                            {proc.state || 'running'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
