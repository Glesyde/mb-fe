
import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  id: string;
  label: string;
  test: (pass: string) => boolean;
}

const REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface PasswordValidatorProps {
  password: string;
  onValidChange?: (isValid: boolean) => void;
}

const PasswordValidator: React.FC<PasswordValidatorProps> = ({ password, onValidChange }) => {
  const results = REQUIREMENTS.map(req => ({
    ...req,
    isMet: req.test(password)
  }));

  const allMet = results.every(r => r.isMet);

  React.useEffect(() => {
    onValidChange?.(allMet);
  }, [allMet, onValidChange]);

  if (!password) return null;

  return (
    <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Password Requirements</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {results.map(req => (
          <div key={req.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${req.isMet ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              {req.isMet ? <Check size={10} className="text-white" /> : <X size={10} className="text-slate-400" />}
            </div>
            <span className={`text-[11px] font-bold transition-colors ${req.isMet ? 'text-emerald-600' : 'text-slate-400'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
      
      {allMet && (
        <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl animate-in zoom-in duration-300">
          <Check size={14} className="font-black" />
          <span className="text-xs font-black uppercase tracking-tight">Security Standards Met</span>
        </div>
      )}
    </div>
  );
};

export default PasswordValidator;
