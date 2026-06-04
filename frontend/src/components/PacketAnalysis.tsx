import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Play, Pause, Trash2, Search, Filter, Cpu, BarChart3, Network, Terminal } from 'lucide-react';
import { RootState, addPacket, clearPackets, toggleCapture, setSelectedPacket, setFilter, setSearchQuery } from '../store';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const FILTER_OPTIONS = ['all', 'tcp', 'udp', 'icmp', 'arp', 'dns', 'http', 'https'];
const PROTO_COLORS: Record<string, string> = {
  'TCP': '#00ff66',
  'UDP': '#39ff14',
  'ICMP': '#f59e0b',
  'ARP': '#00e5ff',
  'DNS': '#a855f7',
  'HTTP': '#ec4899',
  'HTTPS': '#e11d48'
};

export default function PacketAnalysis() {
  const dispatch = useDispatch();
  const packetsState = useSelector((state: RootState) => state.packets);
  const { isCapturing, packets, selectedPacket, filter, searchQuery } = packetsState;

  const [expandedSection, setExpandedSection] = useState<string | null>('Internet Protocol Version 4');

  // Handle live WebSocket packet streams
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handlePacket = (packet: any) => {
      dispatch(addPacket(packet));
    };

    socket.on('packet_captured', handlePacket);

    return () => {
      socket.off('packet_captured', handlePacket);
    };
  }, [dispatch]);

  const handleClear = () => {
    dispatch(clearPackets());
  };

  const handleToggle = () => {
    dispatch(toggleCapture());
  };

  // Filter packets
  const filteredPackets = packets.filter(p => {
    // Protocol Filter
    if (filter !== 'all' && p.protocol.toLowerCase() !== filter.toLowerCase()) {
      return false;
    }
    // Search Query (IP, Port, Protocol)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchIp = p.srcIp.toLowerCase().includes(q) || p.destIp.toLowerCase().includes(q);
      const matchPort = String(p.srcPort).includes(q) || String(p.destPort).includes(q);
      const matchProto = p.protocol.toLowerCase().includes(q);
      const matchInfo = p.info.toLowerCase().includes(q);
      return matchIp || matchPort || matchProto || matchInfo;
    }
    return true;
  });

  // Calculate packet capture stats
  const totalCount = filteredPackets.length;
  const protoCounts: Record<string, number> = {};
  filteredPackets.forEach(p => {
    protoCounts[p.protocol] = (protoCounts[p.protocol] || 0) + 1;
  });

  const chartData = Object.entries(protoCounts).map(([name, value]) => ({
    name,
    value,
    color: PROTO_COLORS[name] || '#71717a'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-white select-none">
      
      {/* 1. LEFT TWO-THIRDS: WIRESHARK SHELL */}
      <div className="lg:col-span-2 space-y-6 flex flex-col h-[700px]">
        
        {/* Controls Toolbar */}
        <div className="flex flex-wrap justify-between items-center p-3 bg-cyber-card border border-cyber-border rounded-lg gap-4 shadow-lg">
          <div className="flex gap-2 items-center">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1 px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold transition-all border ${
                isCapturing 
                  ? 'border-red-500/30 text-red-500 bg-red-950/10 hover:bg-red-950/20' 
                  : 'border-cyber-primary/30 text-cyber-primary bg-black hover:border-cyber-primary'
              }`}
            >
              {isCapturing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isCapturing ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 bg-black border border-cyber-border px-3 py-1.5 rounded font-mono text-[10px] uppercase font-bold text-slate-400 hover:text-slate-200 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => dispatch(setFilter(opt))}
                className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold transition-all border ${
                  filter === opt 
                    ? 'border-cyber-primary text-cyber-primary bg-cyber-primary/10' 
                    : 'border-cyber-border text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Live Packet Table Viewport */}
        <div className="flex-1 bg-black border border-cyber-border rounded-lg overflow-hidden flex flex-col shadow-lg">
          <div className="flex bg-cyber-card border-b border-cyber-border p-2 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => dispatch(setSearchQuery(e.target.value))}
                placeholder="Apply display filter / search IP, port, protocol, info..."
                className="w-full bg-black border border-cyber-border pl-8 pr-3 py-1.5 text-xs font-mono text-cyber-primary rounded focus:outline-none focus:border-cyber-primary"
              />
            </div>
            <div className="bg-black border border-cyber-border px-3 py-1.5 rounded text-[9px] font-mono text-slate-500 uppercase flex items-center leading-none">
              Packets: {totalCount}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed max-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cyber-card text-slate-500 border-b border-cyber-border uppercase text-[9px]">
                  <th className="p-2">No.</th>
                  <th className="p-2">Time</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Destination</th>
                  <th className="p-2">Protocol</th>
                  <th className="p-2">Src Port</th>
                  <th className="p-2">Dest Port</th>
                  <th className="p-2">Length</th>
                  <th className="p-2">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {filteredPackets.map((pkt, idx) => {
                  const isSelected = selectedPacket?.id === pkt.id;
                  const protoColor = PROTO_COLORS[pkt.protocol] || '#71717a';
                  return (
                    <tr 
                      key={pkt.id} 
                      onClick={() => dispatch(setSelectedPacket(pkt))}
                      className={`cursor-pointer transition-all hover:bg-cyber-primary/10 ${
                        isSelected ? 'bg-cyber-primary/20 text-cyber-primary font-bold' : ''
                      }`}
                    >
                      <td className="p-2 text-slate-600 font-bold">{totalCount - idx}</td>
                      <td className="p-2 text-slate-550">{pkt.timestamp.substring(11, 19)}</td>
                      <td className="p-2 text-slate-200">{pkt.srcIp}</td>
                      <td className="p-2 text-slate-200">{pkt.destIp}</td>
                      <td className="p-2 font-bold" style={{ color: protoColor }}>{pkt.protocol}</td>
                      <td className="p-2 text-slate-400">{pkt.srcPort || '-'}</td>
                      <td className="p-2 text-slate-400">{pkt.destPort || '-'}</td>
                      <td className="p-2 text-slate-450">{pkt.length}</td>
                      <td className="p-2 text-slate-300 truncate max-w-xs">{pkt.info}</td>
                    </tr>
                  );
                })}
                {filteredPackets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 font-mono">
                      No capture signals active on current interfaces.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Packet Inspection details & Hex dump */}
        <div className="h-[250px] bg-cyber-card border border-cyber-border rounded-lg flex flex-col md:flex-row shadow-lg overflow-hidden font-mono text-[10px]">
          
          {/* Detailed Tree */}
          <div className="flex-1 border-r border-cyber-border p-3 overflow-y-auto space-y-2 max-h-[250px]">
            <p className="text-slate-500 uppercase text-[9px] border-b border-cyber-border pb-1 font-bold">[+] PACKET DETAILS TREE</p>
            {selectedPacket ? (
              <div className="space-y-1 text-slate-300 select-text leading-relaxed">
                {Object.entries(selectedPacket.details || {}).map(([key, val]: any) => {
                  const isExpanded = expandedSection === key;
                  return (
                    <div key={key} className="space-y-1">
                      <button 
                        onClick={() => setExpandedSection(isExpanded ? null : key)}
                        className="w-full text-left font-bold text-cyber-primary flex items-center gap-1 hover:text-cyber-accent"
                      >
                        {isExpanded ? '▼' : '▶'} {key}
                      </button>
                      {isExpanded && (
                        <div className="pl-4 border-l border-cyber-border/40 py-1 space-y-0.5 text-slate-400 text-[9px]">
                          {Object.entries(val).map(([k, v]: any) => (
                            <p key={k}><span className="text-slate-500">{k}:</span> {String(v)}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center pt-16">Select a packet from the queue to view details.</p>
            )}
          </div>

          {/* Hex Dump */}
          <div className="flex-1 p-3 overflow-y-auto bg-black max-h-[250px]">
            <p className="text-slate-500 uppercase text-[9px] border-b border-cyber-border/40 pb-1 font-bold">[+] HEX / ASCII PAYLOAD</p>
            {selectedPacket ? (
              <pre className="text-cyber-primary text-[9px] leading-relaxed pt-2 whitespace-pre select-text font-mono">
                {selectedPacket.payload}
              </pre>
            ) : (
              <p className="text-slate-500 text-center pt-16">No payload trace selected.</p>
            )}
          </div>

        </div>

      </div>

      {/* 2. RIGHT ONE-THIRD: LIVE STATISTICS */}
      <div className="lg:col-span-1 space-y-6 h-[700px] overflow-y-auto">
        
        {/* Connection counts / General KPIs */}
        <div className="p-5 bg-cyber-card border border-cyber-border rounded-lg shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyber-primary" />
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Capture Metrics</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center font-mono">
            <div className="p-3 bg-black border border-cyber-border rounded">
              <p className="text-[8px] text-slate-500 uppercase">Packets/sec</p>
              <p className="text-lg font-bold text-cyber-primary mt-1">{isCapturing ? '1.2' : '0.0'}</p>
            </div>
            <div className="p-3 bg-black border border-cyber-border rounded">
              <p className="text-[8px] text-slate-500 uppercase">Total Data</p>
              <p className="text-lg font-bold text-cyber-primary mt-1">
                {(packets.reduce((acc, curr) => acc + curr.length, 0) / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        </div>

        {/* Charts: Protocol Usage */}
        <div className="p-5 bg-cyber-card border border-cyber-border rounded-lg shadow-lg flex flex-col justify-between h-[300px]">
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Protocol Distribution</span>
            <p className="text-[10px] text-slate-500 font-mono mb-4">TRAFFIC SHARE ANALYSIS</p>
          </div>

          <div className="flex-1 w-full text-[9px] font-mono mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData} margin={{ left: -25, right: 10, top: 0, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#222" tick={{ fill: '#71717a', fontSize: 9 }} />
                  <YAxis stroke="#222" tick={{ fill: '#71717a', fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000000', border: '1px solid #141418', borderRadius: '4px' }}
                    itemStyle={{ fontFamily: 'monospace' }}
                  />
                  <Bar dataKey="value" fill="#00ff66">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-center pt-20">Capturing packet streams...</p>
            )}
          </div>
        </div>

        {/* Top Talkers */}
        <div className="p-5 bg-cyber-card border border-cyber-border rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-4 h-4 text-cyber-primary" />
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Top Talkers (IPs)</span>
          </div>

          <div className="space-y-2 select-text font-mono text-[10px]">
            {(Object.entries(
              filteredPackets.reduce((acc: Record<string, number>, curr) => {
                acc[curr.srcIp] = (acc[curr.srcIp] || 0) + 1;
                return acc;
              }, {})
            ) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([ip, count]: [string, number], idx) => (
                <div key={idx} className="p-2 bg-black border border-cyber-border rounded flex justify-between items-center">
                  <span className="text-slate-350">{ip}</span>
                  <span className="text-cyber-primary font-bold">{count} pkts</span>
                </div>
              ))}
            {totalCount === 0 && <p className="text-slate-500 text-center py-6">No packet streams detected.</p>}
          </div>
        </div>

      </div>

    </div>
  );
}
