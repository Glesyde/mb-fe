
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionRestoreService } from '../services/session-restore.service';
import { Stethoscope, Lock, User as UserIcon, ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import LoadingAnimation from './animations/LoadingAnimation';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const loggedInUser = await login(username, password);

      // Restore the previous session if available
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
      console.error("Login attempt failed:", err);
      if (!err.response) {
        setError('Network Error: Cannot connect to the medical server.');
      } else {
        setError(err.response.data?.message || 'Invalid Username or Password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left Side - Image Only (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Subtle overlay to ensure copyright text is readable, but image remains clear */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
        <img
          src="/assets/login-bg.jpeg"
          alt="Medical Facility"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {/* Copyright Overlay - Pushed to bottom via justify-end */}
        <div className="relative z-20 flex flex-col justify-end h-full p-12 text-white w-full">
          <div className="text-xs font-medium text-white/60 mx-auto">
            © 2026 Gracespring Hospitals Limited. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative lg:bg-[#FAFAFA]">
        {/* Brand Logo - Top Left Desktop */}
        {/* <div className="hidden lg:flex absolute top-12 left-12 items-center gap-2.5">
          <div className="bg-brand-primary w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-brand-primary/20">
            <span className="text-white font-bold text-lg leading-none">G</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-800 leading-tight">
              Gracespring
            </span>
            <span className="text-brand-primary font-black text-[9px] tracking-[0.2em] uppercase leading-none">
              HIS
            </span>
          </div>
        </div> */}
        {/* Mobile Background (Absolute) */}
        <div className="absolute inset-0 lg:hidden z-0">
          <img
            src="/assets/login-bg.jpeg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" />
        </div>

        <div className="w-full max-w-md 2xl:max-w-lg relative z-10 animate-in fade-in zoom-in duration-500">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl shadow-xl shadow-brand-primary/50 mb-4">
              <span className="text-white font-bold text-3xl">G</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Gracespring <span className="text-brand-primary">HIS</span>
            </h1>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block mb-10 text-center">
            <h2 className="text-3xl 2xl:text-4xl font-black text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium mt-2 2xl:text-lg">Sign in to continue to your dashboard</p>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 md:p-10 2xl:p-14 rounded-[40px] shadow-2xl border border-slate-100 shadow-slate-200/50 lg:shadow-xl lg:border-slate-200">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in shake-x duration-300">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff ID / Username</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. doctor1"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm 2xl:text-base font-bold text-slate-800 focus:bg-white focus:border-brand-active0 focus:ring-0 outline-none transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button type="button" className="text-[10px] font-bold text-brand-primary hover:text-brand-primary">Forgot Password?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm 2xl:text-base font-bold text-slate-800 focus:bg-white focus:border-brand-active0 focus:ring-0 outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary shadow-xl shadow-brand-active transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign in to dashboard
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 lg:text-slate-400/80 font-medium">
              Protected System. Access is logged.
            </p>
          </div>
        </div>
      </div>

      {isLoading && <LoadingAnimation />}
    </div>
  );
};

export default Login;


// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { sessionRestoreService } from '../services/session-restore.service';
// import { Stethoscope, Lock, User as UserIcon, ChevronRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
// import LoadingAnimation from './animations/LoadingAnimation';

// const Login: React.FC = () => {
//   const navigate = useNavigate();
//   const { login } = useAuth();
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);

//     try {
//       const loggedInUser = await login(username, password);

//       // Restore the previous session if available
//       if (loggedInUser?.id) {
//         const savedSession = sessionRestoreService.restoreSession(loggedInUser.id);
//         if (savedSession) {
//           sessionRestoreService.clearSession(loggedInUser.id);
//           navigate(savedSession.path, {
//             replace: true,
//             state: savedSession.state ?? undefined,
//           });
//           return;
//         }
//       }

//       navigate('/', { replace: true });
//     } catch (err: any) {
//       console.error("Login attempt failed:", err);
//       if (!err.response) {
//         setError('Network Error: Cannot connect to the medical server.');
//       } else {
//         setError(err.response.data?.message || 'Invalid Username or Password.');
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen w-full flex bg-slate-50">
//       {/* Left Side - Image Only (Desktop) */}
//       <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
//         {/* Subtle overlay to ensure copyright text is readable, but image remains clear */}
//         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10" />
//         <img
//           src="/assets/login-bg.jpeg"
//           alt="Medical Facility"
//           className="absolute inset-0 w-full h-full object-cover opacity-90"
//         />

//         {/* Copyright Overlay - Pushed to bottom via justify-end */}
//         <div className="relative z-20 flex flex-col justify-end h-full p-12 text-white w-full">
//           <div className="text-xs font-medium text-white/60">
//             © 2025 Grace Spring Hospitals. All rights reserved.
//           </div>
//         </div>
//       </div>

//       {/* Right Side - Login Form */}
//       <div className="flex-1 flex flex-col justify-center items-center p-6 relative lg:bg-[#FAFAFA]">
//         {/* Brand Logo - Top Left Desktop */}
//         <div className="hidden lg:flex absolute top-12 left-12 items-center gap-2.5">
//           <div className="bg-brand-primary w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-brand-primary/20">
//             <span className="text-white font-bold text-lg leading-none">G</span>
//           </div>
//           <div className="flex flex-col">
//             <span className="font-bold text-base tracking-tight text-slate-800 leading-tight">
//               Gracespring
//             </span>
//             <span className="text-brand-primary font-black text-[9px] tracking-[0.2em] uppercase leading-none">
//               HIS
//             </span>
//           </div>
//         </div>
//         {/* Mobile Background (Absolute) */}
//         <div className="absolute inset-0 lg:hidden z-0">
//           <img
//             src="/assets/login-bg.jpeg"
//             alt="Background"
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" />
//         </div>

//         <div className="w-full max-w-md 2xl:max-w-lg relative z-10 animate-in fade-in zoom-in duration-500">
//           {/* Mobile Logo */}
//           <div className="lg:hidden text-center mb-8">
//             <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl shadow-xl shadow-brand-primary/50 mb-4">
//               <span className="text-white font-bold text-3xl">G</span>
//             </div>
//             <h1 className="text-3xl font-black text-white tracking-tight">
//               Gracespring <span className="text-brand-primary">HIS</span>
//             </h1>
//           </div>

//           {/* Desktop Header */}
//           <div className="hidden lg:block mb-10 text-center">
//             <h2 className="text-3xl 2xl:text-4xl font-black text-slate-900 tracking-tight">Welcome back</h2>
//             <p className="text-slate-500 font-medium mt-2 2xl:text-lg">Sign in to continue to your dashboard</p>
//           </div>

//           {/* Login Card */}
//           <div className="bg-white p-8 md:p-10 2xl:p-14 rounded-[40px] shadow-2xl border border-slate-100 shadow-slate-200/50 lg:shadow-xl lg:border-slate-200">
//             {error && (
//               <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in shake-x duration-300">
//                 <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
//                 <p className="text-xs font-bold leading-relaxed">{error}</p>
//               </div>
//             )}

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff ID / Username</label>
//                 <div className="relative group">
//                   <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
//                   <input
//                     type="text"
//                     required
//                     autoFocus
//                     placeholder="e.g. doctor1"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm 2xl:text-base font-bold text-slate-800 focus:bg-white focus:border-brand-active0 focus:ring-0 outline-none transition-all"
//                     value={username}
//                     onChange={(e) => setUsername(e.target.value)}
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex justify-between items-center ml-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
//                   <button type="button" className="text-[10px] font-bold text-brand-primary hover:text-brand-primary">Forgot Password?</button>
//                 </div>
//                 <div className="relative group">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
//                   <input
//                     type={showPassword ? "text" : "password"}
//                     required
//                     placeholder="••••••••"
//                     className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm 2xl:text-base font-bold text-slate-800 focus:bg-white focus:border-brand-active0 focus:ring-0 outline-none transition-all"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(!showPassword)}
//                     className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
//                   >
//                     {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                   </button>
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 disabled={isLoading}
//                 className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary shadow-xl shadow-brand-active transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
//               >
//                 {isLoading ? (
//                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
//                 ) : (
//                   <>
//                     Sign in to dashboard
//                     <ChevronRight size={16} />
//                   </>
//                 )}
//               </button>
//             </form>
//           </div>

//           <div className="mt-8 text-center">
//             <p className="text-xs text-slate-400 lg:text-slate-400/80 font-medium">
//               Protected System. Access is logged.
//             </p>
//           </div>
//         </div>
//       </div>

//       {isLoading && <LoadingAnimation />}
//     </div>
//   );
// };

// export default Login;
