import React, { useState } from 'react';
import { ShieldAlert, User, Mail, Phone, Lock, Terminal } from 'lucide-react';

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'
];

export default function ProfileRegistration({ onRegisterSuccess }: { onRegisterSuccess: (user: any) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !whatsapp) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp, avatar })
      });
      const data = await res.json();
      if (res.ok) {
        onRegisterSuccess(data.profile);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch (err) {
      setError('Connection to ZENTRIX security gateway failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05080f] relative overflow-hidden font-sans select-none">
      {/* Glow Visuals */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-black to-black"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(30,41,59,0.03)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(30,41,59,0.03)_1px,_transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 w-full max-w-lg p-8 bg-[#0d1323] border border-[#1e2e4f] rounded-lg shadow-2xl glow-blue">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl mb-3 animate-pulse">
            <ShieldAlert className="w-9 h-9 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-slate-100 uppercase">ZENTRIX WORKSTATION REGISTRATION</h1>
          <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">Initialize Local-First SOC Secure Nodes</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded text-xs flex items-center gap-2 font-mono">
            <Terminal className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Full Name
            </label>
            <input 
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Adrian Director" 
              className="w-full bg-[#050811] border border-slate-700 px-3 py-2 text-xs text-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-500" /> Email Address
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="analyst@zentrix.local" 
              className="w-full bg-[#050811] border border-slate-700 px-3 py-2 text-xs text-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-500" /> WhatsApp Number
            </label>
            <input 
              type="text"
              required
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="+1234567890" 
              className="w-full bg-[#050811] border border-slate-700 px-3 py-2 text-xs text-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono text-slate-400 mb-2">Select Cyber Avatar</label>
            <div className="flex gap-4 justify-center items-center py-1">
              {AVATARS.map((url, idx) => (
                <img 
                  key={idx}
                  src={url}
                  onClick={() => setAvatar(url)}
                  className={`w-12 h-12 rounded-full border cursor-pointer object-cover transition-all ${
                    avatar === url ? 'border-blue-500 scale-110 shadow-lg glow-blue' : 'border-slate-800 hover:border-slate-600'
                  }`}
                  alt="avatar option"
                />
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold py-2.5 rounded text-xs transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mt-4"
          >
            <Lock className="w-4 h-4 text-blue-300" />
            {loading ? 'INITIALIZING KEY VAULT...' : 'PROVISION WORKSTATION'}
          </button>
        </form>
      </div>
    </div>
  );
}
