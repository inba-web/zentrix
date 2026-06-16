import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Phone, Clock, ShieldCheck, Terminal, AlertTriangle, Database,
  ChevronDown, ChevronRight, Bell, BellOff, Cpu, Wifi, Volume2, VolumeX,
  RefreshCw, Download, Trash2, Eye, EyeOff, CheckCircle, XCircle, Server
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// ─── Accordion Section Wrapper ────────────────────────────────────────────────
function Section({
  id, title, subtitle, icon: Icon, iconColor, open, onToggle, children
}: any) {
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0D1117] shadow-lg">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-black/40 border border-white/5 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">{title}</p>
            <p className="text-[10px] text-slate-500 font-mono">{subtitle}</p>
          </div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-cyan-400 transition-transform" />
          : <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, color = 'cyan' }: any) {
  const colors: Record<string, string> = {
    cyan: 'peer-checked:bg-cyan-600',
    emerald: 'peer-checked:bg-emerald-600',
    amber: 'peer-checked:bg-amber-600',
    red: 'peer-checked:bg-red-600',
    blue: 'peer-checked:bg-blue-600',
  };
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className={`w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer ${colors[color] || colors.cyan} after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5`}></div>
    </label>
  );
}

// ─── Input Field ───────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder = '', hint = '' }: any) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="space-y-1">
      <label className="block text-[9px] uppercase font-mono text-slate-400 tracking-widest">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-slate-200 rounded-lg focus:outline-none focus:border-cyan-500/40 transition-colors"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-2 text-slate-500 hover:text-slate-300">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[9px] text-slate-600 font-mono">{hint}</p>}
    </div>
  );
}

// ─── Status Toast ──────────────────────────────────────────────────────────────
function StatusMsg({ msg, type }: { msg: string; type: 'success' | 'error' | '' }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-mono border ${
      type === 'success'
        ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
        : 'bg-red-950/30 border-red-500/20 text-red-400'
    }`}>
      {type === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function NotificationSettings({ user, token, onUpdate }: any) {
  const websocketLogs = useSelector((state: RootState) => state.dashboard.websocketLogs) ?? [];

  // Open accordion section
  const [open, setOpen] = useState<string>('A');
  const toggle = (id: string) => setOpen(prev => prev === id ? '' : id);

  // ── Section A: Notification Delivery ──────────────────────────────────────
  const [smtpHost, setSmtpHost] = useState(user?.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(user?.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(user?.smtpUsername || '');
  const [smtpPass, setSmtpPass] = useState(user?.smtpPassword || '');
  const [smtpTls, setSmtpTls] = useState(user?.smtpUseTls !== false);
  const [twilioSid, setTwilioSid] = useState(user?.twilioSid || '');
  const [twilioToken, setTwilioToken] = useState(user?.twilioToken || '');
  const [twilioFrom, setTwilioFrom] = useState(user?.twilioFrom || '');
  const [twilioTo, setTwilioTo] = useState(user?.twilioTo || user?.whatsapp || '');
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [testEmailType, setTestEmailType] = useState<'success' | 'error' | ''>('');
  const [testWaMsg, setTestWaMsg] = useState('');
  const [testWaType, setTestWaType] = useState<'success' | 'error' | ''>('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWa, setTestingWa] = useState(false);

  // ── Section B: Report Frequency ────────────────────────────────────────────
  const [frequency, setFrequency] = useState<number>(user?.reportFrequency || 12);
  const [emailEnabled, setEmailEnabled] = useState(user?.emailReportsEnabled !== false);
  const [waEnabled, setWaEnabled] = useState(user?.whatsAppReportsEnabled !== false);
  const [nextTrigger, setNextTrigger] = useState('');

  // ── Section C: Threat Alerts & Alarms ──────────────────────────────────────
  const [alarmEnabled, setAlarmEnabled] = useState(user?.alarmEnabled !== false);
  const [popupEnabled, setPopupEnabled] = useState(user?.popupEnabled !== false);
  const [popupDuration, setPopupDuration] = useState(user?.popupDuration || 10);
  const [showSimulated, setShowSimulated] = useState(user?.showSimulatedThreats === true);
  const [desktopNotif, setDesktopNotif] = useState(user?.desktopNotifications !== false);

  // ── Section D: Log Management ───────────────────────────────────────────────
  const [dbCounts, setDbCounts] = useState<{ logs: number; auditLogs: number } | null>(null);
  const [pruneDate, setPruneDate] = useState('');
  const [pruneMsg, setPruneMsg] = useState('');
  const [pruneType, setPruneType] = useState<'success' | 'error' | ''>('');
  const [pruning, setPruning] = useState(false);
  const [showLiveLogs, setShowLiveLogs] = useState(false);
  const liveLogRef = useRef<HTMLDivElement>(null);

  // ── Section E: System & Database ────────────────────────────────────────────
  const [mongoUri, setMongoUri] = useState(user?.mongodbUri || '');
  const [mongoMsg, setMongoMsg] = useState('');
  const [mongoType, setMongoType] = useState<'success' | 'error' | ''>('');
  const [testingMongo, setTestingMongo] = useState(false);
  const [sysInfo, setSysInfo] = useState<any>(null);

  // ── Save loading ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveType, setSaveType] = useState<'success' | 'error' | ''>('');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Compute next IST trigger time
  useEffect(() => {
    if (frequency === 0) { setNextTrigger('Disabled'); return; }
    const now = new Date();
    const nextMs = now.getTime() + frequency * 60 * 60 * 1000;
    setNextTrigger(new Date(nextMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }));
  }, [frequency]);

  // Fetch db counts on mount
  useEffect(() => {
    fetch('/api/settings/db-counts', { headers: authHeader })
      .then(r => r.json())
      .then(d => setDbCounts(d))
      .catch(() => {});
    fetch('/api/settings/system-versions', { headers: authHeader })
      .then(r => r.json())
      .then(d => setSysInfo(d))
      .catch(() => {});
  }, []);

  // Auto-scroll live log panel
  useEffect(() => {
    if (showLiveLogs && liveLogRef.current) {
      liveLogRef.current.scrollTop = liveLogRef.current.scrollHeight;
    }
  }, [websocketLogs, showLiveLogs]);

  // ── Test SMTP ───────────────────────────────────────────────────────────────
  const testEmail = async () => {
    setTestingEmail(true); setTestEmailMsg(''); setTestEmailType('');
    try {
      const r = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass, useTls: smtpTls })
      });
      const d = await r.json();
      if (r.ok) { setTestEmailMsg(d.message || 'SMTP test successful.'); setTestEmailType('success'); }
      else { setTestEmailMsg(d.error || 'SMTP test failed.'); setTestEmailType('error'); }
    } catch { setTestEmailMsg('Network error during SMTP test.'); setTestEmailType('error'); }
    finally { setTestingEmail(false); }
  };

  // ── Test WhatsApp ───────────────────────────────────────────────────────────
  const testWhatsapp = async () => {
    setTestingWa(true); setTestWaMsg(''); setTestWaType('');
    try {
      const r = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ sid: twilioSid, token: twilioToken, fromNumber: twilioFrom, toNumber: twilioTo })
      });
      const d = await r.json();
      if (r.ok) { setTestWaMsg(d.message || 'WhatsApp test sent.'); setTestWaType('success'); }
      else { setTestWaMsg(d.error || 'WhatsApp test failed.'); setTestWaType('error'); }
    } catch { setTestWaMsg('Network error during WhatsApp test.'); setTestWaType('error'); }
    finally { setTestingWa(false); }
  };

  // ── Prune Logs ──────────────────────────────────────────────────────────────
  const pruneLogs = async () => {
    if (!pruneDate) { setPruneMsg('Select a cutoff date first.'); setPruneType('error'); return; }
    setPruning(true); setPruneMsg(''); setPruneType('');
    try {
      const r = await fetch(`/api/logs/prune?before=${pruneDate}`, { method: 'DELETE', headers: authHeader });
      const d = await r.json();
      if (r.ok) {
        setPruneMsg(`Pruned ${d.prunedLogs || 0} logs and ${d.prunedAudits || 0} audit logs.`);
        setPruneType('success');
        // Refresh counts
        const c = await fetch('/api/settings/db-counts', { headers: authHeader }).then(x => x.json());
        setDbCounts(c);
      } else { setPruneMsg(d.error || 'Prune failed.'); setPruneType('error'); }
    } catch { setPruneMsg('Prune request failed.'); setPruneType('error'); }
    finally { setPruning(false); }
  };

  // ── Export Logs ─────────────────────────────────────────────────────────────
  const exportLogs = () => {
    const json = JSON.stringify(websocketLogs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `zentrix_logs_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Test MongoDB ────────────────────────────────────────────────────────────
  const testMongo = async () => {
    setTestingMongo(true); setMongoMsg(''); setMongoType('');
    try {
      const r = await fetch('/api/settings/test-mongodb', {
        method: 'POST', headers: authHeader,
        body: JSON.stringify({ uri: mongoUri })
      });
      const d = await r.json();
      if (r.ok) { setMongoMsg(d.message || 'Connection successful.'); setMongoType('success'); }
      else { setMongoMsg(d.error || 'Connection failed.'); setMongoType('error'); }
    } catch { setMongoMsg('Request failed.'); setMongoType('error'); }
    finally { setTestingMongo(false); }
  };

  // ── Export Full DB Backup ───────────────────────────────────────────────────
  const exportBackup = () => {
    window.open('/api/settings/db-backup', '_blank');
  };

  // ── Save All Settings ───────────────────────────────────────────────────────
  const saveAll = async () => {
    setSaving(true); setSaveMsg(''); setSaveType('');
    try {
      const r = await fetch('/api/auth/update', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          smtpHost, smtpPort, smtpUsername: smtpUser, smtpPassword: smtpPass, smtpUseTls: smtpTls,
          twilioSid, twilioToken, twilioFrom, twilioTo,
          reportFrequency: frequency,
          emailReportsEnabled: emailEnabled,
          whatsAppReportsEnabled: waEnabled,
          alarmEnabled, popupEnabled, popupDuration,
          showSimulatedThreats: showSimulated,
          desktopNotifications: desktopNotif,
          mongodbUri: mongoUri,
          whatsapp: twilioTo
        })
      });
      const d = await r.json();
      if (r.ok) {
        setSaveMsg('All configurations saved successfully.'); setSaveType('success');
        if (onUpdate) onUpdate(d.profile);
      } else { setSaveMsg(d.error || 'Save failed.'); setSaveType('error'); }
    } catch { setSaveMsg('Request failed.'); setSaveType('error'); }
    finally { setSaving(false); }
  };

  const freqOptions = [
    { label: 'Every 1 Hour (Dev / Testing)', value: 1 },
    { label: 'Every 6 Hours (Rapid Assessment)', value: 6 },
    { label: 'Every 12 Hours (Default Posture)', value: 12 },
    { label: 'Every 24 Hours (Daily Summary)', value: 24 },
    { label: 'Disabled', value: 0 },
  ];

  const popupDurOptions = [
    { label: '5 seconds', value: 5 },
    { label: '10 seconds', value: 10 },
    { label: '30 seconds', value: 30 },
    { label: 'Never (Manual dismiss)', value: 0 },
  ];

  const recentLogs = [...(websocketLogs ?? [])].reverse().slice(0, 20);

  return (
    <div className="max-w-3xl mx-auto space-y-3 font-sans text-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <Bell className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase font-mono tracking-wider">System Configuration Center</h2>
          <p className="text-[10px] text-slate-500 font-mono">ZENTRIX ENTERPRISE SETTINGS — SECTION BY SECTION CONTROL</p>
        </div>
      </div>

      {/* ── SECTION A: Notification Delivery ─────────────────────────────────── */}
      <Section id="A" title="Notification Delivery" subtitle="SMTP EMAIL · TWILIO WHATSAPP GATEWAY" icon={Mail} iconColor="text-blue-400" open={open === 'A'} onToggle={toggle}>
        {/* SMTP */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-cyan-400 font-bold border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> SMTP Configuration
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Host" value={smtpHost} onChange={(e: any) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
            <Field label="SMTP Port" value={smtpPort} onChange={(e: any) => setSmtpPort(e.target.value)} placeholder="587" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username / Email" value={smtpUser} onChange={(e: any) => setSmtpUser(e.target.value)} placeholder="user@gmail.com" />
            <Field label="Password / App Key" type="password" value={smtpPass} onChange={(e: any) => setSmtpPass(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg">
            <div>
              <p className="text-xs font-mono text-slate-200">Use TLS / SSL</p>
              <p className="text-[9px] text-slate-500 font-mono">Enable for port 465 (SSL) or 587 (STARTTLS)</p>
            </div>
            <Toggle checked={smtpTls} onChange={(e: any) => setSmtpTls(e.target.checked)} color="blue" />
          </div>
          <button
            onClick={testEmail}
            disabled={testingEmail || !smtpHost}
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-xs font-mono px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {testingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            {testingEmail ? 'SENDING TEST EMAIL...' : 'TEST SMTP CONNECTION'}
          </button>
          <StatusMsg msg={testEmailMsg} type={testEmailType} />
        </div>

        {/* Twilio */}
        <div className="space-y-3 mt-2">
          <p className="text-[10px] uppercase font-mono text-emerald-400 font-bold border-b border-white/5 pb-2 flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Twilio WhatsApp Gateway
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Twilio Account SID" value={twilioSid} onChange={(e: any) => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxx" />
            <Field label="Twilio Auth Token" type="password" value={twilioToken} onChange={(e: any) => setTwilioToken(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From WhatsApp Number" value={twilioFrom} onChange={(e: any) => setTwilioFrom(e.target.value)} placeholder="+14155238886" hint="Twilio sandbox number" />
            <Field label="To WhatsApp Number" value={twilioTo} onChange={(e: any) => setTwilioTo(e.target.value)} placeholder="+919876543210" hint="Recipient number with country code" />
          </div>
          <button
            onClick={testWhatsapp}
            disabled={testingWa || !twilioSid}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {testingWa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
            {testingWa ? 'SENDING TEST MESSAGE...' : 'TEST WHATSAPP CONNECTION'}
          </button>
          <StatusMsg msg={testWaMsg} type={testWaType} />
        </div>
      </Section>

      {/* ── SECTION B: Report Frequency ──────────────────────────────────────── */}
      <Section id="B" title="Report Frequency" subtitle="CRON SCHEDULE · DISPATCH CHANNELS · NEXT TRIGGER IST" icon={Clock} iconColor="text-amber-400" open={open === 'B'} onToggle={toggle}>
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-mono text-slate-500 font-bold">Delivery Interval</p>
          <div className="space-y-2">
            {freqOptions.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                frequency === opt.value
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/10'
              }`}>
                <input
                  type="radio"
                  name="freq"
                  value={opt.value}
                  checked={frequency === opt.value}
                  onChange={() => setFrequency(opt.value)}
                  className="accent-amber-400"
                />
                <span className="text-xs font-mono">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg">
              <div>
                <p className="text-xs font-mono text-slate-200 flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-400" /> Send via Email</p>
              </div>
              <Toggle checked={emailEnabled} onChange={(e: any) => setEmailEnabled(e.target.checked)} color="blue" />
            </div>
            <div className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg">
              <div>
                <p className="text-xs font-mono text-slate-200 flex items-center gap-1.5"><Phone className="w-3 h-3 text-emerald-400" /> Send via WhatsApp</p>
              </div>
              <Toggle checked={waEnabled} onChange={(e: any) => setWaEnabled(e.target.checked)} color="emerald" />
            </div>
          </div>

          {nextTrigger && (
            <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-lg font-mono text-xs">
              <span className="text-amber-400 font-bold">NEXT SCHEDULED TRIGGER (IST): </span>
              <span className="text-slate-200">{nextTrigger === 'Disabled' ? '— Disabled —' : nextTrigger}</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── SECTION C: Threat Alerts & Alarms ────────────────────────────────── */}
      <Section id="C" title="Threat Alerts & Alarms" subtitle="AUDIO ALERTS · POPUP NOTIFICATIONS · SIMULATION FILTERS" icon={Bell} iconColor="text-red-400" open={open === 'C'} onToggle={toggle}>
        <div className="space-y-3">
          {[
            {
              label: 'Enable Audio Alarm on Critical Threats',
              desc: '3-beep Web Audio API tone fires on CRITICAL severity threat alerts',
              icon: alarmEnabled ? Volume2 : VolumeX,
              iconColor: 'text-red-400',
              checked: alarmEnabled,
              onChange: (e: any) => setAlarmEnabled(e.target.checked),
              color: 'red'
            },
            {
              label: 'Show Popup Notifications',
              desc: 'Framer Motion toast slides in from bottom-right on new threat events',
              icon: Bell,
              iconColor: 'text-cyan-400',
              checked: popupEnabled,
              onChange: (e: any) => setPopupEnabled(e.target.checked),
              color: 'cyan'
            },
            {
              label: 'Show Simulated / Demo Threats in UI',
              desc: 'SIM-tagged threats from the simulator are visible in SIEM, Alerts, and KPI counts',
              icon: Cpu,
              iconColor: 'text-slate-400',
              checked: showSimulated,
              onChange: (e: any) => setShowSimulated(e.target.checked),
              color: 'amber'
            },
            {
              label: 'Desktop OS Notifications',
              desc: 'Electron Notification API — shows native OS notification badges for critical events',
              icon: Wifi,
              iconColor: 'text-blue-400',
              checked: desktopNotif,
              onChange: (e: any) => setDesktopNotif(e.target.checked),
              color: 'blue'
            }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-black/30 border border-white/5 rounded-lg gap-4">
              <div className="flex items-start gap-3">
                <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${item.iconColor}`} />
                <div>
                  <p className="text-xs font-mono text-slate-200">{item.label}</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">{item.desc}</p>
                </div>
              </div>
              <Toggle checked={item.checked} onChange={item.onChange} color={item.color} />
            </div>
          ))}

          {/* Popup Duration Slider */}
          <div className="p-3 bg-black/30 border border-white/5 rounded-lg space-y-2">
            <p className="text-xs font-mono text-slate-200">Popup Auto-Dismiss Delay</p>
            <div className="flex items-center gap-3">
              {popupDurOptions.map(opt => (
                <label key={opt.value} className={`flex items-center gap-1.5 cursor-pointer text-[10px] font-mono transition-colors ${popupDuration === opt.value ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  <input type="radio" name="popup_dur" value={opt.value} checked={popupDuration === opt.value} onChange={() => setPopupDuration(opt.value)} className="accent-cyan-400" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── SECTION D: Log Management ─────────────────────────────────────────── */}
      <Section id="D" title="Log Management" subtitle="RECORD COUNTS · PRUNING · LIVE LOG STREAM CONSOLE" icon={Database} iconColor="text-purple-400" open={open === 'D'} onToggle={toggle}>
        {/* DB Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-black/40 border border-white/5 rounded-lg font-mono">
            <p className="text-[9px] uppercase text-slate-500">SIEM Logs</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {dbCounts ? dbCounts.logs.toLocaleString() : <span className="animate-pulse text-slate-600">———</span>}
            </p>
          </div>
          <div className="p-3 bg-black/40 border border-white/5 rounded-lg font-mono">
            <p className="text-[9px] uppercase text-slate-500">Audit Logs</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {dbCounts ? dbCounts.auditLogs.toLocaleString() : <span className="animate-pulse text-slate-600">———</span>}
            </p>
          </div>
        </div>

        {/* Protected records notice */}
        <div className="flex items-start gap-2 p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg text-[10px] font-mono text-blue-400">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Alerts, Incidents, Reports, IOCs, Playbooks, and Users are protected records — never auto-pruned.
        </div>

        {/* Manual Prune */}
        <div className="space-y-2">
          <p className="text-[9px] uppercase font-mono text-slate-500 tracking-widest">Manual Log Prune</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={pruneDate}
              onChange={e => setPruneDate(e.target.value)}
              className="flex-1 bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-slate-200 rounded-lg focus:outline-none focus:border-red-500/40"
            />
            <button
              onClick={pruneLogs}
              disabled={pruning || !pruneDate}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-mono px-4 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            >
              {pruning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {pruning ? 'PRUNING...' : 'PRUNE LOGS'}
            </button>
          </div>
          <StatusMsg msg={pruneMsg} type={pruneType} />
        </div>

        {/* Export + Live toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-white/10 text-slate-300 text-xs font-mono px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT LIVE LOGS (.JSON)
          </button>
          <button
            onClick={() => setShowLiveLogs(s => !s)}
            className={`flex items-center gap-2 border text-xs font-mono px-4 py-2 rounded-lg transition-colors ${
              showLiveLogs
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> {showLiveLogs ? 'HIDE' : 'VIEW'} LIVE LOG CONSOLE
          </button>
        </div>

        {/* Live log stream */}
        {showLiveLogs && (
          <div
            ref={liveLogRef}
            className="bg-black border border-white/5 rounded-xl font-mono text-[10px] p-3 h-48 overflow-y-auto space-y-1"
          >
            {recentLogs.length === 0 && (
              <p className="text-slate-600 italic">Waiting for live log events...</p>
            )}
            {recentLogs.map((log: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 leading-snug">
                <span className="text-cyan-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}
                </span>
                <span className={`px-1 rounded text-[8px] shrink-0 font-bold uppercase ${
                  log.severity === 'CRITICAL' ? 'bg-red-900/60 text-red-400'
                  : log.severity === 'HIGH' ? 'bg-orange-900/60 text-orange-400'
                  : log.severity === 'WARNING' ? 'bg-amber-900/60 text-amber-400'
                  : 'bg-slate-800 text-slate-500'
                }`}>{log.severity || 'INFO'}</span>
                <span className="text-slate-400 truncate">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── SECTION E: System & Database ─────────────────────────────────────── */}
      <Section id="E" title="System & Database" subtitle="DB MODE · MONGODB URI · VERSIONS · FULL BACKUP EXPORT" icon={Server} iconColor="text-emerald-400" open={open === 'E'} onToggle={toggle}>
        {/* System info */}
        {sysInfo && (
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            {[
              ['DB Mode', sysInfo.dbMode],
              ['App Version', `v${sysInfo.appVersion}`],
              ['Node.js', sysInfo.nodeVersion],
              ['Electron', sysInfo.electronVersion !== 'N/A' ? sysInfo.electronVersion : 'Web Mode'],
              ['Platform', sysInfo.platform],
              ['Architecture', sysInfo.arch],
            ].map(([k, v]) => (
              <div key={k} className="p-2.5 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center gap-2">
                <span className="text-slate-500 uppercase text-[9px] tracking-widest">{k}</span>
                <span className={`font-bold ${k === 'DB Mode' && (v as string).includes('MongoDB') ? 'text-emerald-400' : 'text-slate-200'}`}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* MongoDB URI Test */}
        <div className="space-y-2">
          <p className="text-[9px] uppercase font-mono text-slate-500 tracking-widest">MongoDB Connection URI</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={mongoUri}
              onChange={e => setMongoUri(e.target.value)}
              placeholder="mongodb://localhost:27017/zentrix"
              className="flex-1 bg-[#111827] border border-white/10 px-3 py-2 text-xs font-mono text-slate-200 rounded-lg focus:outline-none focus:border-emerald-500/40"
            />
            <button
              onClick={testMongo}
              disabled={testingMongo || !mongoUri}
              className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono px-4 py-2 rounded-lg transition-colors disabled:opacity-40 shrink-0"
            >
              {testingMongo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
              {testingMongo ? 'TESTING...' : 'TEST CONNECTION'}
            </button>
          </div>
          <StatusMsg msg={mongoMsg} type={mongoType} />
        </div>

        {/* Full DB backup export */}
        <button
          onClick={exportBackup}
          className="w-full flex items-center justify-center gap-2 bg-black/40 hover:bg-black/70 border border-white/10 text-slate-300 text-xs font-mono py-2.5 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> EXPORT FULL DATABASE BACKUP (.JSON)
        </button>
      </Section>

      {/* ── Global Save Button ─────────────────────────────────────────────────── */}
      <div className="pt-2 space-y-3">
        <StatusMsg msg={saveMsg} type={saveType} />
        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-mono font-bold py-3 rounded-xl text-xs transition-all uppercase tracking-widest shadow-lg shadow-cyan-500/10 disabled:opacity-50"
        >
          {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> SAVING CONFIGURATIONS...</> : <><ShieldCheck className="w-4 h-4" /> SAVE ALL CONFIGURATIONS</>}
        </button>
      </div>
    </div>
  );
}
