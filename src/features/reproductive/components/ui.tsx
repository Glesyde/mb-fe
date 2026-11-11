// Small shared pieces for the Reproductive Health screens, styled like the existing EMR tabs.

import React, { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Citation, Language } from "../engine/types";
import { t } from "../i18n";
import { splitGlossary, type GlossaryId } from "../i18n/glossary";

const IS_DEV = (import.meta as any).env?.DEV === true;

/** Card state colours, shared by the clinician and patient views. */
export const STATE_TONE = { IMPROVING: "emerald", STABLE: "sky", NEEDS_ATTENTION: "amber", NOT_ENOUGH_DATA: "slate" } as const;
export const URGENCY_TONE = { INFO: "slate", ROUTINE: "sky", URGENT: "amber", EMERGENCY: "red" } as const;

/** Local date and time for a stored ISO timestamp; date-only values are shown as they are. */
export function formatTimestamp(iso: string): string {
  return iso.length > 10 ? new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : iso;
}

/** Save a Blob (PDF or JSON) through the browser's download. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A row of toggle buttons (aria-pressed). `dark` is for use on the dark demo header. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  dark = false,
}: {
  label: string;
  value: T;
  onChange: (value: NoInfer<T>) => void;
  options: readonly { id: NoInfer<T>; label: React.ReactNode; lang?: string }[];
  dark?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap rounded-lg border overflow-hidden text-xs font-bold ${dark ? "border-white/30" : "border-slate-300"}`}>
      {options.map((o) => {
        const active = value === o.id;
        const tone = dark
          ? active
            ? "bg-white text-brand-dark"
            : "text-white hover:bg-white/10"
          : active
            ? "bg-brand-dark text-white"
            : "bg-white text-slate-700 hover:bg-slate-50";
        return (
          <button
            key={o.id}
            type="button"
            lang={o.lang}
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`px-3 py-1.5 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary ${tone}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const LANGUAGE_OPTIONS = [
  { id: "en" as const, label: "EN" },
  { id: "ar" as const, label: "العربية", lang: "ar" },
];

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", children, ...rest }) => (
  <div {...rest} className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({ icon, children, right }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
      {icon}
      {children}
    </h3>
    {right}
  </div>
);

export const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block mb-1">
    {children}
  </label>
);

type Tone = "slate" | "amber" | "emerald" | "sky" | "brand" | "red" | "indigo";
const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  sky: "bg-sky-50 text-sky-800 border-sky-200",
  brand: "bg-orange-50 text-orange-800 border-orange-200",
  red: "bg-red-50 text-red-800 border-red-200",
  indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
};

export const Chip: React.FC<{ tone?: Tone; children: React.ReactNode; title?: string }> = ({ tone = "slate", children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${TONES[tone]}`}>
    {children}
  </span>
);

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; icon?: React.ReactNode }
> = ({ variant = "secondary", icon, className = "", children, ...rest }) => {
  const styles = {
    // Dark text on orange: white on brand orange is under the WCAG AA contrast minimum.
    primary: "bg-brand-primary hover:bg-brand-hover active:bg-brand-active text-brand-dark border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white border-transparent",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent",
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; side?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
  side,
}) => {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Move focus into the dialog when it opens, and back to where it was when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-stretch justify-end" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        className={
          side
            ? "bg-white h-full w-full max-w-lg shadow-2xl flex flex-col focus:outline-none"
            : `bg-white m-auto rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-[calc(100%-2rem)] ${wide ? "max-w-4xl" : "max-w-2xl"}`
        }
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 id={id} className="text-base font-black text-slate-800">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

/** A clinical term with a plain-language definition on hover, focus or tap. */
const Term: React.FC<{ id: GlossaryId; lang: Language; children: React.ReactNode }> = ({ id, lang, children }) => {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-dotted decoration-slate-400 underline-offset-2 cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm"
      >
        {children}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          dir={lang === "ar" ? "rtl" : "ltr"}
          lang={lang}
          className="absolute z-[70] start-0 top-full mt-1 w-64 p-2.5 rounded-lg bg-slate-800 text-white text-[11px] font-medium leading-snug shadow-xl normal-case tracking-normal"
        >
          {t(lang, `glossary.${id}`)}
        </span>
      )}
    </span>
  );
};

/** Text with the first occurrence of each glossary term made explainable. */
export const GlossaryText: React.FC<{ text: string; lang: Language }> = ({ text, lang }) => (
  <>
    {splitGlossary(text, lang).map((part, i) =>
      part.term ? (
        <Term key={i} id={part.term} lang={lang}>
          {part.text}
        </Term>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

export function formatCitation(c: Citation): string {
  return `${c.source}${c.ref ? ` ${c.ref}` : ""}`;
}

/** Citation text; unverified citations show "[verify]" in development builds only. */
export const CitationText: React.FC<{ citation: Citation }> = ({ citation }) => (
  <span className="text-[11px] text-slate-500 font-medium">
    {formatCitation(citation)}
    {IS_DEV && !citation.verified && <span className="ml-1 font-black text-amber-700">[verify]</span>}
  </span>
);

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p role="alert" className="text-[11px] font-semibold text-red-600 mt-1 ml-1">
      {message}
    </p>
  ) : null;

export const inputClass =
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary";
