import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionRestoreService } from '../services/session-restore.service';
import {
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  KeyRound,
  ShieldAlert,
  ServerCrash
} from 'lucide-react';
import LoadingAnimation from './animations/LoadingAnimation';

/**
 * High-quality, scalable SVG / Typography component of your brand 
 * to keep visual clarity perfect (MedBookie | Health Information Software)
 */
const MedBookieLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-none">
        <span className="text-[#F28C0F]">Med</span>
        <span className="text-[#1E252B]">Bookie</span>
      </div>
      <div className="mx-3 h-7 w-[1.5px] bg-slate-200" />
      <div className="flex flex-col justify-center text-left leading-none">
        <span className="text-[#F28C0F] font-bold text-xs tracking-tight">
          Health Information
        </span>
        <span className="text-slate-500 font-normal text-[11px] tracking-tight mt-[1px]">
          Software
        </span>
      </div>
    </div>
  );
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const loggedInUser = await login(username, password);

      // Restore previous multi-tenant session if existing
      if (loggedInUser?.id) {
        const savedSession = sessionRestoreService.restoreSession(loggedInUser.id);
        if (savedSession) {
          sessionRestoreService.clearSession(loggedInUser.id);
          navigate(savedSession.path, {
            replace: true,
            state: savedSession.state ?? undefined,
          });
          return;
        }
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Login failed:', err);
      if (!err.response) {
        setError('Network Connection Error: MedBookie central cloud node is unreachable.');
      } else {
        setError(err.response.data?.message || 'Verification failed. Incorrect Staff ID or Access Pin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = () => {
    // Implement biometric or security key verification
    alert('Requesting Passkey / Bio-Authentication via system credentials...');
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Top Utility Nav */}
      <header className=" w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">

        <div
          className=" mx-auto"
        >

          <MedBookieLogo />
        
        </div>

        {/* Workspace indicator generalized for multi-tenant SaaS */}
        {/* <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
          <Building2 className="w-3.5 h-3.5 text-[#F28C0F]" />
          <span>Tenant: <strong className="text-slate-900">Enterprise Cloud Portal</strong></span>
        </div> */}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 z-10">
        <div className="w-full max-w-[420px] text-center">
          
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
              Powering Global Health.
            </h1>
            <p className="text-slate-700 mt-1.5">
              Welcome back
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/80 shadow-[0_8px_40px_-10px_rgba(15,23,42,0.06)] p-6 sm:p-8 text-left">
            
            {/* Action Card Header: Enterprise Passkey Option */}
            <button
              onClick={handlePasskeyLogin}
              type="button"
              className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-xl text-slate-700 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <KeyRound className="w-4 h-4 text-[#F28C0F]" />
              Sign in with passkey
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-black tracking-widest uppercase">
                OR
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Error alerts if existing */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/80 rounded-xl flex gap-2.5 items-start text-red-700 animate-in fade-in zoom-in-95 duration-150">
                <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1">
                <label htmlFor="username" className="text-xs font-semibold text-slate-700">
                  Staff ID / Email address
                </label>
                <div className="relative group">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F28C0F] transition-colors pointer-events-none" />
                  <input
                    id="username"
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. nurse_jane or id@medbookie.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#F28C0F] focus:ring-4 focus:ring-[#F28C0F]/8 outline-none transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#F28C0F] hover:text-[#D97706]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#F28C0F] transition-colors pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#F28C0F] focus:ring-4 focus:ring-[#F28C0F]/8 outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Station Control */}
              {/* <div className="flex items-center justify-between py-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#F28C0F] focus:ring-[#F28C0F]/30"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    Remember this workstation for 30 days
                  </span>
                </label>
              </div> */}

              {/* Action submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#F28C0F] hover:bg-[#DF7E07] active:bg-[#C96F04] text-white py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[#F28C0F]/20 transition-all active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Secure Link...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to portal</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
{/* 
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                Session security protocol is active.
              </span>
              <a href="#it-support" className="text-slate-500 hover:text-slate-800 transition-colors">
                Contact Support
              </a>
            </div> */}
          </div>

          {/* <div className="mt-4 text-center">
            <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
              <ServerCrash className="w-3 h-3 text-slate-300" /> Enterprise secure workspace • Authorized personnel only.
            </span>
          </div> */}
        </div>
      </main>

      {/* Spacious Custom Illustrated Medical Artwork Footer Banner */}
      <footer className="w-full relative select-none pointer-events-none mt-auto border-t border-slate-100">
        
        {/* Custom Medical Illustrated Landscape Section */}
        <div className="w-full max-h-[140px] flex justify-center items-end bg-gradient-to-t from-slate-50 to-transparent">
          <img
            src="/assets/medical-landscape-footer.jpeg"
            alt="Illustrative visual of medical equipment, laboratories, clinic spaces, and health information metrics"
            className="w-full h-auto max-h-[140px] object-cover object-bottom opacity-90 transition-opacity duration-300"
          />
        </div>

        {/* Global Compliance overlay bar */}
        <div className="w-full bg-slate-50 border-t border-slate-100 py-4 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-medium">
            <span>© {new Date().getFullYear()} MedBookie (HIS). All rights reserved.</span>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                HIPAA, NDPR & ISO 27001 Compliant Network
              </span>
              <span>•</span>
              <a href="#terms" className="hover:text-slate-600 transition-colors">Terms</a>
              <span>•</span>
              <a href="#privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {isLoading && <LoadingAnimation />}
    </div>
  );
};

export default Login;
