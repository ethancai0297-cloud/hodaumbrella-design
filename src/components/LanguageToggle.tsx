import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-soft",
        className
      )}
      role="group"
      aria-label="Language"
    >
      <Globe className="h-3.5 w-3.5 text-muted-foreground mx-2" />
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full transition",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <button
        onClick={() => setLang("zh")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium rounded-full transition",
          lang === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={lang === "zh"}
      >
        中文
      </button>
    </div>
  );
};
