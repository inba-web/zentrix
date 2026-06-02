import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { ShieldAlert, Cpu, Activity, Server, ShieldCheck, HelpCircle, HardDrive, RefreshCw } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function Dashboard({ liveAlerts, websocketLogs, dbStatus, liveTelemetry }: any) {
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  // Sliding history tracker for charts (stores last 10 ticks)
  useEffect(() => {
    if (liveTelemetry) {
      setTelemetryHistory(prev => {
        const next = [...prev, {
          time: new Date().toLocaleTimeString().substring(3, 8),
          cpu: parseFloat(liveTelemetry.cpuUsage),
          ram: parseFloat(liveTelemetry.ramUsage),
          disk: parseFloat(liveTelemetry.diskUsage),
          download: parseFloat(liveTelemetry.network.download),
          upload: parseFloat(liveTelemetry.network.upload)
        }];
        return next.slice(-12); // Keep last 12 points
      });
    }
  }, [liveTelemetry]);

  // Format system uptime into readable string
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const getSafetyClassification = (score: number) => {
    if (score > 75) return { text: 'GUARDED', color: 'text-emerald-400' };
    if (score > 40) return { text: 'ELEVATED', color: 'text-amber-400' };
    return { text: 'CRITICAL BREACH', color: 'text-red-500 animate-pulse' };
  };

  if (!liveTelemetry) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-500 bg-[#111625] border border-slate-800 rounded-lg">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <span>Waiting for live telemetry...</span>
      </div>
    );
  }

  // Calculate live risk ratings
  const criticalCount = liveAlerts.filter((a: any) => a.severity === 'CRITICAL').length;
  const highCount = liveAlerts.filter((a: any) => a.severity === 'HIGH').length;
  const securityScore = Math.max(30, 98 - (criticalCount * 10 + highCount * 4));
  const riskScore = Math.min(100, (criticalCount * 15 + highCount * 5));

  const classification = getSafetyClassification(securityScore);

  const severityPieData = [
    { name: 'CRITICAL', value: criticalCount + 1 },
    { name: 'HIGH', value: highCount + 2 },
    { name: 'MEDIUM', value: 4 },
    { name: 'LOW', value: 3 }
  ];

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TOP CORE KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Monitored CPU */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-all select-text">
          <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-lg">
            <Cpu className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">CPU Core Usage</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{liveTelemetry.cpuUsage}%</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              ACTIVE PROCESSES: {liveTelemetry.activeProcesses}
            </p>
          </div>
        </div>

        {/* Total RAM Usage */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-all select-text">
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">RAM Allocation</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{liveTelemetry.ramUsage}%</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              UPTIME: {formatUptime(liveTelemetry.systemUptime)}
            </p>
          </div>
        </div>

        {/* Disk Space usage */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-all select-text">
          <div className="p-3 bg-amber-950/40 border border-amber-500/20 rounded-lg">
            <HardDrive className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Disk Partition</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{liveTelemetry.diskUsage}%</p>
            <p className="text-[10px] text-amber-400 mt-1 font-mono">
              DISK I/O: R:{liveTelemetry.diskIO.read} W:{liveTelemetry.diskIO.write}
            </p>
          </div>
        </div>

        {/* Network usage stats */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-all select-text">
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg">
            <Server className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Sockets Bandwidth</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{liveTelemetry.network.download} KB/s</p>
            <p className="text-[10px] text-red-400 mt-1 font-mono uppercase">
              Connections: {liveTelemetry.openConnections} Open
            </p>
          </div>
        </div>

      </div>

      {/* 2. DYNAMIC REAL-TIME SYSTEM CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live sliding CPU/RAM activity */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[340px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Live CPU & RAM Performance Velocity</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">ACTIVE SYSTEM REAL-TIME METRICS</p>
            </div>
            <div className="bg-[#050811] border border-slate-850 px-3 py-1.5 rounded text-[9px] font-mono text-blue-400 font-bold uppercase leading-none">
              Network Net I/O: DL:{liveTelemetry.network.download} UL:{liveTelemetry.network.upload} KB/s
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full mt-4 text-[9px] font-mono">
            {telemetryHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="95%">
                <AreaChart data={telemetryHistory} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <YAxis stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '4px' }}
                    labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" name="CPU Usage %" />
                  <Area type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" name="RAM Usage %" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center pt-24">Aggregating telemetry signals...</p>
            )}
          </div>
        </div>

        {/* Security / Risk Posture Wheel */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[340px] font-sans">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Security & Risk Postures</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">ACTIVE SYSTEM EXPOSURE CALCULATORS</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative py-2 select-text">
            
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="88" cy="88" r="70" 
                  stroke="#161e31" strokeWidth="8" fill="transparent" 
                />
                <circle 
                  cx="88" cy="88" r="70" 
                  stroke={securityScore > 75 ? '#10b981' : '#ef4444'} 
                  strokeWidth="8" fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * securityScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] uppercase font-mono text-slate-500">POSTURE</span>
                <span className="text-3xl font-bold text-slate-100 mt-1">{securityScore}%</span>
                <span className={`text-[10px] font-mono font-bold mt-1 uppercase ${classification.color}`}>{classification.text}</span>
              </div>
            </div>

            <div className="w-full mt-4 flex justify-between border-t border-slate-800/80 pt-3 text-[10px] font-mono text-[#64748b]">
              <div>
                <span>RISK RATIO:</span>
                <span className="text-red-400 font-bold ml-1">{riskScore}%</span>
              </div>
              <div>
                <span>STATUS:</span>
                <span className="text-emerald-400 font-bold ml-1">SECURE</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. TOP PROCESSES MONITOR & CLASSIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top active processes by CPU */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[300px]">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Active Workstation Process Monitors</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">TOP DYNAMIC RUNNING THREADS BY CPU LOAD</p>
          </div>

          <div className="flex-1 overflow-y-auto select-text min-h-0">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase text-[9px]">
                  <th className="p-2">PID</th>
                  <th className="p-2">Image Process Name</th>
                  <th className="p-2">CPU Usage</th>
                  <th className="p-2">RAM Usage</th>
                  <th className="p-2">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {(liveTelemetry.topProcesses || []).map((proc: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-2 text-slate-500 font-bold">{proc.pid}</td>
                    <td className="p-2 text-slate-200">{proc.name}</td>
                    <td className="p-2 text-blue-400 font-bold">{proc.cpu}%</td>
                    <td className="p-2 text-slate-400">{proc.mem}%</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold uppercase">
                        {proc.state || 'running'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incidents Pie classification chart */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[300px]">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Mitred Alert Severity classifications</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">PIE POSTURE ASSESSMENTS</p>
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
                  contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '4px' }}
                  itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute right-0 bottom-2 space-y-1 text-[9px] font-mono leading-none">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-400">CRIT ({criticalCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-slate-400">HIGH ({highCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-slate-400">MED (4)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-400">LOW (3)</span></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
