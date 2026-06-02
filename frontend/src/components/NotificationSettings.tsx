import React, { useState, useEffect } from 'react';
import { Mail, Phone, Clock, ShieldCheck, Terminal, AlertTriangle } from 'lucide-react';

export default function NotificationSettings({ user, token, onUpdate }: any) {
  const [emailEnabled, setEmailEnabled] = useState(user?.emailReportsEnabled !== false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(user?.whatsAppReportsEnabled !== false);
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp || '');
  const [frequency, setFrequency] = useState(user?.reportFrequency || 12);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsapp: whatsappNumber,
          emailReportsEnabled: emailEnabled,
          whatsAppReportsEnabled: whatsappEnabled,
          reportFrequency: frequency
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Notification parameters updated successfully.');
        if (onUpdate) onUpdate(data.profile);
      } else {
        setError(data.error || 'Failed to update settings.');
      }
    } catch {
      setError('ZENTRIX authentication gateway timed out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-[#111625] border border-slate-800 rounded-lg font-sans">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
        <Clock className="w-5 h-5 text-blue-500" />
        <div>
          <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-200">Alerts & Delivery Configurations</span>
          <p className="text-[10px] text-[#64748b] leading-tight font-mono">AUTOMATED SCHEDULERS PARAMETERS</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs font-mono rounded flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs font-mono rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Email settings */}
        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase font-mono">Email Audit Delivery</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={emailEnabled} 
                onChange={e => setEmailEnabled(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-slate-100"></div>
            </label>
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            When active, ZENTRIX will send a comprehensive security audit PDF every reporting interval to the email address registered under your profile.
          </p>
        </div>

        {/* WhatsApp settings */}
        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200 uppercase font-mono">WhatsApp Alerts Gateways</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={whatsappEnabled} 
                onChange={e => setWhatsappEnabled(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100"></div>
            </label>
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            When active, critical EDR threats and scheduled audit reports download links will be pushed dynamically to the number below.
          </p>
          
          <div className="space-y-1">
            <label className="block text-[9px] uppercase font-mono text-slate-400">WhatsApp Alert Number</label>
            <input 
              type="text"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="e.g. +1234567890"
              className="bg-[#050811] border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 rounded w-full focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Frequencies settings */}
        <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase font-mono">Reporting Delivery Frequency</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
            Define how frequently the security audit generation cron job triggers and dispatches packages.
          </p>

          <select 
            value={frequency} 
            onChange={e => setFrequency(parseInt(e.target.value))}
            className="bg-[#050811] border border-slate-700 text-xs font-mono px-3 py-2 rounded text-slate-200 w-full focus:outline-none"
          >
            <option value="1">Every 1 Hour (Developer Testing Mode)</option>
            <option value="6">Every 6 Hours (Rapid Assessment)</option>
            <option value="12">Every 12 Hours (Default Standard Posture)</option>
            <option value="24">Every 24 Hours (Daily Summary Logs)</option>
          </select>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold py-2.5 rounded text-xs transition-colors uppercase tracking-widest"
        >
          {loading ? 'SAVING PARAMETERS...' : 'SAVE CONFIGURATIONS'}
        </button>

      </form>
    </div>
  );
}
