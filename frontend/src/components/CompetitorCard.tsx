import { useState } from "react";
import {
  Globe, DollarSign, Briefcase, Star, FileText, Cpu,
  ChevronDown, ExternalLink, MapPin, TrendingUp, Hash, Share2,
} from "lucide-react";

interface CompetitorCardProps {
  report: any;
  index: number;
}

const GRADIENT_PALETTES = [
  "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #22c55e, #06b6d4)",
];

export function CompetitorCard({ report, index }: CompetitorCardProps) {
  const [expanded, setExpanded] = useState(true);

  const jobCount = report.jobs?.length || 0;
  const planCount = report.pricing?.plans?.length || 0;
  const blogCount = report.blog?.length || 0;
  const featureCount = report.features?.length || 0;
  const rating = report.reviews?.rating;
  const gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
  const socialCount = report.social?.profiles?.length || 0;
  const totalDataPoints = planCount + jobCount + blogCount + featureCount + socialCount + (rating ? 1 : 0);

  return (
    <div
      className="rounded-2xl overflow-hidden animate-scale-in"
      style={{
        animationDelay: `${index * 120}ms`,
        backgroundColor: "var(--bg-card)",
        border: "1.5px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: gradient }} />

      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors duration-200"
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: gradient, color: "#fff" }}>
          <Globe size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {report.company}
          </h3>
          <div className="flex items-center gap-3 mt-0.5">
            <a href={report.url} target="_blank" rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 hover:underline truncate"
              style={{ color: "var(--accent)" }}
              onClick={(e) => e.stopPropagation()}>
              {report.url} <ExternalLink size={10} />
            </a>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }}>
              {totalDataPoints} data points
            </span>
          </div>
        </div>
        {/* Quick stats badges */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {planCount > 0 && <Badge icon={<DollarSign size={10} />} text={`${planCount} plans`} color="#22c55e" />}
          {jobCount > 0 && <Badge icon={<Briefcase size={10} />} text={`${jobCount} jobs`} color="#3b82f6" />}
          {rating && <Badge icon={<Star size={10} />} text={`${rating}/5`} color="#f59e0b" />}
          {blogCount > 0 && <Badge icon={<FileText size={10} />} text={`${blogCount} posts`} color="#8b5cf6" />}
          {featureCount > 0 && <Badge icon={<Cpu size={10} />} text={`${featureCount}`} color="#06b6d4" />}
          {socialCount > 0 && <Badge icon={<Share2 size={10} />} text={`${socialCount}`} color="#ec4899" />}
        </div>
        <ChevronDown size={16} style={{
          color: "var(--text-muted)",
          transform: expanded ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 animate-fade-in">
          {/* Pricing */}
          {report.pricing && report.pricing.plans?.length > 0 && (
            <Section icon={<DollarSign size={14} />} title="Pricing Plans" color="#22c55e" count={planCount}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.pricing.plans.map((plan: any, i: number) => (
                  <div key={i} className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
                    style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</div>
                      {plan.popular && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}>
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-extrabold" style={{ color: "#22c55e" }}>{plan.price}</div>
                    {plan.period && <div className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>{plan.period}</div>}
                    {plan.features?.slice(0, 4).map((f: string, j: number) => (
                      <div key={j} className="text-xs mt-1 flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span>
                        <span className="line-clamp-1">{f}</span>
                      </div>
                    ))}
                    {plan.features?.length > 4 && (
                      <div className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                        +{plan.features.length - 4} more features
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Jobs */}
          {report.jobs?.length > 0 && (
            <Section icon={<Briefcase size={14} />} title="Open Positions" color="#3b82f6" count={jobCount}>
              <div className="space-y-1.5">
                {report.jobs.slice(0, 8).map((job: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:scale-[1.01]"
                    style={{ backgroundColor: "var(--bg-input)", border: "1px solid transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  >
                    <Hash size={12} style={{ color: "#3b82f6", opacity: 0.5 }} />
                    <span className="flex-1 font-medium truncate" style={{ color: "var(--text-primary)" }}>{job.title}</span>
                    {job.department && (
                      <span className="text-[11px] px-2 py-0.5 rounded-lg shrink-0 font-medium"
                        style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{job.department}</span>
                    )}
                    {job.location && (
                      <span className="text-[11px] flex items-center gap-1 shrink-0" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} /> {job.location}
                      </span>
                    )}
                  </div>
                ))}
                {jobCount > 8 && (
                  <div className="text-xs text-center py-2 rounded-lg" style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-input)" }}>
                    +{jobCount - 8} more positions
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Reviews */}
          {report.reviews && (
            <Section icon={<Star size={14} />} title={`Reviews — ${report.reviews.platform || "G2"}`} color="#f59e0b">
              <div className="flex items-center gap-4 mb-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-input)" }}>
                {report.reviews.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold" style={{ color: "#f59e0b" }}>{report.reviews.rating}</span>
                    <div className="flex flex-col">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} fill={s <= Math.round(report.reviews.rating) ? "#f59e0b" : "none"}
                            style={{ color: s <= Math.round(report.reviews.rating) ? "#f59e0b" : "var(--text-muted)" }} />
                        ))}
                      </div>
                      {report.reviews.totalReviews && (
                        <span className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {report.reviews.totalReviews} reviews
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {report.reviews.recentReviews?.map((review: any, i: number) => (
                <div key={i} className="px-3 py-2.5 rounded-xl mb-2 text-sm transition-all duration-200 hover:scale-[1.01]"
                  style={{ backgroundColor: "var(--bg-input)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    {review.rating && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                        ★ {review.rating}/5
                      </span>
                    )}
                    <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {review.title || "Review"}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{review.summary}</p>
                </div>
              ))}
            </Section>
          )}

          {/* Blog */}
          {report.blog?.length > 0 && (
            <Section icon={<FileText size={14} />} title="Recent Posts" color="#8b5cf6" count={blogCount}>
              <div className="space-y-1.5">
                {report.blog.slice(0, 5).map((post: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:scale-[1.01]"
                    style={{ backgroundColor: "var(--bg-input)" }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "#8b5cf6" }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>{post.title}</div>
                      {post.summary && (
                        <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{post.summary}</div>
                      )}
                    </div>
                    {post.date && (
                      <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{post.date}</span>
                    )}
                    {post.url && (
                      <a href={post.url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 transition-transform duration-200 hover:scale-125" style={{ color: "var(--accent)" }}
                        onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Features */}
          {report.features?.length > 0 && (
            <Section icon={<Cpu size={14} />} title="Key Features" color="#06b6d4" count={featureCount}>
              <div className="flex flex-wrap gap-2">
                {report.features.map((feature: string, i: number) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 cursor-default"
                    style={{ backgroundColor: "rgba(6,182,212,0.08)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
                    {feature}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Social Media */}
          {report.social?.profiles?.length > 0 && (
            <Section icon={<Share2 size={14} />} title="Social Media" color="#ec4899" count={socialCount}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.social.profiles.map((profile: any, i: number) => (
                  <a key={i} href={profile.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:scale-[1.02] no-underline"
                    style={{ backgroundColor: "var(--bg-input)", border: "1px solid transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(236,72,153,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(236,72,153,0.1)", color: "#ec4899" }}>
                      <Share2 size={13} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {profile.platform}
                      </div>
                      {(profile.handle || profile.followers || profile.subscribers) && (
                        <div className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                          {profile.handle ? `${profile.handle}` : ""}
                          {profile.handle && (profile.followers || profile.subscribers) ? " · " : ""}
                          {profile.followers ? `${profile.followers} followers` : ""}
                          {profile.subscribers ? `${profile.subscribers} subscribers` : ""}
                        </div>
                      )}
                    </div>
                    <ExternalLink size={12} style={{ color: "var(--accent)", opacity: 0.6 }} />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Empty state */}
          {!report.pricing && !report.jobs?.length && !report.reviews && !report.blog?.length && !report.features?.length && !report.social?.profiles?.length && (
            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-muted)" }}>
              <TrendingUp size={28} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
              <p className="text-sm font-medium">No data gathered yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>The agent may still be collecting intel for this competitor</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, color, count, children }: {
  icon: React.ReactNode; title: string; color: string; count?: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: `${color}15`, color }}>{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: `${color}15`, color }}>{count}</span>
        )}
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
      </div>
      {children}
    </div>
  );
}

function Badge({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
      style={{ backgroundColor: `${color}12`, color }}>
      {icon} {text}
    </span>
  );
}
