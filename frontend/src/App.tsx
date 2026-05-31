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
  Workflow, 
  FileSpreadsheet, 
  LogOut, 
  User, 
  Database, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
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
import SOAR from './components/SOAR';
import Reporting from './components/Reporting';

// Socket instance
let socket: any = null;

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('soc_token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    // Clock tick
    const t = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (token) {
      // Validate token and fetch user details
      fetchProfile();
      
      // Initialize WebSocket connection
      socket = io('http://localhost:5000');

      socket.on('connect', () => {
        console.log('[WEBSOCKET] Real-time pipelines active.');
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

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const triggerToast = (alert: any) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, ...alert }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('soc_token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.error || 'Authentication failed.');
      }
    } catch {
      setAuthError('Unable to reach auth services.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      // High-Fidelity single sign on simulator
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin.director@enterprise.com',
          name: 'ADRIAN DIRECTOR',
          picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80',
          token: 'mock-google-oauth-payload-token-12345'
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('soc_token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
    } catch {
      setAuthError('Google OAuth gateway timed out.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('soc_token');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f] relative overflow-hidden font-sans">
        {/* Background visual graphics */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-black to-black"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(30,41,59,0.05)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(30,41,59,0.05)_1px,_transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="relative z-10 w-full max-w-md p-8 bg-[#0d1323] border border-[#1e2e4f] rounded-lg shadow-2xl glow-blue">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-blue-950/50 border border-blue-500/30 rounded-xl mb-3">
              <ShieldAlert className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold tracking-wider font-sans text-slate-100">ENTERPRISE SOC</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase font-mono">Operations Platform Version 4.8.0</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-mono text-slate-400 mb-1">Security Email</label>
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analyst@enterprise.com" 
                className="w-full bg-[#050811] border border-slate-700 px-3 py-2 text-sm text-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-mono text-slate-400 mb-1">Passkey</label>
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••••" 
                className="w-full bg-[#050811] border border-slate-700 px-3 py-2 text-sm text-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors mt-2"
            >
              {loading ? 'Authenticating with Vault...' : 'Access Safe Vault'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase font-mono"><span className="px-2 bg-[#0d1323] text-slate-500">SSO Single Sign-On</span></div>
          </div>

          <button 
            onClick={handleOAuthLogin}
            disabled={loading}
            className="w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Fingerprint className="w-4 h-4 text-blue-500" />
            Authenticate with Google OAuth
          </button>
        </div>
      </div>
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
    { id: 'soar', label: 'SOAR Playbooks', icon: Workflow },
    { id: 'reports', label: 'Audit & Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="flex h-screen bg-[#070b13] overflow-hidden text-slate-300 font-sans">
      
      {/* 1. LEFT SIDEBAR COMPONENT */}
      <aside className="w-64 bg-[#0a0f1d] border-r border-[#1a253c] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo brand */}
          <div className="flex items-center gap-3 p-5 border-b border-[#1a253c] bg-[#0c1325]">
            <div className="p-1.5 bg-blue-950 border border-blue-500/30 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <span className="font-bold text-slate-100 text-sm tracking-widest font-sans">ENTERPRISE SOC</span>
              <p className="text-[10px] text-[#64748b] font-mono leading-tight">THREAT RADAR ACT.</p>
            </div>
          </div>

          {/* Navigation drawer links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded transition-all leading-none ${
                    isActive 
                      ? 'bg-blue-950/60 border border-blue-500/30 text-blue-400 font-bold' 
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

        {/* User context footer */}
        <div className="p-3 border-t border-[#1a253c] bg-[#0a0f1d]">
          {user && (
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950/40 border border-slate-800 rounded">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-slate-700 shrink-0 object-cover" />
                <div className="overflow-hidden leading-tight">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                title="Logout System"
                className="p-1 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN SYSTEM CONSOLE FRAME */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Core Header section */}
        <header className="h-14 bg-[#0a0f1d] border-b border-[#1a253c] px-6 flex items-center justify-between shrink-0 font-sans z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-200">
              {menuItems.find(m => m.id === activeTab)?.label} MODULE
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>DB:</span>
                <span className="text-slate-300 font-medium">{dbStatus}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Feeds:</span>
                <span className="text-slate-300 font-medium">REAL-TIME</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 bg-[#050811] px-3 py-1.5 border border-[#1a253c] rounded">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>TIME (UTC):</span>
              <span className="text-slate-200 font-bold">{time.replace('T', ' ').substring(0, 19)}</span>
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

        </section>
      </main>

      {/* 4. REAL-TIME THREAT ALERTS FLOAT TOAST PANELS */}
      <div className="absolute bottom-5 right-5 z-50 flex flex-col gap-3 w-96 max-w-[calc(100vw-40px)]">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="p-4 bg-red-950/90 border border-red-500/50 rounded-lg text-slate-100 shadow-2xl glow-red slide-in flex gap-3 cursor-pointer"
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
