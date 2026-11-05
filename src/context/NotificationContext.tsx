
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Some backend validation errors read as "<intro>: item1 (STATUS), item2 (STATUS), ... . <outro>"
// (e.g. discharge clearance failures listing every still-active order). Break those into a
// readable intro line + bulleted list + closing instruction instead of one dense paragraph.
interface ParsedListMessage {
  intro: string;
  items: string[];
  outro: string;
}

const parseListMessage = (message: string): ParsedListMessage | null => {
  const match = message.match(/^(.*?):\s*(.+\))\.\s*(.*)$/s);
  if (!match) return null;
  const [, intro, listPart, outro] = match;

  const rawItems = listPart.split(/\),\s*/);
  const items = rawItems.map((item, idx) => {
    const trimmed = item.trim();
    return idx < rawItems.length - 1 ? `${trimmed})` : trimmed;
  });

  if (items.length < 2 || !items.every((item) => item.includes('(') && item.includes(')'))) {
    return null;
  }

  return { intro: intro.trim(), items, outro: outro.trim() };
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Errors stay until the user dismisses them; other toasts auto-remove after 5 seconds.
    if (type !== 'error') {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    }
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={20} />;
      default: return <Info className="text-brand-active0" size={20} />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-white border-emerald-100 text-emerald-900 shadow-emerald-100/50';
      case 'error': return 'bg-white border-red-100 text-red-900 shadow-red-100/50';
      case 'warning': return 'bg-white border-amber-100 text-amber-900 shadow-amber-100/50';
      default: return 'bg-white border-brand-active text-brand-primary shadow-brand-active/50';
    }
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 w-full max-w-md pointer-events-none px-4">
        {notifications.map((n) => {
          const parsed = parseListMessage(n.message);
          return (
            <div
              key={n.id}
              className={`
                pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-[24px] border-2 shadow-2xl
                w-full animate-in slide-in-from-top-4 fade-in duration-300
                ${parsed ? 'max-w-lg' : ''}
                ${getStyles(n.type)}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              {parsed ? (
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-black leading-tight">{parsed.intro}:</p>
                  <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto pr-1">
                    {parsed.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 font-medium leading-snug">
                        <span className="w-1 h-1 rounded-full bg-current mt-2 shrink-0 opacity-60" />
                        <span className="break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {parsed.outro && (
                    <p className="font-black leading-tight mt-3">{parsed.outro}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-black flex-1 min-w-0 leading-tight break-words">{n.message}</p>
              )}
              <button
                onClick={() => removeNotification(n.id)}
                className="text-slate-300 hover:text-slate-600 transition-colors p-1 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
