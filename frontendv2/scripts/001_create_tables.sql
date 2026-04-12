-- CompetitorPulse Database Schema
-- Create tables for analyses, leads, forms, intel records, and history

-- Analyses table - stores competitor analysis results
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  competitor_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  pricing_data JSONB,
  jobs_data JSONB,
  reviews_data JSONB,
  insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Leads table - stores generated leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  email_confidence INTEGER DEFAULT 0,
  linkedin_url TEXT,
  location TEXT,
  industry TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form submissions table - stores form filling history
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  form_name TEXT,
  fields JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intel records table - stores collected intelligence
CREATE TABLE IF NOT EXISTS intel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pricing', 'jobs', 'reviews', 'strategy', 'news', 'social')),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  data JSONB,
  tags TEXT[],
  confidence INTEGER DEFAULT 0,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity history table - stores all user activity
CREATE TABLE IF NOT EXISTS activity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('analysis', 'lead_search', 'form_submit', 'intel_collect')),
  action TEXT NOT NULL,
  target TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  details TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table - stores user preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  notifications JSONB DEFAULT '{"email": true, "push": false, "analysisComplete": true, "weeklyDigest": true}'::jsonb,
  profile JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses
CREATE POLICY "Users can view own analyses" ON analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON analyses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for leads
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for form_submissions
CREATE POLICY "Users can view own form_submissions" ON form_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own form_submissions" ON form_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own form_submissions" ON form_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own form_submissions" ON form_submissions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for intel_records
CREATE POLICY "Users can view own intel_records" ON intel_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own intel_records" ON intel_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own intel_records" ON intel_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own intel_records" ON intel_records FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_history
CREATE POLICY "Users can view own activity_history" ON activity_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity_history" ON activity_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity_history" ON activity_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity_history" ON activity_history FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_intel_records_user_id ON intel_records(user_id);
CREATE INDEX IF NOT EXISTS idx_intel_records_type ON intel_records(type);
CREATE INDEX IF NOT EXISTS idx_activity_history_user_id ON activity_history(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_history_created_at ON activity_history(created_at DESC);
