let ioInstance = null;
let captureInterval = null;

const SOURCE_IPS = [
  '192.168.1.104', '192.168.1.105', '10.100.12.20', '10.100.12.21', '10.100.12.22', 
  '185.220.101.5', '45.146.165.34', '127.0.0.1'
];
const DEST_IPS = [
  '8.8.8.8', '1.1.1.1', '192.168.1.1', '10.100.12.1', '142.250.190.46', '13.107.4.50'
];

const PACKETS_SIM = [
  {
    protocol: 'TCP',
    srcPort: 54122,
    destPort: 443,
    length: 120,
    info: '54122 -> 443 [ACK] Seq=1 Ack=1 Win=64240 Len=0',
    details: {
      "Ethernet II": { "Source": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Destination": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "192.168.1.104", "Destination": "142.250.190.46", "Protocol": "TCP (6)", "Header Length": "20 bytes" },
      "Transmission Control Protocol": { "Source Port": 54122, "Destination Port": 443, "Sequence Number": 1, "Acknowledge Number": 1, "Flags": "0x010 (ACK)" }
    },
    payload: `0000  00 09 12 c1 d2 e3 00 1a  2b 3a bc 54 08 00 45 00   ..+:.T.. ......E.\n0010  00 3c 1a 45 40 00 40 06  a2 b1 c0 a8 01 68 8e fa   .<.E@.@. .....h..\n0020  be 2e d3 6a 01 bb 00 00  00 01 00 00 00 01 a0 10   ...j.... ........`
  },
  {
    protocol: 'UDP',
    srcPort: 38291,
    destPort: 53,
    length: 74,
    info: 'Standard query 0x4f12 A api.zentrix.local',
    details: {
      "Ethernet II": { "Source": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Destination": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "192.168.1.105", "Destination": "8.8.8.8", "Protocol": "UDP (17)" },
      "User Datagram Protocol": { "Source Port": 38291, "Destination Port": 53, "Length": 40 },
      "Domain Name System (query)": { "Transaction ID": "0x4f12", "Flags": "0x0100 Standard query", "Queries": [{ "Name": "api.zentrix.local", "Type": "A (Host Address)" }] }
    },
    payload: `0000  00 09 12 c1 d2 e3 00 1a  2b 3a bc 54 08 00 45 00   ..+:.T.. ......E.\n0010  00 4a 2d f1 40 00 40 11  b2 a4 c0 a8 01 69 08 08   .J-.@.@. .....i..\n0020  08 08 95 93 00 33 00 36  34 df 4f 12 01 00 00 01   .....3.6 4.O.....`
  },
  {
    protocol: 'ICMP',
    srcPort: 0,
    destPort: 0,
    length: 98,
    info: 'Echo (ping) request id=0x0001, seq=1, ttl=64',
    details: {
      "Ethernet II": { "Source": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Destination": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "192.168.1.104", "Destination": "192.168.1.1", "Protocol": "ICMP (1)" },
      "Internet Control Message Protocol": { "Type": "8 (Echo (ping) request)", "Code": 0, "Checksum": "0xf2b5", "Identifier": "0x0001", "Sequence Number": 1 }
    },
    payload: `0000  00 09 12 c1 d2 e3 00 1a  2b 3a bc 54 08 00 45 00   ..+:.T.. ......E.\n0010  00 62 3d e2 40 00 64 01  c1 a9 c0 a8 01 68 c0 a8   .b=.@.d. .....h..\n0020  01 01 08 00 f2 b5 00 01  00 01 61 62 63 64 65 66   ........ ..abcdef`
  },
  {
    protocol: 'ARP',
    srcPort: 0,
    destPort: 0,
    length: 60,
    info: 'Who has 192.168.1.105? Tell 192.168.1.1',
    details: {
      "Ethernet II": { "Source": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Destination": "Broadcast (ff:ff:ff:ff:ff:ff)", "Type": "ARP (0x0806)" },
      "Address Resolution Protocol": { "Hardware type": "Ethernet (1)", "Protocol type": "IPv4 (0x0800)", "Opcode": "request (1)", "Sender MAC address": "00:09:12:c1:d2:e3", "Sender IP address": "192.168.1.1", "Target IP address": "192.168.1.105" }
    },
    payload: `0000  ff ff ff ff ff ff 00 09  12 c1 d2 e3 08 06 00 01   ........ ........\n0010  08 00 06 04 00 01 00 09  12 c1 d2 e3 c0 a8 01 01   ........ ........\n0020  00 00 00 00 00 00 c0 a8  01 69 00 00 00 00 00 00   .........i......`
  },
  {
    protocol: 'DNS',
    srcPort: 53,
    destPort: 38291,
    length: 90,
    info: 'Standard query response 0x4f12 A api.zentrix.local A 127.0.0.1',
    details: {
      "Ethernet II": { "Source": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Destination": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "8.8.8.8", "Destination": "192.168.1.105", "Protocol": "UDP (17)" },
      "User Datagram Protocol": { "Source Port": 53, "Destination Port": 38291, "Length": 56 },
      "Domain Name System (response)": { "Transaction ID": "0x4f12", "Flags": "0x8180 Standard query response, No error", "Questions": 1, "Answers": 1, "Queries": [{ "Name": "api.zentrix.local", "Type": "A" }], "Answers RRs": [{ "Name": "api.zentrix.local", "Type": "A", "Address": "127.0.0.1" }] }
    },
    payload: `0000  00 1a 2b 3a bc 54 00 09  12 c1 d2 e3 08 00 45 00   ..+:.T.. ......E.\n0010  00 5a 2e f2 40 00 40 11  b2 9d 08 08 08 08 c0 a8   .Z..@.@. ........\n0020  01 69 00 33 95 93 00 46  34 df 4f 12 81 80 00 01   .i.3...F 4.O.....`
  },
  {
    protocol: 'HTTP',
    srcPort: 48293,
    destPort: 80,
    length: 420,
    info: 'GET /api/health HTTP/1.1',
    details: {
      "Ethernet II": { "Source": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Destination": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "192.168.1.104", "Destination": "192.168.1.1", "Protocol": "TCP (6)" },
      "Transmission Control Protocol": { "Source Port": 48293, "Destination Port": 80, "Flags": "0x018 (PSH, ACK)" },
      "Hypertext Transfer Protocol": { "Request Method": "GET", "Request URI": "/api/health", "Request Version": "HTTP/1.1", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    },
    payload: `0000  00 09 12 c1 d2 e3 00 1a  2b 3a bc 54 08 00 45 00   ..+:.T.. ......E.\n0010  01 a4 1b 46 @.00 40 06  a1 c2 c0 a8 01 68 c0 a8   ...F@.@. .....h..\n0020  01 01 bc 45 00 50 00 00  00 3b 00 00 00 24 50 18   ...E.P.. .;...$P.`
  },
  {
    protocol: 'HTTPS',
    srcPort: 54123,
    destPort: 443,
    length: 512,
    info: 'Client Hello (TLSv1.3)',
    details: {
      "Ethernet II": { "Source": "Intel_3a:bc:54 (00:1a:2b:3a:bc:54)", "Destination": "Netgear_c1:d2:e3 (00:09:12:c1:d2:e3)", "Type": "IPv4 (0x0800)" },
      "Internet Protocol Version 4": { "Source": "192.168.1.104", "Destination": "104.244.42.1", "Protocol": "TCP (6)" },
      "Transport Layer Security": { "Content Type": "Handshake (22)", "Version": "TLS 1.2 (0x0303)", "Length": 507, "Handshake Type": "Client Hello (1)" }
    },
    payload: `0000  00 09 12 c1 d2 e3 00 1a  2b 3a bc 54 08 00 45 00   ..+:.T.. ......E.\n0010  02 00 1c 47 40 00 40 06  b1 f0 c0 a8 01 68 68 f4   ...G@.@. .....hh.\n0020  2a 01 d3 6b 01 bb 00 00  00 01 00 00 00 01 80 18   *..k.... ........`
  }
];

function init(io) {
  ioInstance = io;

  // Stream raw simulated packet telemetry every 800ms
  captureInterval = setInterval(() => {
    if (!ioInstance) return;

    const base = PACKETS_SIM[Math.floor(Math.random() * PACKETS_SIM.length)];
    const srcIp = SOURCE_IPS[Math.floor(Math.random() * SOURCE_IPS.length)];
    const destIp = DEST_IPS[Math.floor(Math.random() * DEST_IPS.length)];

    const packet = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      srcIp,
      destIp,
      protocol: base.protocol,
      srcPort: base.srcPort,
      destPort: base.destPort,
      length: base.length + Math.floor(Math.random() * 50) - 25,
      info: base.info.replace('192.168.1.104', srcIp).replace('8.8.8.8', destIp),
      details: {
        ...base.details,
        "Internet Protocol Version 4": {
          ...base.details["Internet Protocol Version 4"],
          "Source": srcIp,
          "Destination": destIp
        }
      },
      payload: base.payload
    };

    ioInstance.emit('packet_captured', packet);
  }, 800);
}

module.exports = {
  init
};
