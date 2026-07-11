import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Terminal, 
  Activity, 
  Cpu, 
  Search, 
  FolderLock, 
  FileSpreadsheet, 
  Compass, 
  Radio, 
  Clock, 
  Database, 
  AlertTriangle,
  Fingerprint,
  Workflow,
  Settings,
  Bell,
  Monitor
} from 'lucide-react';

// Import components
import Dashboard from './components/Dashboard';
import SIEM from './components/SIEM';
import EDR from './components/EDR';
import IDS from './components/IDS';
import ThreatHunting from './components/ThreatHunting';
import IncidentResponse from './components/IncidentResponse';
import ThreatIntel from './components/ThreatIntel';
import MalwareAnalysis from './components/MalwareAnalysis';
import PhishingAnalysis from './components/PhishingAnalysis';
import NetworkScanner from './components/NetworkScanner';
import PacketAnalysis from './components/PacketAnalysis';
import SOAR from './components/SOAR';
import Reporting from './components/Reporting';
import NotificationSettings from './components/NotificationSettings';
import Auth from './components/Auth';
import { useISTClock } from './hooks/useISTClock';

import { 
  RootState, 
  setUser, 
  setToken, 
  setLoading, 
  setLiveTelemetry, 
  addLiveAlert, 
  addWebsocketLog, 
  setDbStatus,
  updateEdrStats,
  setOpenPorts,
  setActiveHosts,
  setRunningScans,
  setAlertsDistribution,
  addPopup
} from './store';

function ToastItem({ toast, onClose }: { toast: any; onClose: (id: string) => void }) {
  useEffect(() => {
    if (!toast.persistent) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.count, toast.persistent, onClose]);

  const sev = (toast.severity || 'MEDIUM').toUpperCase();
  const badgeColor = sev === 'CRITICAL' 
    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
    : sev === 'HIGH' 
    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  
  const timestampIST = new Date(toast.timestamp || new Date()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
      className="p-4 glass-panel border border-[#f43f5e]/30 rounded-xl text-slate-100 shadow-glow glow-red relative overflow-hidden flex gap-3 select-text group"
    >
      <AlertTriangle className="w-5 h-5 text-cyber-danger shrink-0 animate-pulse mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <span className={`text-[8px] uppercase font-mono font-bold px-2 py-0.5 border rounded ${badgeColor}`}>
            {sev} SYSTEM THREAT {toast.count > 1 ? `(${toast.count}x)` : ''}
          </span>
          <span className="text-[8px] text-slate-500 font-mono">{timestampIST} IST</span>
        </div>
        <p className="text-xs font-bold text-slate-200 mt-2 truncate">
          {toast.title} {toast.count > 1 ? `(${toast.count} occurrences)` : ''}
        </p>
        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{toast.description}</p>
        
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
          <span className="text-[8px] text-slate-500 font-mono uppercase bg-[#080d16] px-2 py-0.5 border border-white/5 rounded">
            HOST: {toast.host || 'UNKNOWN'}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => onClose(toast.id)}
              className="text-[9px] text-slate-400 hover:text-slate-200 px-2 py-0.5 font-mono transition-colors"
            >
              Dismiss
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                (window as any).setActiveTabModule?.('incidents');
                onClose(toast.id);
              }}
              className="text-[9px] text-cyber-accent hover:text-[#00ffff] font-mono font-bold transition-colors"
            >
              → View
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const istTime = useISTClock();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const profileLoading = useSelector((state: RootState) => state.auth.loading);
  const liveTelemetry = useSelector((state: RootState) => state.dashboard.liveTelemetry);
  const liveAlerts = useSelector((state: RootState) => state.dashboard.liveAlerts);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [dbHealth, setDbHealth] = useState<string>('Detecting...');
  const [criticalPopup, setCriticalPopup] = useState<any | null>(null);
  const [time, setTime] = useState<string>(new Date().toISOString());
  const [toasts, setToasts] = useState<any[]>([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Expose active tab switching globally so components/toasts can navigate
  useEffect(() => {
    (window as any).setActiveTabModule = (tab: string) => {
      setActiveTab(tab);
    };
    return () => {
      delete (window as any).setActiveTabModule;
    };
  }, []);

  // Sync user reference to allow socket event handlers to access latest settings
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // UTC clock tick
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Request HTML5 Notifications permission
  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch user profile on startup
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    dispatch(setLoading(true));
    const tokenVal = localStorage.getItem('soc_token') || sessionStorage.getItem('soc_token');
    if (!tokenVal) {
      dispatch(setUser(null));
      dispatch(setToken(null));
      dispatch(setLoading(false));
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tokenVal}` }
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setUser(data));
        dispatch(setToken(tokenVal));
      } else {
        dispatch(setUser(null));
        dispatch(setToken(null));
      }
    } catch (e) {
      dispatch(setUser(null));
      dispatch(setToken(null));
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Tri-tone alarm sound generator for critical threats
  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [880, 1100, 1320].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
      });
    } catch (e) {
      // Ignored
    }
  };

  useEffect(() => {
    if (token) {
      // Initialize WebSocket connection
      const socket = io((import.meta as any).env.DEV ? 'http://localhost:5001' : window.location.origin);
      (window as any).socket = socket;

      socket.on('connect', () => {
        console.log('[WEBSOCKET] Active ZENTRIX pipelines successfully linked.');
      });

      // Handle SIEM logs
      socket.on('siem_log', (log: any) => {
        dispatch(addWebsocketLog(log));
      });
      socket.on('siem:log', (log: any) => {
        dispatch(addWebsocketLog(log));
      });

      // Handle EDR stats & isolate commands
      socket.on('edr_isolate', (data: any) => {
        if (data && data.host) {
          dispatch(updateEdrStats({
            id: data.host,
            hostname: data.host,
            status: data.status || 'Isolated'
          }));
        }
      });
      socket.on('edr_stats', (stat: any) => {
        dispatch(updateEdrStats(stat));
      });

      // Handle full device list broadcast from edrService poll loop
      socket.on('edr:update', (devices: any[]) => {
        if (Array.isArray(devices)) {
          devices.forEach(d => {
            if (d && d.hostname) {
              dispatch(updateEdrStats({
                id: d._id || d.hostname,
                hostname: d.hostname,
                cpuUsage: d.cpuUsage,
                ramUsage: d.ramUsage,
                status: d.status,
                lastSeen: d.lastSeen
              }));
            }
          });
        }
      });

      // Handle telemetry updates (Executive metrics)
      socket.on('telemetry_update', (data: any) => {
        dispatch(setLiveTelemetry(data));
      });

      socket.on('telemetry:update', (data: any) => {
        dispatch(setLiveTelemetry(data));
      });

      socket.on('metrics:openports', (count: number) => {
        dispatch(setOpenPorts(count));
      });

      socket.on('metrics:activehosts', (count: number) => {
        dispatch(setActiveHosts(count));
      });

      socket.on('metrics:runningscans', (count: number) => {
        dispatch(setRunningScans(count));
      });

      socket.on('alerts:distribution', (dist: any) => {
        dispatch(setAlertsDistribution(dist));
      });

      socket.on('threat:critical', (payload: any) => {
        handleIncomingAlert(payload);
      });

      // Handle alerts
      socket.on('alert', (alert: any) => {
        handleIncomingAlert(alert);
      });

      // Fetch initial DB health
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          setDbHealth(data.database);
          dispatch(setDbStatus(data.database));
        })
        .catch(() => {
          setDbHealth('Portable JSON DB');
          dispatch(setDbStatus('Portable JSON DB'));
        });

      return () => {
        socket.disconnect();
      };
    }
  }, [token, dispatch]);

  const handleIncomingAlert = (alert: any) => {
    const sev = (alert.severity || 'MEDIUM').toUpperCase();
    
    // Always record to liveAlerts / popups history
    dispatch(addLiveAlert(alert));
    dispatch(addPopup(alert));

    if (sev === 'INFO' || sev === 'LOW') {
      // INFO: No popup, dashboard notification only
      // LOW: Notification center only
      return;
    }

    const isPopupEnabled = userRef.current?.popupEnabled !== false;
    if (!isPopupEnabled) return;

    if (sev === 'MEDIUM') {
      triggerToast(alert, false);
    } else if (sev === 'HIGH') {
      triggerToast(alert, true);
    } else if (sev === 'CRITICAL') {
      // Full-screen critical threat popup with deduplication
      setCriticalPopup(prev => {
        if (prev && prev.title === alert.title && prev.host === alert.host) {
          return {
            ...prev,
            count: (prev.count || 1) + 1,
            timestamp: alert.timestamp || new Date(),
            description: alert.description
          };
        }
        return { ...alert, count: 1 };
      });

      if (userRef.current?.alarmEnabled !== false) {
        playAlarm();
      }

      // Trigger Local Desktop HTML5 Notification
      if (userRef.current?.desktopNotifications !== false && window.Notification && Notification.permission === 'granted') {
        new window.Notification(`CRITICAL SOC THREAT: ${alert.title}`, {
          body: `${alert.description} on host ${alert.host}`,
          icon: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
        });
      }
    }
  };

  const triggerToast = (alert: any, persistent = false) => {
    setToasts(prev => {
      const existingIdx = prev.findIndex(t => t.title === alert.title && t.host === alert.host);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          count: (updated[existingIdx].count || 1) + 1,
          timestamp: alert.timestamp || new Date(),
          description: alert.description
        };
        return updated;
      } else {
        const id = Math.random().toString(36).substring(7);
        return [...prev, { id, ...alert, count: 1, persistent }];
      }
    });
  };

  const handleRegisterSuccess = (profile: any, tokenVal: string) => {
    dispatch(setToken(tokenVal));
    dispatch(setUser(profile));
    setActiveTab('dashboard');
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cyber-bg text-cyber-primary font-mono text-xs">
        <span className="w-9 h-9 rounded-full border-2 border-t-cyber-accent border-cyber-border animate-spin mb-3"></span>
        <span className="tracking-widest animate-pulse">Awaiting ZENTRIX provisioning protocols...</span>
      </div>
    );
  }

  // If no profile registered, present one-time Registration / Auth form
  if (!user) {
    return (
      <Auth onRegisterSuccess={handleRegisterSuccess} />
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'scanner', label: 'Network Scanner', icon: Search },
    { id: 'packets', label: 'Packet Analysis', icon: Radio },
    { id: 'edr', label: 'EDR', icon: Cpu },
    { id: 'siem', label: 'SIEM', icon: Terminal },
    { id: 'soar', label: 'SOAR', icon: Workflow },
    { id: 'intel', label: 'Threat Intelligence', icon: Compass },
    { id: 'hunting', label: 'Threat Hunting', icon: Search },
    { id: 'malware', label: 'Malware Analysis', icon: Fingerprint },
    { id: 'incidents', label: 'Incident Response', icon: FolderLock },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'notifications', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="flex h-screen bg-cyber-bg overflow-hidden text-slate-300 font-sans select-none relative">
      
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyber-accent/5 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyber-primary/3 blur-[150px] pointer-events-none rounded-full" />

      {/* 1. LEFT SIDEBAR COMPONENT */}
      <aside className="w-64 bg-[#070b14]/70 backdrop-blur-xl border-r border-cyber-border/40 flex flex-col justify-between shrink-0 z-20 shadow-2xl">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-3 p-5 border-b border-cyber-border/40">
            <div className="p-1.5 bg-[#03060c] border border-cyber-primary/30 rounded-lg shadow-glow glow-green">
              <ShieldAlert className="w-5 h-5 text-cyber-primary animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-slate-100 text-sm tracking-widest font-mono glow-text-green">ZENTRIX</span>
              <p className="text-[9px] text-cyber-primary/70 font-mono tracking-wider leading-none">CYBER TASK FORCE</p>
            </div>
          </div>

          {/* Navigation drawer links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all leading-none border border-transparent ${
                    isActive 
                      ? 'bg-cyber-primary/10 border-l-2 border-l-cyber-primary border-t-white/5 border-r-white/5 border-b-white/5 text-cyber-primary font-bold shadow-glow shadow-cyber-primary/5' 
                      : 'hover:bg-cyber-card/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyber-primary' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User context footer - Dashboard Profile Widget */}
        <div className="p-4 border-t border-cyber-border/40 bg-transparent space-y-2">
          {user && (
            <div className="p-3 glass-card border border-white/5 rounded-xl space-y-2 text-[10px] font-mono leading-snug shadow-md">
              <div className="flex items-center gap-2">
                <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-full border border-cyber-primary/30 shrink-0 object-cover" />
                <div className="overflow-hidden leading-tight">
                  <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[9px] text-cyber-primary truncate">{user.role}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-cyber-border/45 space-y-1 text-slate-500">
                <p className="truncate">Email: <span className="text-slate-300">{user.email}</span></p>
                <p>WhatsApp: <span className="text-slate-300">{user.whatsapp}</span></p>
                <p>Registered: <span className="text-slate-300">{new Date(user.joinedAt).toLocaleDateString()}</span></p>
                <p className="text-[9px] text-cyber-primary leading-none mt-1">
                  Active: {time.substring(11, 19)}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN SYSTEM CONSOLE FRAME */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent z-10">
        
        {/* Core Header section */}
        <header className="h-14 bg-[#070b14]/50 backdrop-blur-xl border-b border-cyber-border/30 px-6 flex items-center justify-between shrink-0 font-sans z-10 shadow-md">
          <div className="flex items-center gap-6">
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-100 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-ping"></span>
              {menuItems.find(m => m.id === activeTab)?.label} MODULE
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-white/5 border border-white/5 rounded-full px-2.5 py-0.5">
                <Database className="w-3.5 h-3.5 text-cyber-primary animate-pulse" />
                <span>DB:</span>
                <span className="text-slate-200 font-medium">{dbHealth}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono bg-white/5 border border-white/5 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse"></span>
                <span>Workstation:</span>
                <span className="text-slate-200 font-medium uppercase font-mono">LOCAL NODE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px]">
            {/* Global Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Global search..." 
                className="bg-[#03060c] border border-cyber-border/80 pl-7 pr-3 py-1 text-[10px] rounded-lg focus:outline-none focus:border-cyber-accent focus:shadow-glow focus:glow-cyan text-cyber-accent w-40 transition-all focus:w-48"
              />
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-1 bg-[#03060c] border border-cyber-border/80 rounded-lg hover:border-cyber-accent transition-all relative shadow-md"
              >
                <Bell className="w-3.5 h-3.5 text-cyber-accent" />
                {liveAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-danger rounded-full animate-ping"></span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-72 glass-panel rounded-xl shadow-2xl z-50 p-3 space-y-2 select-text text-[10px] max-h-80 overflow-y-auto border border-white/10">
                  <p className="text-slate-500 uppercase tracking-widest text-[8px] font-bold border-b border-white/5 pb-1">
                    RECENT THREAT ALERTS ({liveAlerts.length})
                  </p>
                  {liveAlerts.slice(0, 5).map((a: any, idx: number) => (
                    <div key={idx} className="p-2 border-b border-white/5 last:border-b-0 hover:bg-white/5 rounded-lg transition-all">
                      <p className="font-bold text-cyber-danger uppercase leading-none">{a.title}</p>
                      <p className="text-[8px] text-slate-400 mt-1 truncate">{a.description}</p>
                      <p className="text-[7px] text-slate-500 mt-0.5">{a.host} | {new Date(a.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
                  {liveAlerts.length === 0 && (
                    <p className="text-slate-500 text-center py-4 font-mono">No notifications triggered.</p>
                  )}
                </div>
              )}
            </div>

            {/* IST Clock */}
            <div className="flex items-center gap-1.5 bg-[#03060c] px-3 py-1.5 border border-cyber-border/85 rounded-lg text-cyber-primary font-bold shadow-md shadow-cyber-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse shrink-0"></span>
              <Clock className="w-3.5 h-3.5 text-cyber-primary" />
              <span>{istTime} IST</span>
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC INTERNAL VIEWPORTS */}
        <section className="flex-1 overflow-auto bg-transparent p-6 relative">
          
          {activeTab === 'dashboard' && (
            <Dashboard />
          )}

          {activeTab === 'scanner' && (
            <NetworkScanner />
          )}

          {activeTab === 'packets' && (
            <PacketAnalysis />
          )}

          {activeTab === 'siem' && (
            <SIEM 
              token={token} 
            />
          )}

          {activeTab === 'edr' && (
            <EDR 
              token={token} 
            />
          )}

          {activeTab === 'ids' && (
            <IDS 
              token={token} 
            />
          )}

          {activeTab === 'hunting' && (
            <ThreatHunting 
              token={token} 
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentResponse 
              liveAlerts={liveAlerts}
              token={token} 
            />
          )}

          {activeTab === 'intel' && (
            <ThreatIntel 
              token={token} 
            />
          )}

          {activeTab === 'malware' && (
            <MalwareAnalysis 
              token={token} 
            />
          )}

          {activeTab === 'soar' && (
            <SOAR 
              token={token} 
            />
          )}

          {activeTab === 'reports' && (
            <Reporting 
              token={token} 
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings 
              user={user}
              token={token}
              onUpdate={(updatedUser: any) => dispatch(setUser(updatedUser))}
            />
          )}

        </section>
      </main>

      {/* 4. REAL-TIME THREAT ALERTS FLOAT TOAST PANELS */}
      <div className="absolute bottom-5 right-5 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-40px)] font-mono">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem 
              key={toast.id} 
              toast={toast} 
              onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} 
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 5. FULL-SCREEN CRITICAL SECURITY ALERT OVERLAY */}
      {criticalPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 select-text animate-fade-in">
          <div className="glass-panel border-2 border-cyber-danger/45 rounded-2xl max-w-2xl w-full p-8 shadow-glow glow-red relative overflow-hidden flex flex-col font-mono">
            {/* Pulsing hazard lights background */}
            <div className="absolute inset-0 bg-radial-gradient from-cyber-danger/10 to-transparent pointer-events-none animate-pulse" />
            
            <div className="flex items-center gap-4 border-b border-cyber-danger/25 pb-4 mb-6">
              <div className="p-3 bg-cyber-danger/10 border border-cyber-danger rounded-xl text-cyber-danger animate-pulse shadow-glow glow-red">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-widest text-cyber-danger uppercase glow-text-red">CRITICAL THREAT DETECTED</h1>
                <p className="text-[9px] text-[#fda4af] uppercase tracking-wider mt-0.5">SOAR Containment Protocol In Effect</p>
              </div>
              {criticalPopup.count > 1 && (
                <span className="ml-auto bg-cyber-danger text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                  {criticalPopup.count} ATTEMPTS
                </span>
              )}
            </div>

            <div className="space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 border border-white/5 rounded-xl font-mono text-[10px] text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[8px] tracking-wider">THREAT CLASSIFICATION</span>
                  <span className="text-cyber-danger font-bold text-xs uppercase">{criticalPopup.category || 'Malicious Intrusion'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] tracking-wider">TARGET ENDPOINT</span>
                  <span className="text-slate-200 font-bold text-xs">{criticalPopup.host || 'LOCAL NODE'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] tracking-wider">DETECTED TIMESTAMP</span>
                  <span className="text-slate-350">{new Date(criticalPopup.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[8px] tracking-wider">MITRE ATT&CK TACTIC</span>
                  <span className="text-cyber-accent font-bold">{criticalPopup.evidence?.mitreTactic || 'Execution'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Threat Indicators Details</span>
                <div className="p-4 bg-black/50 border border-white/5 rounded-xl text-slate-300 text-xs leading-relaxed max-h-36 overflow-y-auto">
                  {criticalPopup.description}
                </div>
              </div>

              {criticalPopup.evidence && (
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Active Evidence Package</span>
                  <pre className="p-3 bg-black border border-cyber-accent/15 rounded-xl text-[9px] text-cyber-primary overflow-x-auto max-h-32 shadow-inner">
                    {JSON.stringify(criticalPopup.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between gap-4 border-t border-white/10 pt-6">
              <button 
                onClick={() => setCriticalPopup(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs py-3 rounded-xl uppercase transition-colors"
              >
                Acknowledge Alert
              </button>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/edr/isolate', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                      },
                      body: JSON.stringify({ hostname: criticalPopup.host, action: 'Isolate' })
                    });
                  } catch (e) {
                    console.error('Failed to isolate host from popup:', e);
                  }
                  setCriticalPopup(null);
                }}
                className="flex-1 bg-cyber-danger hover:bg-[#e11d48] text-white font-bold text-xs py-3 rounded-xl uppercase transition-colors shadow-lg shadow-cyber-danger/20 border border-cyber-danger/30"
              >
                Isolate Host Endpoint
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
