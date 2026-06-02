const net = require('net');
const fs = require('fs');
const path = require('path');

let ioInstance = null;
const COWRIE_LOG_PATH = '/var/log/cowrie/cowrie.json';
const db = require('../db');

// List of built-in listeners
const servers = [];

// Watch Cowrie json file if it exists
function startCowrieTail(io) {
  try {
    fs.accessSync(COWRIE_LOG_PATH, fs.constants.R_OK);
    let fileSize = fs.statSync(COWRIE_LOG_PATH).size;

    fs.watchFile(COWRIE_LOG_PATH, { interval: 1000 }, (curr, prev) => {
      if (curr.mtimeMs <= prev.mtimeMs) return;

      const stream = fs.createReadStream(COWRIE_LOG_PATH, {
        start: fileSize,
        end: curr.size
      });

      let buffer = '';
      stream.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        lines.forEach(async line => {
          if (!line.trim()) return;
          try {
            const entry = JSON.parse(line);
            
            // Format Cowrie fields into Honeypot Console layout
            const honeypotEvent = {
              timestamp: new Date(entry.timestamp || Date.now()),
              attackerIp: entry.src_ip || '127.0.0.1',
              country: 'Remote Node',
              command: entry.input || (entry.eventid === 'cowrie.session.connect' ? 'Initial SSH handshake' : 'N/A'),
              output: entry.username ? `Login Attempt: ${entry.username}:${entry.password || 'none'}` : 'System Check-in'
            };

            io.emit('honeypot_console', honeypotEvent);

            // Also record to alert repo on attack spikes
            if (entry.eventid === 'cowrie.login.success') {
              const alert = {
                timestamp: new Date(),
                severity: 'CRITICAL',
                title: 'Honeypot Login Compromised',
                description: `Honeypot Sensor: Success login payload on SSH emulator by ${entry.src_ip}. User: ${entry.username}`,
                category: 'Honeypot Trigger',
                host: require('os').hostname(),
                status: 'NEW',
                assignedTo: 'Unassigned',
                evidence: entry
              };
              const saved = await db.alerts.create(alert);
              io.emit('alert', saved);
            }

          } catch (e) {
            // JSON parse err
          }
        });
      });

      fileSize = curr.size;
    });
    console.log(`[HONEYPOT] Successfully tailing external Cowrie logs at: ${COWRIE_LOG_PATH}`);
    return true;
  } catch (e) {
    return false;
  }
}

// Built-in Lightweight Port Listener Honeypot (Port 2222, 8080)
function startLocalHoneypotListeners(io) {
  const portsToListen = [2222, 8080];

  portsToListen.forEach(port => {
    try {
      const server = net.createServer(socket => {
        const attackerIp = socket.remoteAddress ? socket.remoteAddress.replace('::ffff:', '') : '127.0.0.1';
        
        let dataReceived = '';
        socket.on('data', async chunk => {
          dataReceived += chunk.toString();
          
          // Respond like a fake service
          if (port === 2222) {
            socket.write('SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5\r\n');
          } else if (port === 8080) {
            socket.write('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n<html><head><title>ZENTRIX Web Admin Login</title></head><body><h2>Security Gateway Panel</h2></body></html>');
            socket.end();
          }

          if (dataReceived.trim().length > 0) {
            const parsedText = dataReceived.trim().replace(/[\r\n]/g, ' | ');
            const honeypotEvent = {
              timestamp: new Date(),
              attackerIp,
              country: attackerIp === '127.0.0.1' ? 'Local Workstation' : 'LAN Client',
              command: port === 2222 ? `SSH connection string: "${parsedText}"` : `HTTP Request: "${parsedText}"`,
              output: `Connection caught on Port ${port}!`
            };

            // Emit to frontend WebSockets
            io.emit('honeypot_console', honeypotEvent);

            // Record critical alert on connections
            const alert = {
              timestamp: new Date(),
              severity: 'HIGH',
              title: `Honeypot Intrusive Scan on Port ${port}`,
              description: `Honeypot Sensor: Socket connection captured on port ${port} from scanner node ${attackerIp}. Data: ${parsedText.substring(0, 150)}`,
              category: 'Honeypot Trigger',
              host: require('os').hostname(),
              status: 'NEW',
              assignedTo: 'Unassigned',
              evidence: honeypotEvent
            };
            
            const saved = await db.alerts.create(alert);
            io.emit('alert', saved);
          }
        });

        // Trigger connection alert
        const connectEvent = {
          timestamp: new Date(),
          attackerIp,
          country: attackerIp === '127.0.0.1' ? 'Local Workstation' : 'LAN Client',
          command: `TCP Connection initiated on Port ${port}`,
          output: 'Honeypot Port Listener active.'
        };
        io.emit('honeypot_console', connectEvent);

      });

      server.on('error', e => {
        // Handle port conflicts (e.g. port already bound)
        console.warn(`[HONEYPOT] Could not bind honeypot on Port ${port} (likely port already in use).`);
      });

      server.listen(port, '0.0.0.0', () => {
        console.log(`[HONEYPOT] Built-in Honeypot listener active on Port ${port}`);
      });

      servers.push(server);
    } catch (e) {
      console.warn(`[HONEYPOT] Error binding port ${port}:`, e.message);
    }
  });
}

function init(io) {
  ioInstance = io;

  // Try tailing Cowrie
  const cowrieActive = startCowrieTail(io);

  // Spin up lightweight listeners as fallback/enhancement
  startLocalHoneypotListeners(io);
}

module.exports = {
  init
};
