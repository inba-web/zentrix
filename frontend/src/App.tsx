import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  ShieldAlert, 
  Terminal, 
  Activity, 
  Cpu, 
  Search, 
  FolderLock, 
  FileCheck2, 
  Compass, 
  Mail, 
  Radio, 
  FileSpreadsheet, 
  LogOut, 
  Clock, 
  Database, 
  AlertTriangle,
  Fingerprint
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
import Honeypot from './components/Honeypot';
import Reporting from './components/Reporting';
import NotificationSettings from './components/NotificationSettings';
import ProfileRegistration from './components/ProfileRegistration';

// Socket instance
let socket: any = null;

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('soc_token'));
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Real-time states
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Detecting...');
  const [time, setTime] = useState<string>(new Date().toISOString());

  // Toast notification lists
  const [toasts, setToasts] = useState<any[]>([]);

  // Telemetry logs lists shared with child elements via WebSockets
  const [websocketLogs, setWebsocketLogs] = useState<any[]>([]);
  const [edrUpdates, setEdrUpdates] = useState<any>({});
  const [honeypotUpdates, setHoneypotUpdates] = useState<any[]>([]);
  const [liveTelemetry, setLiveTelemetry] = useState<any>(null);

  // UTC clock tick
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch single-user profile on app start
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        // Ensure dummy token is active so sockets and child components can verify it
        if (!localStorage.getItem('soc_token')) {
          localStorage.setItem('soc_token', 'zentrix-local-active');
          setToken('zentrix-local-active');
        }
      } else {
        // Clear user/token if not registered
        setUser(null);
        setToken(null);
        localStorage.removeItem('soc_token');
      }
    } catch (e) {
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      // Initialize WebSocket connection
      socket = io('http://localhost:5000');

      socket.on('connect', () => {
        console.log('[WEBSOCKET] Active ZENTRIX pipelines successfully linked.');
      });

      // Handle SIEM logs
      socket.on('siem_log', (log: any) => {
        setWebsocketLogs(prev => [log, ...prev].slice(0, 100));
      });

      // Handle EDR updates
      socket.on('edr_stats', (stat: any) => {
        setEdrUpdates((prev: any) => ({
          ...prev,
          [stat.hostname]: stat
        }));
      });

      // Handle telemetry updates (Executive metrics)
      socket.on('telemetry_update', (data: any) => {
        setLiveTelemetry(data);
      });

      // Handle alerts
      socket.on('alert', (alert: any) => {
        setLiveAlerts(prev => [alert, ...prev]);
        triggerToast(alert);
      });

      // Handle honeypot activity
      socket.on('honeypot_console', (entry: any) => {
        setHoneypotUpdates(prev => [entry, ...prev].slice(0, 50));
      });

      // Fetch initial DB state
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          setDbStatus(data.database);
        })
        .catch(() => setDbStatus('Portable JSON DB'));

      return () => {
        if (socket) socket.disconnect();
      };
    }
  }, [token]);

  const triggerToast = (alert: any) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, ...alert }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const handleRegisterSuccess = (profile: any) => {
    localStorage.setItem('soc_token', 'zentrix-local-active');
    setToken('zentrix-local-active');
    setUser(profile);
  };

  const handleLogout = () => {
    // Single local workstation setup, logout clears state to allow re-reg if needed
    localStorage.removeItem('soc_token');
    setToken(null);
    setUser(null);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#05080f] text-slate-400 font-mono text-xs">
        <span className="w-9 h-9 rounded-full border-2 border-t-blue-500 border-slate-800 animate-spin mb-3"></span>
        <span>Awaiting ZENTRIX provisioning protocols...</span>
      </div>
    );
  }

  // If no profile registered, present one-time Registration form
  if (!user) {
    return (
      <ProfileRegistration onRegisterSuccess={handleRegisterSuccess} />
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Executive Metrics', icon: Activity },
    { id: 'siem', label: 'SIEM Core', icon: Terminal },
    { id: 'edr', label: 'EDR Endpoints', icon: Cpu },
    { id: 'ids', label: 'IDS Traffic', icon: Radio },
    { id: 'hunting', label: 'Threat Hunting', icon: Search },
    { id: 'incidents', label: 'Case Manager', icon: FolderLock },
    { id: 'intel', label: 'Threat Intelligence', icon: Compass },
    { id: 'malware', label: 'Malware Analysis', icon: Fingerprint },
    { id: 'phishing', label: 'Phishing Analyzer', icon: Mail },
    { id: 'honeypot', label: 'Honeypot Console', icon: Radio },
    { id: 'reports', label: 'Audit & Reports', icon: FileSpreadsheet },
    { id: 'notifications', label: 'Alerts Delivery', icon: Clock }
  ];

  return (
    <div className="flex h-screen bg-[#070b13] overflow-hidden text-slate-300 font-sans select-none">
      
      {/* 1. LEFT SIDEBAR COMPONENT */}
      <aside className="w-64 bg-[#0a0f1d] border-r border-[#1a253c] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-3 p-5 border-b border-[#1a253c] bg-[#0c1325]">
            <div className="p-1.5 bg-blue-950 border border-blue-500/30 rounded-lg shadow-glow glow-blue">
              <ShieldAlert className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm tracking-widest font-mono">ZENTRIX</span>
              <p className="text-[10px] text-blue-400 font-mono leading-tight">CYBER TASK FORCE</p>
            </div>
          </div>

          {/* Navigation drawer links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded transition-all leading-none ${
                    isActive 
                      ? 'bg-blue-950/60 border border-blue-500/30 text-blue-400 font-bold shadow-md shadow-blue-500/5' 
                      : 'hover:bg-slate-900 border border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User context footer - Dashboard Profile Widget */}
        <div className="p-4 border-t border-[#1a253c] bg-[#0a0f1d] space-y-2">
          {user && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2 text-[10px] font-mono leading-snug">
              <div className="flex items-center gap-2">
                <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-full border border-blue-500/30 shrink-0 object-cover" />
                <div className="overflow-hidden leading-tight">
                  <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[9px] text-blue-400 truncate">{user.role}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-900 space-y-1 text-slate-400">
                <p className="truncate">Email: <span className="text-slate-300">{user.email}</span></p>
                <p>WhatsApp: <span className="text-slate-300">{user.whatsapp}</span></p>
                <p>Registered: <span className="text-slate-300">{new Date(user.joinedAt).toLocaleDateString()}</span></p>
                <p className="text-[9px] text-[#64748b] leading-none mt-1">
                  Active: {time.substring(11, 19)}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN SYSTEM CONSOLE FRAME */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Core Header section */}
        <header className="h-14 bg-[#0a0f1d] border-b border-[#1a253c] px-6 flex items-center justify-between shrink-0 font-sans z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              {menuItems.find(m => m.id === activeTab)?.label} MODULE
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>DB:</span>
                <span className="text-slate-300 font-medium">{dbStatus}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Workstation:</span>
                <span className="text-slate-300 font-medium uppercase font-mono">LOCAL NODE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 bg-[#050811] px-3 py-1.5 border border-[#1a253c] rounded text-blue-400 font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>UTC: {time.replace('T', ' ').substring(0, 19)}</span>
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC INTERNAL VIEWPORTS */}
        <section className="flex-1 overflow-auto bg-[#070b13] p-6 relative">
          
          {activeTab === 'dashboard' && (
            <Dashboard 
              liveAlerts={liveAlerts} 
              websocketLogs={websocketLogs} 
              dbStatus={dbStatus} 
              liveTelemetry={liveTelemetry}
            />
          )}

          {activeTab === 'siem' && (
            <SIEM 
              websocketLogs={websocketLogs} 
              token={token} 
            />
          )}

          {activeTab === 'edr' && (
            <EDR 
              edrUpdates={edrUpdates} 
              token={token} 
            />
          )}

          {activeTab === 'ids' && (
            <IDS 
              websocketLogs={websocketLogs} 
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

          {activeTab === 'phishing' && (
            <PhishingAnalysis 
              token={token} 
            />
          )}

          {activeTab === 'honeypot' && (
            <Honeypot 
              honeypotUpdates={honeypotUpdates} 
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
              onUpdate={(updatedUser: any) => setUser(updatedUser)}
            />
          )}

        </section>
      </main>

      {/* 4. REAL-TIME THREAT ALERTS FLOAT TOAST PANELS */}
      <div className="absolute bottom-5 right-5 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-40px)]">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="p-4 bg-red-950/90 border border-red-500/50 rounded-lg text-slate-100 shadow-2xl glow-red slide-in flex gap-3 cursor-pointer select-text"
            onClick={() => setActiveTab('incidents')}
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="text-xs uppercase font-mono font-bold text-red-400">CRITICAL SYSTEM THREAT</span>
                <span className="text-[10px] text-red-500 font-mono">NOW</span>
              </div>
              <p className="text-xs font-bold text-slate-200 mt-1 truncate">{toast.title}</p>
              <p className="text-[11px] text-slate-300 mt-1 font-mono leading-snug">{toast.description}</p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase bg-red-950/50 px-2 py-0.5 border border-red-500/20 rounded inline-block">
                HOST: {toast.host}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
