import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userService } from '../../../services/user.service';
import { Loader2, AlertTriangle, Printer } from 'lucide-react';

const StaffIdPrintTemplate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) throw new Error("No User ID provided");
        const result = await userService.getUserById(parseInt(id));
        if (result) {
          setUser(result);
          setTimeout(() => window.print(), 1000);
        } else {
          setError('User not found.');
        }
      } catch (err) {
        setError('Could not load user data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={48} className="animate-spin text-[#2d258a]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-100 overflow-y-auto px-4 py-20 print:static print:bg-white print:p-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-8 print:hidden z-[100] shadow-md">
        <p className="font-bold text-sm">Staff ID Badge Preview</p>
        <button onClick={() => window.print()} className="bg-[#2d258a] hover:bg-brand-primary text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
          <Printer size={16} /> Print Badge
        </button>
      </div>

      <div className="flex flex-col gap-8 print:gap-4 print:page-break-inside-avoid items-center">
        {/* Front of ID - Horizontal layout like Patient Card */}
        <div className="w-[85.6mm] h-[53.98mm] bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none border border-slate-200 relative">
          <div className="absolute top-0 right-0 left-0 h-[20mm] bg-[#3B309A] overflow-hidden flex items-center justify-between px-4">
            <img src="/assets/login-bg.jpeg" alt="Header Logo" className="h-[12mm] w-[12mm] object-contain shrink-0" />
            <div className="flex-1 text-right">
              <h2 className="text-white font-black text-sm uppercase tracking-widest leading-none">Medbookie</h2>
              <p className="text-brand-active text-[6px] font-bold uppercase tracking-widest mt-1">Staff Identification Card</p>
            </div>
          </div>

          <div className="pt-[22mm] px-4 flex gap-4 h-full">
            <div className="w-[20mm] h-[25mm] bg-slate-100 rounded-lg border border-slate-300 shrink-0 overflow-hidden shadow-inner flex items-center justify-center">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Staff profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                  <span className="text-[20px] font-black">{user.first_name.charAt(0)}{user.last_name.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between pb-3 w-full">
              <div>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Name</p>
                <p className="text-sm font-black text-slate-800 leading-tight uppercase truncate">{user.first_name} {user.last_name}</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Staff ID</p>
                  <p className="text-xs font-black text-[#3B309A]">{user.staff_id || 'NOT ASSIGNED'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Role</p>
                  <p className="text-[10px] font-black text-slate-700 uppercase">{user.role?.name || 'Standard'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom color strip */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3B309A]"></div>
        </div>

        {/* Back of ID - Horizontal */}
        <div className="w-[85.6mm] h-[53.98mm] bg-white rounded-xl shadow-xl overflow-hidden print:shadow-none border border-slate-200 relative flex flex-col pt-2 px-4">
          <div className="w-full h-[6mm] bg-slate-800 rounded mb-3"></div>

          <h3 className="text-[8px] font-black text-[#3B309A] uppercase tracking-widest mb-2 border-b border-slate-200 w-full text-center pb-1">Rules & Conditions</h3>
          <div className="w-full text-[7px] font-medium text-slate-600 leading-snug space-y-1">
            <p>1. This card must be worn at all times while on hospital premises.</p>
            <p>2. Unauthorized use or transfer of this card is strictly prohibited.</p>
            <p>3. If found, please return to Medbookie Administration immediately.</p>
          </div>

          <div className="mt-auto mb-4 w-full flex justify-between items-end">
            <div className="text-[6px] text-slate-400 font-bold uppercase">Authorized Signature</div>
            <div className="w-[30mm] h-[5mm] bg-slate-800" style={{ backgroundImage: "repeating-linear-gradient(to right, transparent, transparent 1px, white 1px, white 2px, transparent 2px, transparent 4px)" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffIdPrintTemplate;
