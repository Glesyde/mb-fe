
import React from 'react';
import { Wrench, FileText, Coins, Tag, History, UserMinus, Construction } from 'lucide-react';

const Placeholder: React.FC<{ title: string; icon: React.ReactNode; description: string }> = ({ title, icon, description }) => (
  <div className="bg-white border border-slate-200 rounded-[40px] p-20 text-center animate-in fade-in zoom-in duration-300">
    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300 relative">
      {icon}
      <div className="absolute -bottom-2 -right-2 bg-amber-100 text-amber-600 p-2 rounded-xl border-4 border-white shadow-sm">
        <Construction size={20} />
      </div>
    </div>
    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
    <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium leading-relaxed">
      {description}
    </p>
    <div className="mt-10 flex items-center justify-center gap-3">
       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Module under development</span>
    </div>
  </div>
);

export const BillAdjustments = () => (
  <Placeholder 
    title="Bill Adjustment" 
    icon={<Wrench size={48} />} 
    description="Tool for modifying finalized invoices, handling service cancellations, and rectifying ledger errors." 
  />
);

export const InvoiceGeneration = () => (
  <Placeholder 
    title="Invoice Generation" 
    icon={<FileText size={48} />} 
    description="Drafting and finalizing consolidated invoices for corporate clients and standard patients." 
  />
);

export const CashInsurance = () => (
  <Placeholder 
    title="Cash & Insurance" 
    icon={<Coins size={48} />} 
    description="Reconciliation dashboard for tracking payment mode distribution and HMO claim status." 
  />
);

export const Discounts = () => (
  <Placeholder 
    title="Discount Approval" 
    icon={<Tag size={48} />} 
    description="Workflow for applying and approving financial discounts and corporate concessions." 
  />
);

export const PaymentReceipts = () => (
  <Placeholder 
    title="Payment Receipt Registry" 
    icon={<History size={48} />} 
    description="Searchable history of all payment transactions with options for reprinting and thermal logging." 
  />
);

export const DebtorsList = () => (
  <Placeholder 
    title="Outstanding Balances" 
    icon={<UserMinus size={48} />} 
    description="Comprehensive list of patient debts and corporate credit aging for recovery management." 
  />
);
