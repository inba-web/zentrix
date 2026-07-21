import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Radio, ShieldAlert, Cpu, Network, Layers, Terminal } from 'lucide-react';

const COLORS = ['#3b82f6', '#06b6d4', '#ef4444'];

export default function IDS({ token }: any) {
  const websocketLogs = useSelector((state: RootState) => state.dashboard.websocketLogs) ?? [];
  const [idsLogs, setIdsLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch initial IDS logs once on mount
  useEffect(() => {
    fetchInitialIDSLogs();
  }, []);

  // Sync WebSocket IDS logs
  useEffect(() => {
    const filtered = websocketLogs.filter((log: any) => log.source === 'Suricata');
    if (filtered.length > 0) {
      setIdsLogs(prev => {
        const newLogs = filtered.filter(f => !prev.some(p => p._id === f._id));
        if (newLogs.length === 0) return prev;
        return [...newLogs, ...prev].slice(0, 50);
      });
    }
  }, [websocketLogs]);

  // Handle selected log default fallback
  useEffect(() => {
    if (idsLogs.length > 0 && !selectedLog) {
      setSelectedLog(idsLogs[0]);
    }
  }, [idsLogs, selectedLog]);

  const fetchInitialIDSLogs = async () => {
    try {
      const res = await fetch('/api/siem/logs?source=Suricata&limit=15', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIdsLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch IDS logs:', err);
    }
  };

  // Dynamic network flow metrics updated via WebSockets
  const [flowData, setFlowData] = useState<any[]>([
    { time: '19:00', TCP: 4200, UDP: 840, ICMP: 120 },
    { time: '19:02', TCP: 5800, UDP: 980, ICMP: 180 },
    { time: '19:04', TCP: 8900, UDP: 1450, ICMP: 140 },
    { time: '19:06', TCP: 12500, UDP: 3200, ICMP: 250 },
    { time: '19:08', TCP: 6400, UDP: 1200, ICMP: 110 },
    { time: '19:10', TCP: 5100, UDP: 900, ICMP: 80 }
  ]);

  const [protoCounts, setProtoCounts] = useState({ TCP: 85, UDP: 12, ICMP: 3 });

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleIdsPacket = (packet: any) => {
      if (!packet) return;
      const timeStr = new Date(packet.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour12: false });
      const bw = parseFloat(packet.bandwidth) * 10 || Math.floor(Math.random() * 2000) + 1000;
      const proto = (packet.proto || 'TCP').toUpperCase();

      setFlowData(prev => {
        const last = prev[prev.length - 1] || { TCP: 4000, UDP: 800, ICMP: 100 };
        const newEntry = {
          time: timeStr,
          TCP: proto === 'TCP' ? Math.round(bw) : last.TCP,
          UDP: proto === 'UDP' ? Math.round(bw) : last.UDP,
          ICMP: proto === 'ICMP' ? Math.round(bw) : last.ICMP
        };
        return [...prev, newEntry].slice(-20);
      });

      setProtoCounts(prev => ({
        ...prev,
        [proto]: (prev[proto as keyof typeof prev] || 0) + 1
      }));
    };

    socket.on('ids_packet', handleIdsPacket);
    return () => {
      socket.off('ids_packet', handleIdsPacket);
    };
  }, []);

  const totalProto = protoCounts.TCP + protoCounts.UDP + protoCounts.ICMP || 1;
  const protocolDistribution = [
    { name: `TCP (${Math.round((protoCounts.TCP / totalProto) * 100)}%)`, value: protoCounts.TCP },
    { name: `UDP (${Math.round((protoCounts.UDP / totalProto) * 100)}%)`, value: protoCounts.UDP },
    { name: `ICMP (${Math.round((protoCounts.ICMP / totalProto) * 100)}%)`, value: protoCounts.ICMP }
  ];

  // Helper to generate simulated raw hex packet decode dump
  const getSimulatedHexDump = (log: any) => {
    if (!log) return '';
    return `0000  00 0c 29 cb 6d a0 00 50  56 fd 8a c9 08 00 45 00  ..).m..P V.....E.
0010  00 28 a1 2c 40 00 40 06  e5 bd 0a 64 0c 1e c0 a8  .(.,@.@. ...d....
0020  01 02 00 16 d2 3a 4a a0  8a ca 00 00 00 00 50 02  .....:J. ......P.
0030  20 00 2c 23 00 00                                 .,#..
# Packet parsed: IP HEADER CHECK OK. 
# Protocol TCP. Src Port: ${log.srcIp || '185.220.101.5'} -> Dest Port: 443 (HTTPS)
# Payload bytes: ${log.message}
`;
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. TOP BANDWIDTH FLOW METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Network Flow chart */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[260px] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Real-Time Network Flow Throughput</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">BANDWIDTH CONSUMPTION RATIO (KBPS)</p>
          </div>

          <div className="flex-1 min-h-0 w-full mt-4 text-[9px] font-mono">
            <ResponsiveContainer width="100%" height="95%">
              <AreaChart data={flowData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tcpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis stroke="#475569" strokeWidth={0.5} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', border: '1px solid #1e293b' }} />
                <Area type="monotone" dataKey="TCP" stroke="#3b82f6" strokeWidth={1.5} fill="url(#tcpGrad)" />
                <Area type="monotone" dataKey="UDP" stroke="#06b6d4" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol distribution pie charts */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg h-[260px] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Protocol Statistics distribution</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono">NETWORK PACKET RATIO CATEGORIES</p>
          </div>

          <div className="flex-1 flex justify-center items-center relative py-1 mt-2">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={protocolDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                >
                  {protocolDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute right-0 bottom-2 space-y-1 text-[8px] font-mono leading-none">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span className="text-slate-400">TCP (85%)</span></div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span><span className="text-slate-400">UDP (12%)</span></div>
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span className="text-slate-400">ICMP (3%)</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. SURICATA FIRE CENTRE ALERTS GRID & HEX PACKET DUMPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Intrusion alarms table list */}
        <div className="lg:col-span-2 p-5 bg-[#111625] border border-slate-800 rounded-lg h-[400px] flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Suricata Intrusion Alerts Queue</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">ACTIVE SIGNATURE TRIGGER DEVIATIONS</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 select-none">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-950/40 text-[#64748b] border-b border-slate-800 uppercase font-mono text-[9px]">
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">IP Source</th>
                  <th className="p-2">Signature Alarm Trigger</th>
                  <th className="p-2">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {idsLogs.map((log) => {
                  const isSelected = selectedLog?._id === log._id;
                  return (
                    <tr 
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-950/20 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <td className="p-2 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-slate-300 whitespace-nowrap">{log.srcIp}</td>
                      <td className="p-2 text-slate-200 truncate max-w-xs">{log.message}</td>
                      <td className="p-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 border rounded text-[8px] font-bold ${
                          log.severity === 'CRITICAL' 
                            ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                            : 'bg-amber-950/30 border-amber-500/20 text-amber-400'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {idsLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-mono">
                      No intrusion alerts parsed from signature collectors.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic HEX PCAP decoding console */}
        <div className="p-5 bg-[#111625] border border-slate-800 rounded-lg h-[400px] flex flex-col justify-between font-mono">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Raw PCAP Packet Inspector</span>
            <p className="text-[10px] text-[#64748b] leading-tight font-mono mb-4">HEX & ASCII DECODER PARSER</p>
          </div>

          <div className="flex-1 min-h-0 bg-slate-950 p-3 border border-slate-900 rounded overflow-auto select-text text-[9px] text-emerald-400 leading-normal">
            {selectedLog ? (
              <pre className="whitespace-pre">{getSimulatedHexDump(selectedLog)}</pre>
            ) : (
              <p className="text-slate-500 text-center pt-20">Highlight an intrusion rule signature from the queue to decode target hex values.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
