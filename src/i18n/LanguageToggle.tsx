import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "./LanguageContext";

interface LanguageToggleProps {
  /** "dark" for the orange header, "light" for white pages such as Login. */
  variant?: "dark" | "light";
  className?: string;
}

/** EN ⇄ عربي switch. Shows the language you'd switch to. */
const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = "dark", className = "" }) => {
  const { lang, toggleLang } = useLanguage();
  const next = lang === "ar" ? "English" : "عربي";
  const label = lang === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic";

  const look =
    variant === "dark"
      ? "text-white hover:bg-white/10"
      : "text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={toggleLang}
      title={label}
      aria-label={label}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${look} ${className}`}
    >
      <Languages className="w-4 h-4" />
      <span lang={lang === "ar" ? "en" : "ar"}>{next}</span>
    </button>
  );
};

export default LanguageToggle;
