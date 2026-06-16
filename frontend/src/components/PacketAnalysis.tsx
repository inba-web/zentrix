import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Play, Pause, Trash2, Search, Filter, Cpu, Download, Info, Network, Laptop, ChevronDown, ChevronRight } from 'lucide-react';
import { RootState, addPacket, clearPackets, toggleCapture, setSelectedPacket, setFilter, setSearchQuery } from '../store';
import { List } from 'react-window';

const FILTER_OPTIONS = ['all', 'tcp', 'udp', 'icmp', 'arp', 'dns', 'http', 'https'];

const PROTO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'TCP': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'UDP': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'ICMP': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'ARP': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'DNS': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  'HTTP': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  'HTTPS': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'OTHER': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' }
};

interface LocalInfo {
  ip: string;
  mac: string;
  hostname: string;
  os: string;
  platform: string;
  arch: string;
}

export default function PacketAnalysis() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const packetsState = useSelector((state: RootState) => state.packets);
  const { isCapturing, packets, selectedPacket, filter, searchQuery } = packetsState;

  const [localInfo, setLocalInfo] = useState<LocalInfo | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({
    frame: true,
    network: true,
    payload: true
  });

  // Fetch local info on mount
  useEffect(() => {
    fetchLocalInfo();
  }, []);

  const fetchLocalInfo = async () => {
    try {
      const res = await fetch('/api/scan/localinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLocalInfo(data);
      }
    } catch (e) {
      console.error('Failed to retrieve interface properties', e);
    }
  };

  // Register WebSocket handle
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

  // Export JSON packet log
  const exportPCAP = () => {
    if (packets.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(packets, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `zentrix_packets_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Client-side filtering logic
  const filteredPackets = packets.filter(p => {
    if (!p) return false;
    
    // Protocol Filter
    if (filter !== 'all') {
      const pProto = p.protocol ? p.protocol.toLowerCase() : '';
      if (filter === 'dns' && pProto !== 'dns') return false;
      if (filter === 'http' && pProto !== 'http') return false;
      if (filter === 'https' && pProto !== 'https') return false;
      if (filter === 'tcp' && pProto !== 'tcp' && pProto !== 'http' && pProto !== 'https') return false;
      if (filter === 'udp' && pProto !== 'udp' && pProto !== 'dns') return false;
      if (filter === 'icmp' && pProto !== 'icmp') return false;
      if (filter === 'arp' && pProto !== 'arp') return false;
    }

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const src = p.srcIp ? p.srcIp.toLowerCase() : '';
      const dest = p.destIp ? p.destIp.toLowerCase() : '';
      const proto = p.protocol ? p.protocol.toLowerCase() : '';
      const infoText = p.info ? p.info.toLowerCase() : '';
      const srcPortStr = p.srcPort ? String(p.srcPort) : '';
      const dstPortStr = p.destPort ? String(p.destPort) : '';

      return src.includes(q) || dest.includes(q) || proto.includes(q) || infoText.includes(q) || srcPortStr.includes(q) || dstPortStr.includes(q);
    }

    return true;
  });

  // Calculate dynamic stats counters
  const counts = { TCP: 0, UDP: 0, ICMP: 0, ARP: 0, DNS: 0, HTTP: 0, HTTPS: 0, OTHER: 0 };
  packets.forEach(p => {
    if (!p) return;
    const proto = p.protocol ? p.protocol.toUpperCase() : 'OTHER';
    if (proto in counts) {
      counts[proto as keyof typeof counts]++;
    } else {
      counts.OTHER++;
    }
  });

  // Hex / ASCII payload formatting utility
  const formatPayload = (hexString: string): string => {
    if (!hexString) return 'No payload stream captured.';
    
    // Strip non-hex chars
    const cleanHex = hexString.replace(/[^a-fA-F0-9]/g, '');
    const bytes: string[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(cleanHex.substring(i, i + 2));
    }

    let out = '';
    for (let i = 0; i < bytes.length; i += 8) {
      const chunk = bytes.slice(i, i + 8);
      const hexPart = chunk.join(' ');
      const asciiPart = chunk.map(b => {
        const num = parseInt(b, 16);
        return (num >= 32 && num <= 126) ? String.fromCharCode(num) : '.';
      }).join('');

      const offset = i.toString(16).toUpperCase().padStart(4, '0');
      out += `${offset}  ${hexPart.padEnd(24, ' ')}  |  ${asciiPart}\n`;
    }
    return out || 'No payload bytes to inspect.';
  };

  const toggleSection = (section: string) => {
    setExpandedDetails(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Virtualized row renderer
  const Row = ({ index, style, ariaAttributes }: any) => {
    const pkt = filteredPackets[index];
    if (!pkt) return null;

    const isSelected = selectedPacket?.id === pkt.id;
    const styleClass = PROTO_COLORS[pkt.protocol] || PROTO_COLORS.OTHER;
    
    // Format timestamp: extract HH:mm:ss.ms
    let formattedTime = 'N/A';
    if (pkt.timestamp) {
      try {
        const timePart = pkt.timestamp.includes('T') ? pkt.timestamp.split('T')[1] : pkt.timestamp;
        formattedTime = timePart.substring(0, 12);
      } catch (e) {
        formattedTime = String(pkt.timestamp);
      }
    }

    return (
      <div 
        style={style}
        {...ariaAttributes}
        onClick={() => dispatch(setSelectedPacket(pkt))}
        className={`flex items-center text-[10.5px] border-b border-white/5 cursor-pointer font-mono select-text transition-all ${
          isSelected 
            ? 'bg-cyan-500/10 border-l-[3px] border-l-cyan-400 font-semibold text-slate-100' 
            : 'hover:bg-white/5 text-slate-300'
        }`}
      >
        <div className="w-12 shrink-0 text-slate-600 font-bold px-2">{packets.length - packets.indexOf(pkt)}</div>
        <div className="w-24 shrink-0 text-slate-500">{formattedTime}</div>
        <div className="w-44 shrink-0 text-slate-200 truncate">{pkt.srcIp}{pkt.srcPort ? `:${pkt.srcPort}` : ''}</div>
        <div className="w-44 shrink-0 text-slate-200 truncate">{pkt.dstIp}{pkt.destPort ? `:${pkt.destPort}` : ''}</div>
        <div className="w-20 shrink-0 px-1">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${styleClass.bg} ${styleClass.text} ${styleClass.border}`}>
            {pkt.protocol}
          </span>
        </div>
        <div className="w-20 shrink-0 text-slate-400">{pkt.length} B</div>
        <div className="flex-1 min-w-0 truncate text-slate-355 pr-2">{pkt.info}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans text-white select-none relative">
      
      {/* System info / capture status bar */}
      {localInfo && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 bg-[#0D1117] border border-cyan-500/20 rounded-lg text-[10px] font-mono shadow-md">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase">
            <Laptop className="w-3.5 h-3.5" />
            <span>[ 🖥 DEVICE ]</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>IP: <strong className="text-slate-200">{localInfo.ip}</strong></span>
            <span className="text-white/10">|</span>
            <span>MAC: <strong className="text-slate-200">{localInfo.mac}</strong></span>
            <span className="text-white/10">|</span>
            <span>HOST: <strong className="text-slate-200 uppercase">{localInfo.hostname}</strong></span>
            <span className="text-white/10">|</span>
            <span>Active Interface: <strong className="text-cyan-400 uppercase">eth0</strong></span>
          </div>
        </div>
      )}

      {/* Protocol Counters Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-[#0D1117] p-3 border border-white/5 rounded-xl text-center shadow-lg font-mono text-[10px]">
        {Object.entries(counts).map(([proto, count]) => {
          const style = PROTO_COLORS[proto] || PROTO_COLORS.OTHER;
          return (
            <div key={proto} className="bg-black/30 border border-white/5 p-2 rounded-lg">
              <span className={`block text-[8px] font-bold tracking-wider ${style.text}`}>{proto}</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5 block">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2/3: Packet Queue Viewer */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-[520px]">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap justify-between items-center p-3 bg-[#0D1117] border border-white/5 rounded-xl gap-4 shadow-xl">
            <div className="flex gap-2 items-center">
              <button
                onClick={handleToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold transition-all border ${
                  isCapturing 
                    ? 'border-red-500/30 text-red-500 bg-red-950/10 hover:bg-red-950/20' 
                    : 'border-cyan-500/30 text-cyan-400 bg-black hover:border-cyan-500'
                }`}
              >
                {isCapturing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isCapturing ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 bg-black border border-white/10 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold text-slate-400 hover:text-slate-200 hover:border-white/20 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
              <button
                onClick={exportPCAP}
                disabled={packets.length === 0}
                className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold transition-all ${
                  packets.length === 0 
                    ? 'border-zinc-800 text-zinc-600 cursor-not-allowed' 
                    : 'border-cyan-500/20 text-cyan-400 bg-black hover:border-cyan-500 hover:bg-cyan-500/10'
                }`}
              >
                <Download className="w-3 h-3" />
                Export PCAP
              </button>
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex gap-1 flex-wrap items-center">
              <Filter className="w-3 h-3 text-slate-500 mr-1" />
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => dispatch(setFilter(opt))}
                  className={`px-2 py-0.5 rounded font-mono text-[8px] uppercase font-bold transition-all border ${
                    filter === opt 
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' 
                      : 'border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Virtualized fixed header list */}
          <div className="flex-1 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-inner">
            <div className="flex bg-[#0D1117]/80 border-b border-white/5 p-2 gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => dispatch(setSearchQuery(e.target.value))}
                  placeholder="Filter by IP range, ports, protocol signature..."
                  className="w-full bg-[#111827] border border-white/10 pl-8 pr-3 py-1.5 text-xs font-mono text-cyan-400 rounded-lg focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div className="bg-black border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-400 uppercase">
                Captured: {filteredPackets.length}
              </div>
            </div>

            {/* Fixed Header columns */}
            <div className="flex bg-[#0D1117]/40 text-slate-500 border-b border-white/5 font-mono text-[8.5px] uppercase font-bold py-2 shrink-0">
              <div className="w-12 shrink-0 px-2">No.</div>
              <div className="w-24 shrink-0">Time (IST)</div>
              <div className="w-44 shrink-0">Source IP:Port</div>
              <div className="w-44 shrink-0">Destination IP:Port</div>
              <div className="w-20 shrink-0">Protocol</div>
              <div className="w-20 shrink-0">Length</div>
              <div className="flex-1 min-w-0">Info Summary</div>
            </div>

            {/* Virtualized list row mapper */}
            <div className="flex-1 min-h-[300px]">
              {filteredPackets.length > 0 ? (
                <List
                  rowCount={filteredPackets.length}
                  rowHeight={28}
                  rowComponent={Row}
                  rowProps={{}}
                  style={{ height: 300, width: '100%' }}
                />
              ) : (
                <div className="text-center py-28 text-slate-500 font-mono text-[10px] space-y-1">
                  <p>Capture buffer empty.</p>
                  <p className="text-[8.5px] text-slate-600">Ensure tshark has proper administrative interface capture bounds.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 1/3: Detail Inspection drawers */}
        <div className="lg:col-span-1 bg-[#0D1117] border border-white/5 rounded-xl h-[520px] flex flex-col shadow-xl overflow-hidden p-4 space-y-4">
          
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              Packet Inspector
            </h3>
            <p className="text-[9px] text-slate-500 font-mono">FRAME DECONSTRUCTION & PAYLOAD</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-[10px]">
            
            {selectedPacket ? (
              <div className="space-y-3 select-text">
                
                {/* 1. Frame Section */}
                <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                  <button 
                    onClick={() => toggleSection('frame')}
                    className="w-full flex items-center justify-between p-2 bg-black/40 text-[9.5px] font-bold text-slate-200"
                  >
                    <span>1. FRAME DIAGNOSTICS</span>
                    {expandedDetails.frame ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {expandedDetails.frame && (
                    <div className="p-2.5 space-y-1 text-slate-400 border-t border-white/5 text-[9px] leading-relaxed">
                      <p><span className="text-slate-500 font-semibold">Timestamp:</span> {selectedPacket.timestamp}</p>
                      <p><span className="text-slate-500 font-semibold">Capture Interface:</span> eth0 (Operational)</p>
                      <p><span className="text-slate-500 font-semibold">Capture Length:</span> {selectedPacket.length} bytes</p>
                      <p><span className="text-slate-500 font-semibold">Wire Length:</span> {selectedPacket.length} bytes</p>
                      {selectedPacket.details?.Frame?.['frame.number'] && (
                        <p><span className="text-slate-500 font-semibold">Frame Number:</span> {selectedPacket.details.Frame['frame.number']}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Network Section */}
                <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                  <button 
                    onClick={() => toggleSection('network')}
                    className="w-full flex items-center justify-between p-2 bg-black/40 text-[9.5px] font-bold text-slate-200"
                  >
                    <span>2. NETWORK METADATA</span>
                    {expandedDetails.network ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {expandedDetails.network && (
                    <div className="p-2.5 space-y-1 text-slate-400 border-t border-white/5 text-[9px] leading-relaxed">
                      <p><span className="text-slate-500 font-semibold">Source IP:</span> {selectedPacket.srcIp}</p>
                      <p><span className="text-slate-500 font-semibold">Destination IP:</span> {selectedPacket.dstIp}</p>
                      <p><span className="text-slate-500 font-semibold">TTL (Time to Live):</span> {selectedPacket.ttl || 64}</p>
                      <p><span className="text-slate-500 font-semibold">Protocol Signature:</span> {selectedPacket.protocol} {selectedPacket.srcPort ? `(${selectedPacket.srcPort} -> ${selectedPacket.destPort})` : ''}</p>
                      <p><span className="text-slate-500 font-semibold">Flags Mask:</span> {selectedPacket.flags || '0x00 (None)'}</p>
                    </div>
                  )}
                </div>

                {/* 3. Payload Section */}
                <div className="border border-white/5 rounded-lg overflow-hidden bg-black/10">
                  <button 
                    onClick={() => toggleSection('payload')}
                    className="w-full flex items-center justify-between p-2 bg-black/40 text-[9.5px] font-bold text-slate-200"
                  >
                    <span>3. HEX / ASCII PAYLOAD</span>
                    {expandedDetails.payload ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {expandedDetails.payload && (
                    <div className="p-2 bg-black border-t border-white/5 overflow-x-auto">
                      <pre className="text-cyan-400 text-[8.5px] leading-relaxed whitespace-pre font-mono">
                        {formatPayload(selectedPacket.payloadHex || selectedPacket.payload)}
                      </pre>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-36 text-slate-500 text-[10px]">
                <p>No packet inspect target.</p>
                <p className="text-[8px] text-slate-600 mt-1">Select an active row from queue table to deconstruct.</p>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
