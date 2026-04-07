import { useState, useEffect } from "react";
import {
  Radar, Zap, Shield, BarChart3, Users, FileText, Target, Database,
  ArrowRight, CheckCircle2, Star, Globe, Bot, TrendingUp, Clock, Mail,
  Phone, MapPin, Send, ChevronDown, Play, Sparkles,
} from "lucide-react";
import { AIParticles } from "../components/FishAnimation";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 100);
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => setContactSent(false), 3000);
    setContactForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <Radar size={22} />
            </div>
            <span className="landing-logo-text">CompetitorPulse</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>
          <button className="landing-btn-primary landing-btn-sm" onClick={onGetStarted}>
            Sign In <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" />
        {/* AI Floating particles */}
        <AIParticles count={20} />

        <div className="landing-container landing-hero-content">
          <div className="landing-badge" style={{ animation: heroVisible ? "slideUpBounce 0.5s ease-out both" : "none" }}>
            Built for the TinyFish Hackathon 2026
          </div>
          <h1 className="landing-hero-title" style={{ animation: heroVisible ? "slideUpBounce 0.6s ease-out 0.1s both" : "none" }}>
            Stop Researching Competitors.
            <br />
            <span className="landing-gradient-text animate-gradient-shift" style={{ backgroundSize: "200% 200%" }}>Let AI Do It For You.</span>
          </h1>
          <p className="landing-hero-subtitle" style={{ animation: heroVisible ? "slideUpBounce 0.6s ease-out 0.2s both" : "none" }}>
            CompetitorPulse is an autonomous competitive intelligence agent that navigates real websites,
            extracts pricing, jobs, reviews, and more — saving your team <strong>10-20 hours per week</strong>.
          </p>
          <div className="landing-hero-actions" style={{ animation: heroVisible ? "slideUpBounce 0.6s ease-out 0.3s both" : "none" }}>
            <button className="landing-btn-primary landing-btn-lg neural-pulse" onClick={onGetStarted}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <button className="landing-btn-outline landing-btn-lg" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              <Play size={18} /> Watch Demo
            </button>
          </div>

          <div className="landing-hero-stats" style={{ animation: heroVisible ? "slideUpBounce 0.6s ease-out 0.5s both" : "none" }}>
            {[
              { value: "10-20h", label: "Saved Per Week" },
              { value: "6+", label: "Intel Categories" },
              { value: "Real-time", label: "Live Streaming" },
              { value: "100%", label: "Autonomous" },
            ].map((s, i) => (
              <div key={s.label} className="landing-stat animate-float-slow" style={{ animationDelay: `${i * 0.5}s` }}>
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted By / Social Proof ── */}
      <section className="landing-social-proof">
        <div className="landing-container">
          <p className="landing-social-proof-text">Powered by cutting-edge AI technology</p>
          <div className="landing-tech-stack">
            {["React 19", "TypeScript", "TinyFish API", "Groq LLM", "SSE Streaming", "Vite"].map((t) => (
              <span key={t} className="landing-tech-badge">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Everything You Need for Competitive Intelligence</h2>
            <p className="landing-section-subtitle">
              One platform to monitor, analyze, and act on competitor data — fully autonomous.
            </p>
          </div>

          <div className="landing-features-grid">
            {[
              { icon: TrendingUp, title: "Pricing Analysis", desc: "Automatically extract and compare competitor pricing plans from real pricing pages. Track changes over time.", color: "#3b82f6" },
              { icon: Users, title: "Job Postings Tracker", desc: "Monitor competitor hiring activity. Discover their strategic priorities through job listings.", color: "#f59e0b" },
              { icon: Star, title: "Review Intelligence", desc: "Scrape G2, Capterra, and other review sites. Understand competitor strengths and weaknesses.", color: "#22c55e" },
              { icon: FileText, title: "Blog & News Monitor", desc: "Stay on top of competitor announcements, feature launches, and content strategy.", color: "#8b5cf6" },
              { icon: Bot, title: "Autonomous Form Filler", desc: "Automatically fill demo requests, contact forms, and signups. AI handles everything.", color: "#ef4444" },
              { icon: Target, title: "AI Strategy Engine", desc: "Generate market breakdowns, distribution plans, and competitor weakness maps powered by LLM.", color: "#06b6d4" },
              { icon: Globe, title: "Social Media Discovery", desc: "Find and monitor competitor social profiles across all major platforms.", color: "#ec4899" },
              { icon: Database, title: "Intel Data Store", desc: "All collected intelligence is stored, categorized, and searchable. Export anytime.", color: "#14b8a6" },
            ].map((f, i) => (
              <div key={f.title} className="landing-feature-card card-shimmer" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="landing-feature-icon animate-float" style={{ backgroundColor: `${f.color}12`, color: f.color, animationDelay: `${i * 0.3}s` }}>
                  <f.icon size={24} />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="landing-how-it-works" style={{ position: "relative" }}>
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">How It Works</h2>
            <p className="landing-section-subtitle">From query to actionable intelligence in minutes, not hours.</p>
          </div>

          <div className="landing-steps">
            {[
              { step: "01", title: "Enter Your Query", desc: "Type a natural language prompt like \"Analyze Slack and Notion pricing\" or paste competitor URLs directly.", icon: Zap },
              { step: "02", title: "AI Plans & Navigates", desc: "The LLM generates an execution plan, then the TinyFish web agent navigates each competitor's website autonomously.", icon: Bot },
              { step: "03", title: "Real-time Streaming", desc: "Watch agent progress live via Server-Sent Events. See every page visited, form filled, and data extracted in real-time.", icon: Clock },
              { step: "04", title: "Get Structured Intel", desc: "Receive organized reports with pricing tables, job listings, review summaries, and strategic insights — all saved for later.", icon: BarChart3 },
            ].map((s, i) => (
              <div key={s.step} className="landing-step card-shimmer" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="landing-step-number">{s.step}</div>
                <div className="landing-step-icon animate-float" style={{ animationDelay: `${i * 0.4}s` }}><s.icon size={28} /></div>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Capabilities Detail ── */}
      <section className="landing-capabilities">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Unlike Simple Chatbots or API Wrappers</h2>
            <p className="landing-section-subtitle">CompetitorPulse uses a real web agent that interacts with live websites.</p>
          </div>

          <div className="landing-capability-tabs">
            <div className="landing-tab-list">
              {[
                "Dynamic SPA Navigation",
                "Smart Form Filling",
                "Lead Generation",
                "Strategy Engine",
              ].map((tab, i) => (
                <button key={tab} className={`landing-tab ${activeFeature === i ? "active" : ""}`} onClick={() => setActiveFeature(i)}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="landing-tab-content">
              {activeFeature === 0 && (
                <div className="landing-tab-panel">
                  <h3>Navigate Any Modern Website</h3>
                  <p>Our agent handles JavaScript-heavy SPAs, pop-ups, cookie banners, infinite scroll, and multi-step navigation. It sees the web like a real user — because it is one.</p>
                  <ul>
                    <li><CheckCircle2 size={16} /> Handles dynamic SPAs and JavaScript rendering</li>
                    <li><CheckCircle2 size={16} /> Dismisses pop-ups and cookie banners automatically</li>
                    <li><CheckCircle2 size={16} /> Navigates multi-page flows and pagination</li>
                    <li><CheckCircle2 size={16} /> Headless or visible browser execution modes</li>
                  </ul>
                </div>
              )}
              {activeFeature === 1 && (
                <div className="landing-tab-panel">
                  <h3>Autonomous Form Interactions</h3>
                  <p>Request demos, fill contact forms, sign up for trials, and submit partnership inquiries — all autonomously with AI-resolved field mapping.</p>
                  <ul>
                    <li><CheckCircle2 size={16} /> 7+ form types: demo, contact, newsletter, trial, etc.</li>
                    <li><CheckCircle2 size={16} /> AI resolves company names and auto-fills fields</li>
                    <li><CheckCircle2 size={16} /> Profile management for multiple identities</li>
                    <li><CheckCircle2 size={16} /> Full form fill history and status tracking</li>
                  </ul>
                </div>
              )}
              {activeFeature === 2 && (
                <div className="landing-tab-panel">
                  <h3>Intelligent Lead Generation</h3>
                  <p>Discover potential leads based on LinkedIn-style search, generate personalized outreach, and manage your pipeline — all from one place.</p>
                  <ul>
                    <li><CheckCircle2 size={16} /> LinkedIn-based prospect discovery</li>
                    <li><CheckCircle2 size={16} /> Email suggestion and verification</li>
                    <li><CheckCircle2 size={16} /> AI-generated outreach messages</li>
                    <li><CheckCircle2 size={16} /> Bulk operations and export capability</li>
                  </ul>
                </div>
              )}
              {activeFeature === 3 && (
                <div className="landing-tab-panel">
                  <h3>AI-Powered Strategy Tools</h3>
                  <p>Go beyond data collection. Generate market breakdowns, distribution plans, and competitor weakness maps using LLM-powered analysis.</p>
                  <ul>
                    <li><CheckCircle2 size={16} /> Market breakdown analysis</li>
                    <li><CheckCircle2 size={16} /> Distribution plan generation</li>
                    <li><CheckCircle2 size={16} /> Competitor weakness mapping</li>
                    <li><CheckCircle2 size={16} /> Actionable strategic recommendations</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="landing-pricing" style={{ position: "relative" }}>
        <AIParticles count={10} />
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Simple, Transparent Pricing</h2>
            <p className="landing-section-subtitle">Start free. Scale as you grow.</p>
          </div>

          <div className="landing-pricing-grid">
            {[
              {
                name: "Starter", price: "Free", period: "forever", desc: "Perfect for trying out competitive intelligence.",
                features: ["3 competitor scans/day", "Basic pricing analysis", "Job posting tracker", "Community support"],
                cta: "Get Started", highlight: false,
              },
              {
                name: "Pro", price: "$49", period: "/month", desc: "For teams serious about competitive intelligence.",
                features: ["Unlimited scans", "All intel categories", "Form filler & lead gen", "AI strategy engine", "Priority support", "Data export"],
                cta: "Start Free Trial", highlight: true,
              },
              {
                name: "Enterprise", price: "Custom", period: "", desc: "For organizations with advanced security and scale needs.",
                features: ["Everything in Pro", "Custom integrations", "SSO & SAML", "Dedicated account manager", "SLA guarantee", "On-premise option"],
                cta: "Contact Sales", highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`landing-pricing-card card-shimmer ${plan.highlight ? "highlighted" : ""}`}>
                {plan.highlight && <div className="landing-pricing-popular">Most Popular</div>}
                <h3 className="landing-pricing-name">{plan.name}</h3>
                <div className="landing-pricing-price">
                  {plan.price}<span className="landing-pricing-period">{plan.period}</span>
                </div>
                <p className="landing-pricing-desc">{plan.desc}</p>
                <ul className="landing-pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}><CheckCircle2 size={16} /> {f}</li>
                  ))}
                </ul>
                <button className={`landing-btn-${plan.highlight ? "primary" : "outline"} landing-btn-full`} onClick={onGetStarted}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Us ── */}
      <section id="contact" className="landing-contact">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Get In Touch</h2>
            <p className="landing-section-subtitle">Have questions? We'd love to hear from you.</p>
          </div>

          <div className="landing-contact-grid">
            <div className="landing-contact-info">
              <div className="landing-contact-item">
                <div className="landing-contact-icon"><Mail size={20} /></div>
                <div>
                  <h4>Email Us</h4>
                  <p>hello@competitorpulse.ai</p>
                </div>
              </div>
              <div className="landing-contact-item">
                <div className="landing-contact-icon"><Phone size={20} /></div>
                <div>
                  <h4>Call Us</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="landing-contact-item">
                <div className="landing-contact-icon"><MapPin size={20} /></div>
                <div>
                  <h4>Visit Us</h4>
                  <p>San Francisco, CA 94105</p>
                </div>
              </div>
            </div>

            <form className="landing-contact-form" onSubmit={handleContactSubmit}>
              <input
                type="text" placeholder="Your Name" required
                value={contactForm.name}
                onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                type="email" placeholder="Your Email" required
                value={contactForm.email}
                onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
              />
              <textarea
                placeholder="Your Message" rows={4} required
                value={contactForm.message}
                onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
              />
              <button type="submit" className="landing-btn-primary landing-btn-full">
                {contactSent ? <><CheckCircle2 size={16} /> Sent!</> : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer" style={{ position: "relative" }}>
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <div className="landing-logo">
              <div className="landing-logo-icon">
                <Radar size={18} />
              </div>
              <span className="landing-logo-text">CompetitorPulse</span>
            </div>
            <p>Autonomous Competitive Intelligence Agent<br />Powered by TinyFish Web Agent API</p>
          </div>
          <div className="landing-footer-links">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#contact">Contact</a>
              <a href="#contact">Support</a>
              <a href="#contact">Careers</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>&copy; 2026 CompetitorPulse. Built for the TinyFish Hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
