import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PasswordWarningAlert = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        // Explicitly check for !user to narrow the type and satisfy TypeScript
        if (!user || !user.pwd_warning) return;

        const LAST_SHOWN_KEY = `pwd_alert_last_shown_${user.id}`;
        const lastShownTime = localStorage.getItem(LAST_SHOWN_KEY);
        const currentTime = new Date().getTime();
        
        // PRODUCTION MODE: 24 Hour Snooze
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        // Show alert if never shown, OR if 24 hours have passed since they clicked "Remind me later"
        if (!lastShownTime || (currentTime - parseInt(lastShownTime)) > TWENTY_FOUR_HOURS) {
            setShowAlert(true);
        }
    }, [user]);

    const handleDismiss = () => {
        if (!user) return; // Type guard for the dismiss handler
        const LAST_SHOWN_KEY = `pwd_alert_last_shown_${user.id}`;
        localStorage.setItem(LAST_SHOWN_KEY, new Date().getTime().toString());
        setShowAlert(false);
    };

    // Add `!user` to this check to guarantee `user` is fully defined for the JSX below
    if (!showAlert || !user) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 flex items-start gap-4 max-w-lg w-[90vw] animate-in slide-in-from-top-8 duration-300">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600 shrink-0">
                    <AlertTriangle size={28} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-amber-900 text-base uppercase tracking-widest">
                        Password Expires in {user.pwd_days_left} Days
                    </h3>
                    <p className="text-sm text-amber-800 mt-2 font-medium leading-relaxed">
                        Security Policy requires a password change every 60 days. If you do not update your password, your account will be automatically locked.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button 
                            onClick={() => {
                                handleDismiss();
                                navigate('/profile'); 
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors shadow-md"
                        >
                            Change Password Now
                        </button>
                        <button 
                            onClick={handleDismiss}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
                        >
                            Remind Me Tomorrow
                        </button>
                    </div>
                </div>
                <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600 p-1">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default PasswordWarningAlert;


// import React, { useEffect, useState } from 'react';
// import { useAuth } from '../context/AuthContext'; 
// import { AlertTriangle, X } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';

// const PasswordWarningAlert = () => {
//     const { user } = useAuth();
//     const navigate = useNavigate();
//     const [showAlert, setShowAlert] = useState(false);

//     useEffect(() => {
//         // Explicitly check for !user to narrow the type and satisfy TypeScript
//         if (!user || !user.pwd_warning) return;

//         const LAST_SHOWN_KEY = `pwd_alert_last_shown_${user.id}`;
//         const lastShownTime = localStorage.getItem(LAST_SHOWN_KEY);
//         const currentTime = new Date().getTime();
        
//         // PRODUCTION MODE: 24 Hour Snooze
//         const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

//         // Show alert if never shown, OR if 24 hours have passed since they clicked "Remind me later"
//         if (!lastShownTime || (currentTime - parseInt(lastShownTime)) > TWENTY_FOUR_HOURS) {
//             setShowAlert(true);
//         }
//     }, [user]);

//     const handleDismiss = () => {
//         if (!user) return; // Type guard for the dismiss handler
//         const LAST_SHOWN_KEY = `pwd_alert_last_shown_${user.id}`;
//         localStorage.setItem(LAST_SHOWN_KEY, new Date().getTime().toString());
//         setShowAlert(false);
//     };

//     // Add `!user` to this check to guarantee `user` is fully defined for the JSX below
//     if (!showAlert || !user) return null;

//     return (
//         <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
//             <div className="bg-amber-50 border-2 border-amber-500 rounded-2xl shadow-2xl p-6 flex items-start gap-4 max-w-lg w-[90vw] animate-in slide-in-from-top-8 duration-300">
//                 <div className="bg-amber-100 p-3 rounded-full text-amber-600 shrink-0">
//                     <AlertTriangle size={28} strokeWidth={2.5} />
//                 </div>
//                 <div className="flex-1">
//                     <h3 className="font-black text-amber-900 text-base uppercase tracking-widest">
//                         Password Expires in {user.pwd_days_left} Days
//                     </h3>
//                     <p className="text-sm text-amber-800 mt-2 font-medium leading-relaxed">
//                         Security Policy requires a password change every 14 days. If you do not update your password, your account will be automatically locked.
//                     </p>
//                     <div className="mt-5 flex flex-wrap gap-3">
//                         <button 
//                             onClick={() => {
//                                 handleDismiss();
//                                 navigate('/profile'); 
//                             }}
//                             className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors shadow-md"
//                         >
//                             Change Password Now
//                         </button>
//                         <button 
//                             onClick={handleDismiss}
//                             className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
//                         >
//                             Remind Me Tomorrow
//                         </button>
//                     </div>
//                 </div>
//                 <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600 p-1">
//                     <X size={20} />
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default PasswordWarningAlert;

