import {
  Radar,
  Zap,
  Globe,
  DollarSign,
  Briefcase,
  Star,
  Rss,
  Puzzle,
  Share2,
  FileText,
  Users,
  BarChart3,
  Database,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface LandingPageProps {
  onLoginClick: () => void;
}

const features = [
  {
    icon: <DollarSign size={22} />,
    title: "Pricing Analysis",
    desc: "Automatically extract and compare competitor pricing plans directly from live pricing pages.",
    grad: "from-green-500 to-emerald-600",
  },
  {
    icon: <Briefcase size={22} />,
    title: "Job Postings Tracker",
    desc: "Monitor what roles competitors are hiring for to understand their strategic direction.",
    grad: "from-blue-500 to-indigo-600",
  },
  {
    icon: <Star size={22} />,
    title: "Review Intelligence",
    desc: "Scrape G2 and other review platforms for ratings and customer sentiment analysis.",
    grad: "from-amber-500 to-orange-500",
  },
  {
    icon: <Rss size={22} />,
    title: "Blog & News Monitoring",
    desc: "Stay up-to-date on competitor blog posts, press releases, and product announcements.",
    grad: "from-purple-500 to-violet-600",
  },
  {
    icon: <Puzzle size={22} />,
    title: "Feature Extraction",
    desc: "Identify key product features competitors are promoting on their websites.",
    grad: "from-cyan-500 to-blue-500",
  },
  {
    icon: <Share2 size={22} />,
    title: "Social Media Profiling",
    desc: "Discover all active social channels and track competitor presence across platforms.",
    grad: "from-pink-500 to-rose-500",
  },
  {
    icon: <FileText size={22} />,
    title: "Form Filler",
    desc: "AI autonomously fills contact forms, demo requests, and lead-gen forms on any site.",
    grad: "from-indigo-500 to-purple-600",
  },
  {
    icon: <Users size={22} />,
    title: "Lead Generation",
    desc: "LinkedIn-based prospect search with email suggestions and bulk outreach capabilities.",
    grad: "from-teal-500 to-cyan-600",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Analytics Dashboard",
    desc: "Visual overview of all scans, tracked competitors, and intel categories in one place.",
    grad: "from-blue-500 to-purple-600",
  },
  {
    icon: <Database size={22} />,
    title: "Intel Data Store",
    desc: "Persistent, categorised storage for all competitive intelligence gathered by the agent.",
    grad: "from-slate-500 to-gray-600",
  },
  {
    icon: <Zap size={22} />,
    title: "Real-time Live Logs",
    desc: "Watch the AI agent navigate websites in real-time via streaming Server-Sent Events.",
    grad: "from-yellow-500 to-amber-500",
  },
  {
    icon: <Globe size={22} />,
    title: "SPA & Dynamic Sites",
    desc: "Handles pop-ups, cookie banners, and JavaScript-heavy single-page applications.",
    grad: "from-red-500 to-rose-600",
  },
];

const techStack = [
  { label: "Frontend", value: "React 19 · TypeScript · Vite · Tailwind" },
  { label: "Backend", value: "Node.js · Express" },
  { label: "LLM", value: "Groq · OpenAI · Ollama" },
  { label: "Automation", value: "TinyFish API" },
  { label: "Streaming", value: "Server-Sent Events (SSE)" },
  { label: "Storage", value: "JSON · localStorage" },
];

export function LandingPage({ onLoginClick }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl border-b px-6 py-3 flex items-center justify-between"
        style={{
          backgroundColor: "var(--bg-nav)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Radar size={18} />
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            CompetitorPulse
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Anchor links */}
          <div className="hidden md:flex items-center gap-1">
            {(["Features", "How It Works", "Tech Stack", "Contact"] as const).map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ color: "var(--text-secondary)" }}
              >
                {item}
              </a>
            ))}
          </div>

          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: "var(--bg-input)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Sign In <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative px-6 pt-24 pb-20 text-center overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12), transparent)",
          }}
        />

        <div className="relative max-w-3xl mx-auto animate-fade-in">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 border"
            style={{
              backgroundColor: "var(--accent-soft)",
              borderColor: "rgba(99,102,241,0.2)",
              color: "var(--accent)",
            }}
          >
            <Zap size={12} /> Powered by TinyFish Web Agent API
          </div>

          <h1
            className="text-5xl font-extrabold leading-tight mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Autonomous{" "}
            <span
              className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text"
              style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Competitive Intelligence
            </span>
          </h1>

          <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Companies spend <strong>10–20 hours/week</strong> manually monitoring competitors.
            CompetitorPulse automates all of that — pricing, jobs, reviews, blog posts, and more —
            using an AI web agent that navigates real websites.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              Get Started <ArrowRight size={16} />
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-all duration-200 hover:scale-105"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Stat chips */}
        <div className="relative flex items-center justify-center gap-4 mt-14 flex-wrap">
          {[
            { label: "Competitors Tracked", value: "Unlimited" },
            { label: "Intel Tasks", value: "6 Types" },
            { label: "LLM Providers", value: "3 Options" },
            { label: "Real-time Streaming", value: "SSE" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-5 py-3 rounded-xl border text-center"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="text-xl font-bold" style={{ color: "var(--accent)" }}>
                {s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Everything you need to stay ahead
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
              One platform to monitor, analyse, and act on competitive intelligence — automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 bg-gradient-to-br ${f.grad}`}
                >
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        id="how-it-works"
        className="px-6 py-20"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              How It Works
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              From natural language query to structured competitive intelligence in seconds.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                step: "01",
                title: "Enter a query",
                desc: 'Type a natural language prompt like "Analyse Slack and Notion pricing" or switch to URL mode for direct competitor URLs.',
              },
              {
                step: "02",
                title: "AI generates an execution plan",
                desc: "The LLM (Groq / OpenAI / Ollama) creates a structured plan with competitor URLs and tasks to complete.",
              },
              {
                step: "03",
                title: "Web agent navigates competitor sites",
                desc: "TinyFish autonomously browses real websites, handling SPAs, pop-ups, and cookie banners.",
              },
              {
                step: "04",
                title: "Real-time progress streams to you",
                desc: "Watch the agent work live via SSE-powered log streaming right in your browser.",
              },
              {
                step: "05",
                title: "Structured intel delivered",
                desc: "Results are parsed into pricing plans, job listings, reviews, and more — then persisted to the Intel Data Store.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section id="tech-stack" className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Built with Modern Tech
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              Production-ready architecture designed for speed and reliability.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {techStack.map((t) => (
              <div
                key={t.label}
                className="p-4 rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent)" }}>
                  {t.label}
                </div>
                <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {t.value}
                </div>
              </div>
            ))}
          </div>

          {/* Key capabilities list */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Dark & Light theme support",
              "Collapsible sidebars",
              "API key management in settings",
              "Demo replay mode",
              "Smart & URL input modes",
              "Persistent backend + localStorage sync",
            ].map((cap) => (
              <div key={cap} className="flex items-center gap-2">
                <CheckCircle size={15} className="shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {cap}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section
        id="contact"
        className="px-6 py-20"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Contact Us
            </h2>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              Have questions or want to learn more? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact info */}
            <div className="flex flex-col gap-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Get in Touch
              </h3>

              {[
                {
                  icon: <Mail size={18} />,
                  label: "Email",
                  value: "hello@competitorpulse.ai",
                  href: "mailto:hello@competitorpulse.ai",
                },
                {
                  icon: <Phone size={18} />,
                  label: "Phone",
                  value: "+1 (555) 123-4567",
                  href: "tel:+15551234567",
                },
                {
                  icon: <MapPin size={18} />,
                  label: "Location",
                  value: "San Francisco, CA, USA",
                  href: null,
                },
              ].map((c) => (
                <div key={c.label} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-0.5" style={{ color: "var(--text-muted)" }}>
                      {c.label}
                    </div>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="text-sm transition-opacity hover:opacity-70"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.value}
                      </a>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {c.value}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div
                className="mt-4 p-4 rounded-xl border"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
                  🏆 Built for the <strong>TinyFish Hackathon 2026</strong>. We're a passionate
                  team building real-world automation tools to save businesses hours of manual
                  competitive research every week.
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Send a Message
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thank you for your message! We'll get back to you soon.");
                  (e.target as HTMLFormElement).reset();
                }}
                className="flex flex-col gap-3"
              >
                <input
                  type="text"
                  placeholder="Your name"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  type="email"
                  placeholder="Your email"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Subject"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <textarea
                  placeholder="Your message…"
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm resize-none"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-8 border-t text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Radar size={14} />
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            CompetitorPulse
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          © 2026 CompetitorPulse · Built for TinyFish Hackathon 2026
        </p>
        <p className="text-xs mt-1 italic" style={{ color: "var(--text-muted)" }}>
          "Stop researching competitors. Let AI do it for you." 🤖✨
        </p>
      </footer>
    </div>
  );
}
