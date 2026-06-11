// frontend/src/components/Auth.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  CheckCircle,
  XCircle,
  Loader2,
  LockKeyhole
} from 'lucide-react';

const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'
];

const COUNTRIES = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'USA' },
  { code: '+44', name: 'UK' },
  { code: '+61', name: 'Australia' },
  { code: '+971', name: 'UAE' },
  { code: '+65', name: 'Singapore' }
];

interface AuthProps {
  onRegisterSuccess: (profile: any, token: string) => void;
}

export default function Auth({ onRegisterSuccess }: AuthProps) {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(true);
  const [checkingUser, setCheckingUser] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [rememberMe, setRememberMe] = useState(true);

  // Field Touched state for inline validations
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Eye toggles for passwords
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if any user registration exists on startup
  useEffect(() => {
    const checkUserExists = async () => {
      try {
        const res = await fetch('/api/auth/check');
        if (res.ok) {
          const data = await res.json();
          // If user exists, default to Sign In mode. Otherwise default to Register (Create Account)
          setIsRegisterMode(!data.exists);
        }
      } catch (err) {
        console.error('Error checking user setup:', err);
      } finally {
        setCheckingUser(false);
      }
    };
    checkUserExists();
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-zinc-800' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score, label: 'Fair', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);
  const isPasswordMatch = password === confirmPassword;

  // Handle avatar file upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Validate inputs
        if (!name || !email || !password || !phone) {
          setError('Please complete all required fields.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            whatsapp: `${countryCode}${phone}`,
            avatar
          })
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('soc_token', data.token);
          onRegisterSuccess(data.user, data.token);
        } else {
          setError(data.error || 'Workstation provisioning failed.');
        }
      } else {
        // Sign In logic
        if (!email || !password) {
          setError('Please fill in both Email and Password.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
          if (rememberMe) {
            localStorage.setItem('soc_token', data.token);
          } else {
            sessionStorage.setItem('soc_token', data.token);
          }
          onRegisterSuccess(data.user, data.token);
        } else {
          setError(data.error || 'Authentication verification failed.');
        }
      }
    } catch (err) {
      setError('Connection to ZENTRIX security gateway failed.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cyber-bg text-cyber-primary font-mono text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-cyber-primary mb-3" />
        <span className="tracking-widest animate-pulse">Checking ZENTRIX credentials status...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#070B14] relative overflow-hidden font-sans select-none"
      style={{
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(0,255,135,0.05) 0%, transparent 60%), #070B14`
      }}
    >
      {/* Animated Matrix/Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,212,255,0.015)_1px,_transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

      {/* Left Panel: Branding and Dashboard Mockups (55% width) */}
      <div className="hidden lg:flex lg:w-[55%] p-16 flex-col justify-between relative z-10 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0d1117] border border-cyber-accent/20 rounded-xl shadow-glow glow-green">
            <ShieldAlert className="w-6 h-6 text-cyber-accent" />
          </div>
          <div>
            <span className="font-extrabold text-slate-100 text-lg tracking-widest font-mono">ZENTRIX</span>
            <p className="text-[10px] text-cyber-accent font-mono tracking-widest leading-none">ENTERPRISE SOC</p>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight font-mono">
            Unified Security <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyan-400">Operations Center</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Real-time cross-platform telemetry monitoring, static binary malware classification, tshark packet capture parsing, and automated SOAR orchestration playbooks in a single offline-first workstation.
          </p>

          {/* Frosted Stat Previews */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl backdrop-blur-md"
            >
              <p className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Node Posture</p>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-1">98.4% SECURE</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl backdrop-blur-md"
            >
              <p className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Threat Count</p>
              <p className="text-lg font-bold text-red-500 font-mono mt-1">0 ACTIVE</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl backdrop-blur-md col-span-2"
            >
              <p className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Active Threat Intel Feeds</p>
              <p className="text-xs font-semibold text-cyan-400 font-mono mt-1">VT, AbuseIPDB, AlienVault OTX (Offline Cache Enabled)</p>
            </motion.div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono flex gap-4">
          <span>HOST ID: LOCAL_NODE_01</span>
          <span>•</span>
          <span>VERSION: 1.2.0</span>
        </div>
      </div>

      {/* Right Panel: Glassmorphism Auth Form (45% width) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0D1117]/85 backdrop-blur-[20px] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Header Mobile Brand */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-6">
            <ShieldAlert className="w-6 h-6 text-cyber-accent" />
            <span className="font-extrabold text-slate-100 text-md tracking-widest font-mono">ZENTRIX</span>
          </div>

          {/* Form tab controllers */}
          <div className="flex justify-center border-b border-white/5 mb-6 relative">
            <button
              onClick={() => { setIsRegisterMode(false); setError(''); }}
              className={`pb-3 text-xs font-mono font-bold tracking-widest uppercase flex-1 text-center relative transition-colors ${
                !isRegisterMode ? 'text-cyber-accent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
              {!isRegisterMode && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-accent" />
              )}
            </button>
            <button
              onClick={() => { setIsRegisterMode(true); setError(''); }}
              className={`pb-3 text-xs font-mono font-bold tracking-widest uppercase flex-1 text-center relative transition-colors ${
                isRegisterMode ? 'text-cyber-accent' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Create Account
              {isRegisterMode && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-accent" />
              )}
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-xs flex items-center gap-2 font-mono"
            >
              <XCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegisterMode ? (
                <motion.div 
                  key="register"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Sentinel Analyst"
                        className="w-full bg-[#111827] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onBlur={() => setEmailTouched(true)}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="analyst@zentrix.local"
                        className={`w-full bg-[#111827] border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono ${
                          emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {emailTouched && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <p className="text-[9px] text-red-500 mt-1 font-mono">Invalid email address.</p>
                    )}
                  </div>

                  {/* Password + Strength Meter */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Create Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type={showPass ? "text" : "password"}
                        required
                        value={password}
                        onBlur={() => setPassTouched(true)}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#111827] border border-white/10 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-wider text-slate-500">
                          <span>Password Strength:</span>
                          <span className={strength.score <= 1 ? 'text-red-400' : strength.score <= 3 ? 'text-amber-400' : 'text-emerald-400'}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-zinc-800 rounded overflow-hidden flex gap-0.5">
                          <div className={`h-full flex-1 ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type={showConfirm ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onBlur={() => setConfirmTouched(true)}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-[#111827] border rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono ${
                          confirmTouched && !isPasswordMatch ? 'border-red-500' : 'border-white/10'
                        }`}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350"
                      >
                        {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {confirmTouched && !isPasswordMatch && (
                      <p className="text-[9px] text-red-500 mt-1 font-mono">Passwords do not match.</p>
                    )}
                  </div>

                  {/* WhatsApp Number with country code */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">WhatsApp Number</label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <select
                          value={countryCode}
                          onChange={e => setCountryCode(e.target.value)}
                          className="bg-[#111827] border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                        >
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input 
                          type="text"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="98765 43210"
                          className="w-full bg-[#111827] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Avatar upload */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-2">Cyber Avatar Selector</label>
                    <div className="flex gap-3 justify-center items-center py-2 bg-[#111827] rounded-lg border border-white/5">
                      {AVATARS.map((url, idx) => (
                        <img 
                          key={idx}
                          src={url}
                          onClick={() => setAvatar(url)}
                          className={`w-10 h-10 rounded-full border cursor-pointer object-cover transition-all ${
                            avatar === url ? 'border-cyber-accent scale-110 shadow-glow glow-green' : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                          alt="avatar selection"
                        />
                      ))}
                      <div className="relative w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-zinc-800 cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="signin"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="analyst@zentrix.local"
                        className="w-full bg-[#111827] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input 
                        type={showPass ? "text" : "password"}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#111827] border border-white/10 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded bg-[#111827] border-white/10 text-cyber-accent focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-[10px] uppercase font-mono text-slate-400 cursor-pointer select-none">
                      Remember this workstation key
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyber-accent hover:from-cyan-700 hover:to-emerald-400 text-white font-mono font-bold py-2.5 rounded-lg text-xs transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Node Keys...</span>
                </>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4 text-cyan-200" />
                  <span>{isRegisterMode ? 'PROVISION WORKSTATION →' : 'AUTHENTICATE NODE →'}</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
