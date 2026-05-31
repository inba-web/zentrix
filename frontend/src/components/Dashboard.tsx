import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { ShieldAlert, Cpu, Activity, Server, ShieldCheck, HelpCircle } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1'];

export default function Dashboard({ liveAlerts, websocketLogs, dbStatus }: any) {
  const [metrics, setMetrics] = useState({
    eventsCount: 0,
    alertsCount: 0,
    criticalCount: 0,
    devicesCount: 0,
    riskScore: 35,
    securityScore: 88,
    eps: 0
  });

  const [activeAttack, setActiveAttack] = useState<any>({
    src: '185.220.101.5',
    country: 'Netherlands',
    target: 'LINUX-WEB-APP-01',
    tactic: 'Initial Access'
  });

  // Calculate live logs EPS and update summary metrics
  useEffect(() => {
    const critical = liveAlerts.filter((a: any) => a.severity === 'CRITICAL').length;
    const high = liveAlerts.filter((a: any) => a.severity === 'HIGH').length;
    
    // Smooth score computations
    const risk = Math.min(100, 20 + critical * 15 + high * 5);
    const security = Math.max(30, 95 - critical * 8 - high * 3);

    setMetrics({
      eventsCount: 42000 + websocketLogs.length,
      alertsCount: 12 + liveAlerts.length,
      criticalCount: 2 + critical,
      devicesCount: 5,
      riskScore: risk,
      securityScore: security,
      eps: Math.floor(Math.random() * 25) + 12
    });

    // Animate map attacks periodically matching the incoming telemetry logs
    if (websocketLogs.length > 0 && Math.random() > 0.6) {
      const topLog = websocketLogs[0];
      setActiveAttack({
        src: topLog.srcIp || '185.220.101.5',
        country: topLog.source === 'AuthLog' ? 'Russia' : 'Netherlands',
        target: topLog.host || 'WIN-SOC-PROD-01',
        tactic: topLog.mitreTactic || 'Command and Control'
      });
    }
  }, [liveAlerts, websocketLogs]);

  // Data mocks for graphs
  const alertTrendData = [
    { time: '10:00', alerts: 4, critical: 1 },
    { time: '11:00', alerts: 7, critical: 1 },
    { time: '12:00', alerts: 5, critical: 0 },
    { time: '13:00', alerts: 12, critical: 2 },
    { time: '14:00', alerts: 9, critical: 1 },
    { time: '15:00', alerts: metrics.alertsCount - 3, critical: metrics.criticalCount - 1 },
    { time: '16:00', alerts: metrics.alertsCount, critical: metrics.criticalCount },
  ];

  const ipSourceData = [
    { ip: '185.220.101.5', count: 142 },
    { ip: '45.146.165.34', count: 98 },
    { ip: '194.26.135.10', count: 76 },
    { ip: '89.248.167.142', count: 43 },
    { ip: '103.89.22.12', count: 21 },
  ];

  const severityPieData = [
    { name: 'CRITICAL', value: metrics.criticalCount },
    { name: 'HIGH', value: Math.max(4, metrics.alertsCount - metrics.criticalCount - 6) },
    { name: 'MEDIUM', value: 5 },
    { name: 'LOW', value: 3 },
  ];

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TOP CORE KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Monitored systems */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-blue-950/40 border border-blue-500/20 rounded-lg">
            <Server className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Monitored Endpoints</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{metrics.devicesCount} Systems</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 100% ONLINE
            </p>
          </div>
        </div>

        {/* Total Events count */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Events Ingested</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{metrics.eventsCount.toLocaleString()}</p>
            <p className="text-[10px] text-[#64748b] mt-1 font-mono">
              EPS RATING: <span className="text-emerald-400 font-bold">{metrics.eps} / sec</span>
            </p>
          </div>
        </div>

        {/* Total threats alerts */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-amber-950/40 border border-amber-500/20 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Active Incidents</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{metrics.alertsCount} Alerts</p>
            <p className="text-[10px] text-amber-400 mt-1 font-mono uppercase">
              Triage Required
            </p>
          </div>
        </div>

        {/* Critical assets warning */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-500 leading-none">Critical Breaches</p>
            <p className="text-xl font-bold text-slate-200 mt-1.5 leading-none">{metrics.criticalCount} Severity</p>
            <p className="text-[10px] text-red-400 mt-1 font-mono uppercase animate-pulse">
              Playbooks Triggered
            </p>
          </div>
        </div>

      </div>

      {/* 2. DYNAMIC ATTACK MAP OVERLAYS & RISK SCORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* World Geolocation Attack Visuals */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[340px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Interactive Attack Vector Map</span>
              <p className="text-[10px] text-[#64748b] leading-tight font-mono">GLOBAL THREAT CORRELATION MONITORING</p>
            </div>
            <div className="bg-[#050811] border border-slate-800 px-3 py-1.5 rounded flex items-center gap-2 text-[10px] font-mono leading-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-red-400 font-bold uppercase">LIVE VECTOR: {activeAttack.src} ({activeAttack.country})</span>
            </div>
          </div>

          {/* SVG Tech Map Drawing */}
          <div className="flex-1 relative flex items-center justify-center min-h-0 bg-[#070b13]/40 border border-slate-900 rounded overflow-hidden">
            <svg viewBox="0 0 1000 480" className="w-full h-full stroke-slate-800 fill-none opacity-40">
              {/* SVG Dotted Grid Map Representation */}
              <rect width="100%" height="100%" fill="none" />
              
              {/* Map contours (Simple schematic world path mocks) */}
              <path d="M150,150 Q250,100 350,120 T600,100 T850,120" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3,3" />
              <path d="M100,300 Q300,280 500,320 T900,300" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3,3" />
              
              {/* Attack Vector Curves */}
              <path d="M220,180 Q450,80 750,220" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5,5" className="animate-pulse" />
              <path d="M520,380 Q620,200 750,220" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />

              {/* Pulsating Attack Points (Origins) */}
              <circle cx="220" cy="180" r="10" fill="#ef4444" fillOpacity="0.25" className="pulse-target" />
              <circle cx="220" cy="180" r="4" fill="#ef4444" />
              
              <circle cx="520" cy="380" r="8" fill="#f59e0b" fillOpacity="0.2" />
              <circle cx="520" cy="380" r="3.5" fill="#f59e0b" />

              {/* Pulsating Endpoint Target (Enterprise Site) */}
              <circle cx="750" cy="220" r="15" fill="#3b82f6" fillOpacity="0.2" className="pulse-target" />
              <circle cx="750" cy="220" r="5" fill="#3b82f6" />
              
              {/* Bounding target tags */}
              <text x="770" y="225" fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="bold">HQ-SOC-PROD</text>
            </svg>

            {/* Live attacker metadata floating panel */}
            <div className="absolute bottom-3 left-3 bg-[#050811]/90 border border-slate-800 p-2.5 rounded font-mono text-[9px] w-64 space-y-1">
              <div className="text-red-400 font-bold uppercase flex justify-between border-b border-slate-800 pb-1">
                <span>[X] TARGET COMPROMISED</span>
                <span>WARN</span>
              </div>
              <p className="text-slate-300">ATTACK SOURCE: <span className="text-slate-100 font-bold">{activeAttack.src}</span></p>
              <p className="text-slate-300 font-mono text-[8px] truncate">TACTIC: <span className="text-amber-400">{activeAttack.tactic}</span></p>
              <p className="text-slate-300">DESTINATION: <span className="text-slate-100 font-bold">{activeAttack.target}</span></p>
            </div>
          </div>
        </div>

        {/* Security / Risk Gauges */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[340px] font-sans">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Security & Risk Gauges</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">ACTIVE SYSTEM EXPOSURE CALCULATORS</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center relative py-2">
            
            {/* Embedded vector safety posture wheel */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="88" cy="88" r="70" 
                  stroke="#161e31" strokeWidth="8" fill="transparent" 
                />
                <circle 
                  cx="88" cy="88" r="70" 
                  stroke={metrics.securityScore > 75 ? '#10b981' : '#ef4444'} 
                  strokeWidth="8" fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * metrics.securityScore) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] uppercase font-mono text-slate-500">POSTURE</span>
                <span className="text-3xl font-bold text-slate-100 mt-1">{metrics.securityScore}%</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold mt-1 uppercase">SAFE RATING</span>
              </div>
            </div>

            {/* Risk exposure indicator tag */}
            <div className="w-full mt-4 flex justify-between border-t border-slate-800/80 pt-3 text-[10px] font-mono text-[#64748b]">
              <div>
                <span>RISK RATIO:</span>
                <span className="text-red-400 font-bold ml-1">{metrics.riskScore}%</span>
              </div>
              <div>
                <span>STATUS:</span>
                <span className="text-emerald-400 font-bold ml-1">{metrics.securityScore > 75 ? 'GUARDED' : 'ELEVATED'}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. RECHARTS TRENDS & TOP SCANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Incident severity area charts */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[300px]">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Threat Alerts Velocity Trend</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">12-HOUR SECURITY ANOMALY RECORDINGS</p>
          </div>

          <div className="flex-1 min-h-0 w-full mt-4 text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="95%">
              <AreaChart data={alertTrendData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '4px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#alertGrad)" name="Total Alerts" />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#critGrad)" name="Critical Intrusions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity levels breakdown */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg flex flex-col justify-between h-[300px]">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Alerts Classification Severity</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">PIE PERCENTAGE THREAT ASSESSMENTS</p>
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
            
            {/* Custom chart legend labels */}
            <div className="absolute right-0 bottom-2 space-y-1 text-[9px] font-mono">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-400">CRIT ({metrics.criticalCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-slate-400">HIGH ({Math.max(4, metrics.alertsCount - metrics.criticalCount - 6)})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-slate-400">MED (5)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-400">LOW (3)</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. MITRE ATT&CK TARGET COVERAGE SUMMARY */}
      <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg font-sans">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">MITRE ATT&CK Matrix Tactical Coverages</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">REAL-TIME TACTIC SEVERITY TRIGGER COUNTER</p>
          </div>
          <HelpCircle className="w-4 h-4 text-slate-500 cursor-pointer" />
        </div>

        {/* MITRE tactics block grids */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono">
          {[
            { tactic: 'Initial Access', technique: 'T1566 - Phishing', alert: true, color: 'bg-red-950/40 border-red-500/30 text-red-400' },
            { tactic: 'Execution', technique: 'T1059 - Command Shell', alert: true, color: 'bg-red-950/40 border-red-500/30 text-red-400' },
            { tactic: 'Persistence', technique: 'T1547 - Boot Runkey', alert: true, color: 'bg-amber-950/30 border-amber-500/20 text-amber-400' },
            { tactic: 'Priv Escalation', technique: 'T1068 - Exploit', alert: false, color: 'bg-slate-950/40 border-slate-800/80 text-slate-500' },
            { tactic: 'Credential Access', technique: 'T1110 - Brute Force', alert: true, color: 'bg-red-950/40 border-red-500/30 text-red-400' },
            { tactic: 'Lateral Movement', technique: 'T1021 - Remote WMI', alert: true, color: 'bg-amber-950/30 border-amber-500/20 text-amber-400' },
          ].map((item, idx) => (
            <div key={idx} className={`p-2.5 border rounded flex flex-col justify-between h-20 ${item.color}`}>
              <div>
                <p className="font-bold truncate uppercase">{item.tactic}</p>
                <p className="text-[8px] opacity-70 mt-1 truncate">{item.technique}</p>
              </div>
              <div className="flex justify-between items-center mt-2 border-t border-current/10 pt-1.5">
                <span className="text-[8px]">ACTIVE</span>
                <span className="font-bold">{item.alert ? 'FIRING' : 'IDLE'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
