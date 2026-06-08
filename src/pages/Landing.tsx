import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import { ArrowRight, Palette, Image as ImageIcon, FileDown, Sparkles, ShieldCheck, Layers } from "lucide-react";
import logo from "@/assets/hoda-tuzh-logo.png";

const OCTAGON_CLIP = "polygon(50% 0%, 85% 15%, 100% 50%, 85% 85%, 50% 100%, 15% 85%, 0% 50%, 15% 15%)";

const Landing = () => {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Hoda & Tuzh Umbrella" className="h-10 w-auto" />
            <span className="font-display font-bold tracking-tight text-lg leading-tight">
              Hoda Umbrella<span className="text-muted-foreground"> · </span>Tuzh Umbrella
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">{t("nav.features")}</a>
            <a href="#how" className="hover:text-foreground transition">{t("nav.how")}</a>
            <Link to="/projects" className="hover:text-foreground transition">{t("nav.projects")}</Link>
            <Link to="/carton" className="hover:text-foreground transition">Carton Mark</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/design"><Button>{t("nav.start")}</Button></Link>
          </div>
        </div>
      </header>

      <section className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("hero.badge")}
          </span>
          <h1 className="mt-5 font-display text-5xl md:text-6xl font-extrabold tracking-tight text-balance">
            {t("hero.title")}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">{t("hero.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/design">
              <Button size="lg" className="bg-gradient-hero shadow-elegant">
                {t("hero.cta.start")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/projects">
              <Button size="lg" variant="outline">{t("hero.cta.projects")}</Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> {t("hero.tag.factory")}</span>
            <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /> {t("hero.tag.ribs")}</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Ambient glows */}
          <div className="absolute w-[500px] h-[500px] bg-indigo-400/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute w-[300px] h-[300px] bg-rose-400/10 blur-[80px] rounded-full translate-x-20 pointer-events-none" />

          <div className="relative w-full aspect-square max-w-xl bg-card rounded-3xl shadow-elegant border border-border overflow-hidden">
            <div className="relative w-full h-full p-12 flex items-center justify-center">
              {/* Background umbrella — rose/orange dotted */}
              <div className="absolute transform rotate-12 -translate-x-12 -translate-y-8 scale-90 opacity-40">
                <div className="w-72 h-72 md:w-80 md:h-80 relative">
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-rose-400 to-orange-300"
                    style={{ clipPath: OCTAGON_CLIP }}
                  />
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: "radial-gradient(#fff 1px, transparent 0)",
                      backgroundSize: "12px 12px",
                      clipPath: OCTAGON_CLIP,
                    }}
                  />
                </div>
              </div>

              {/* Middle umbrella — indigo gradient w/ ribs */}
              <div className="absolute transform -rotate-6 translate-x-16 translate-y-4">
                <div className="w-80 h-80 md:w-[22rem] md:h-[22rem] relative drop-shadow-2xl">
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-700"
                    style={{ clipPath: OCTAGON_CLIP }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ clipPath: OCTAGON_CLIP }}
                  >
                    <div className="w-full h-px bg-white/20 absolute" />
                    <div className="w-full h-px bg-white/20 absolute rotate-45" />
                    <div className="w-full h-px bg-white/20 absolute rotate-90" />
                    <div className="w-full h-px bg-white/20 absolute -rotate-45" />
                    <div className="w-3 h-3 bg-indigo-900 rounded-full z-10 border border-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Front hero umbrella — dark slate with branding */}
              <div className="relative transform scale-110" style={{ filter: "drop-shadow(0 35px 35px rgba(79,70,229,0.2))" }}>
                <div className="w-80 h-80 md:w-96 md:h-96 relative">
                  <div
                    className="absolute inset-0 bg-slate-900 overflow-hidden"
                    style={{ clipPath: OCTAGON_CLIP }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                    <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-400/20 blur-3xl rounded-full" />
                    <div className="absolute bottom-0 right-0 p-12 text-white/5 text-7xl md:text-9xl font-black italic select-none leading-none">
                      HODA
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ clipPath: OCTAGON_CLIP }}
                  >
                    <div className="w-full h-px bg-slate-700/50 absolute" />
                    <div className="w-full h-px bg-slate-700/50 absolute rotate-45" />
                    <div className="w-full h-px bg-slate-700/50 absolute rotate-90" />
                    <div className="w-full h-px bg-slate-700/50 absolute -rotate-45" />
                    <div className="w-4 h-4 bg-black rounded-full z-10 ring-4 ring-slate-800" />
                  </div>
                </div>

                {/* Floating tags */}
                <div className="absolute -top-4 -right-4 md:-right-8 bg-card/90 backdrop-blur px-3 py-2 rounded-lg shadow-soft border border-border flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold text-foreground">{t("landing.tag.silk")}</span>
                </div>
                <div className="absolute -bottom-6 -left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg shadow-soft border border-border flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-card" />
                    <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-card" />
                    <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-card" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">{t("landing.tag.colors")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{t("feat.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("feat.subtitle")}</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: Palette, title: t("feat.silk.title"), desc: t("feat.silk.desc") },
            { icon: ImageIcon, title: t("feat.digital.title"), desc: t("feat.digital.desc") },
            { icon: FileDown, title: t("feat.export.title"), desc: t("feat.export.desc") },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-soft hover:shadow-elegant transition">
              <div className="h-10 w-10 rounded-lg bg-accent grid place-items-center text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-card border-y border-border">
        <div className="container py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-center">{t("how.title")}</h2>
          <ol className="mt-12 grid md:grid-cols-4 gap-6">
            {[t("how.step1"), t("how.step2"), t("how.step3"), t("how.step4")].map((step, i) => (
              <li key={i} className="rounded-xl border border-border bg-background p-5">
                <div className="font-display text-3xl font-bold text-primary/30">0{i + 1}</div>
                <div className="mt-2 font-medium">{step}</div>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link to="/design"><Button size="lg" className="bg-gradient-hero shadow-elegant">{t("hero.cta.start")} <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <footer className="container py-10 text-sm text-muted-foreground text-center">
        © {new Date().getFullYear()} {t("footer.note")}
      </footer>
    </div>
  );
};

export default Landing;
