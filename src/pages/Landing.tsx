import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UmbrellaCanopy } from "@/components/UmbrellaCanopy";
import { ArrowRight, Palette, Image as ImageIcon, FileDown, Sparkles, ShieldCheck, Layers } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-hero grid place-items-center text-primary-foreground font-display font-bold">U</div>
            <span className="font-display font-bold tracking-tight text-lg">Umbrella Render Studio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <Link to="/projects" className="hover:text-foreground transition">My Projects</Link>
          </nav>
          <Link to="/design"><Button variant="default">Start Design</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> MVP for sales & client previews
          </span>
          <h1 className="mt-5 font-display text-5xl md:text-6xl font-extrabold tracking-tight text-balance">
            Instant umbrella<br />mockups — without a designer.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            Create umbrella rendering previews for silkscreen logos or full digital print designs.
            Choose category, rib count, upload artwork and export a quotation-ready mockup in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/design">
              <Button size="lg" className="bg-gradient-hero shadow-elegant">
                Start Design <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/projects">
              <Button size="lg" variant="outline">My Projects</Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" /> Factory-confirmed workflow</span>
            <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /> 6 / 8 / 10 rib panels</span>
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

      {/* Features */}
      <section id="features" className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Everything sales teams need to close faster</h2>
          <p className="mt-3 text-muted-foreground">Two print modes, three umbrella categories, real-time canopy preview.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: Palette, title: "Silkscreen mode", desc: "Place logos or text on 1, 2, 4 or 8 panels. Ideal for small-area branding." },
            { icon: ImageIcon, title: "Digital print mode", desc: "Full-cover artwork or single-panel high-resolution images with fit controls." },
            { icon: FileDown, title: "Export & quote", desc: "Download PNG mockups and PDF summaries with category, ribs, panels & notes." },
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

      {/* How it works */}
      <section id="how" className="bg-card border-y border-border">
        <div className="container py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-center">How it works</h2>
          <ol className="mt-12 grid md:grid-cols-4 gap-6">
            {[
              "Choose category — folding, straight or golf",
              "Pick rib count — 6, 8 or 10 panels",
              "Select silkscreen or digital print",
              "Upload artwork, preview & export",
            ].map((step, i) => (
              <li key={i} className="rounded-xl border border-border bg-background p-5">
                <div className="font-display text-3xl font-bold text-primary/30">0{i + 1}</div>
                <div className="mt-2 font-medium">{step}</div>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link to="/design"><Button size="lg" className="bg-gradient-hero shadow-elegant">Start Design <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>

      <footer className="container py-10 text-sm text-muted-foreground text-center">
        © {new Date().getFullYear()} Umbrella Render Studio — sales preview tool. Final production artwork to be confirmed by factory designer.
      </footer>
    </div>
  );
};

export default Landing;
