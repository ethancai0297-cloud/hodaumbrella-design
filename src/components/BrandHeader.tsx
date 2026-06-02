import logo from "@/assets/company-logo.png";

export const COMPANY_NAME = "HODA & TUZH Umbrella";

export const BrandHeader = ({ subtitle, compact = false }: { subtitle?: string; compact?: boolean }) => (
  <div className="flex items-center gap-3">
    <img src={logo} alt="HODA & TUZH" className={compact ? "h-9 w-auto" : "h-11 w-auto"} />
    <div className="leading-tight">
      <div className={compact ? "text-sm font-bold" : "text-base font-bold"}>{COMPANY_NAME}</div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  </div>
);
