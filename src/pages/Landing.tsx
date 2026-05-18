import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UmbrellaCanopy } from "@/components/UmbrellaCanopy";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/i18n";
import { ArrowRight, Palette, Image as ImageIcon, FileDown, Sparkles, ShieldCheck, Layers } from "lucide-react";
import logo from "@/assets/hoda-tuzh-logo.png";

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

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-accent opacity-20 blur-3xl rounded-full" />
          <div className="relative rounded-2xl bg-card border border-border shadow-elegant p-6 grid place-items-center">
            <UmbrellaCanopy
              category="golf"
              ribCount={8}
              fabricColor="#0f1f3d"
              artwork={[
                { id: "1", type: "text", text: "ACME", color: "#ffffff", fontSize: 28, x: 0, y: 0, scale: 1.2, rotation: 0, panels: [0, 2, 4, 6] },
              ]}
              selectedPanels={[]}
              highlightSelection={false}
              size={460}
            />
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
