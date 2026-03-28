import { Request, Response } from "express";
import { getAllRunReports } from "./agent.controller";

export async function getStats(req: Request, res: Response) {
  try {
    const allRuns = getAllRunReports();

    let totalScans = 0;
    let totalCompetitors = 0;
    let totalPricingPages = 0;
    let totalJobs = 0;
    let totalReviews = 0;
    let totalBlogPosts = 0;
    let totalFeatures = 0;
    const competitorNames: string[] = [];
    const perScan: { scanIndex: number; competitors: number; pricing: number; jobs: number; reviews: number; blog: number; features: number }[] = [];

    for (const run of allRuns) {
      if (!run.done || run.reports.length === 0) continue;
      totalScans++;
      let scanPricing = 0, scanJobs = 0, scanReviews = 0, scanBlog = 0, scanFeatures = 0;

      for (const r of run.reports) {
        totalCompetitors++;
        if (!competitorNames.includes(r.company)) competitorNames.push(r.company);
        if (r.pricing && r.pricing.plans?.length > 0) { totalPricingPages++; scanPricing++; }
        const jc = r.jobs?.length || 0; totalJobs += jc; scanJobs += jc;
        if (r.reviews && (r.reviews.rating || r.reviews.totalReviews)) { totalReviews++; scanReviews++; }
        const bc = r.blog?.length || 0; totalBlogPosts += bc; scanBlog += bc;
        const fc = r.features?.length || 0; totalFeatures += fc; scanFeatures += fc;
      }

      perScan.push({ scanIndex: totalScans, competitors: run.reports.length, pricing: scanPricing, jobs: scanJobs, reviews: scanReviews, blog: scanBlog, features: scanFeatures });
    }

    res.json({
      success: true,
      totalScans,
      totalCompetitors,
      totalPricingPages,
      totalJobs,
      totalReviews,
      totalBlogPosts,
      totalFeatures,
      competitorNames,
      perScan,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
}
