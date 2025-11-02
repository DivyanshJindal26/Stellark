-- Stellark Complete Database Schema
-- This file creates all necessary tables, indexes, and policies for the Stellark platform
-- Run this in your Supabase SQL Editor or via migration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- COMPANIES TABLE
-- Stores company metadata and listing information
-- =============================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  equity_percentage INTEGER NOT NULL DEFAULT 10,
  target_amount NUMERIC NOT NULL,
  token_price NUMERIC NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  tokens_sold INTEGER DEFAULT 0,
  wallet_address TEXT NOT NULL, -- Owner's wallet address
  contract_id TEXT, -- Deployed contract address (starts with 'C')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_wallet_address ON public.companies(wallet_address);
CREATE INDEX IF NOT EXISTS idx_companies_contract_id ON public.companies(contract_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all access to companies" ON public.companies
  FOR ALL USING (true);

-- =============================================
-- RESALE LISTINGS TABLE
-- Stores secondary market listings for token resales
-- =============================================

CREATE TABLE IF NOT EXISTS public.resale_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id TEXT NOT NULL, -- References contract_id from companies
  seller_wallet TEXT NOT NULL,
  tokens_for_sale INTEGER NOT NULL CHECK (tokens_for_sale > 0),
  price_per_token NUMERIC NOT NULL CHECK (price_per_token > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resale_listings_company_id ON public.resale_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_resale_listings_seller ON public.resale_listings(seller_wallet);
CREATE INDEX IF NOT EXISTS idx_resale_listings_active ON public.resale_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resale_listings_created_at ON public.resale_listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.resale_listings ENABLE ROW LEVEL SECURITY;

-- Create policy for resale listings
CREATE POLICY "Allow all access to resale listings" ON public.resale_listings
  FOR ALL USING (true);

-- =============================================
-- INVESTMENTS TABLE (Optional - for tracking)
-- Tracks investment transactions on-chain
-- =============================================

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id TEXT NOT NULL,
  investor_wallet TEXT NOT NULL,
  tokens_purchased INTEGER NOT NULL,
  price_per_token NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investments_company_id ON public.investments(company_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor ON public.investments(investor_wallet);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON public.investments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to investments" ON public.investments
  FOR ALL USING (true);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- Auto-update timestamps
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for companies table
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for resale_listings table
DROP TRIGGER IF EXISTS update_resale_listings_updated_at ON public.resale_listings;
CREATE TRIGGER update_resale_listings_updated_at
  BEFORE UPDATE ON public.resale_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UTILITY VIEWS (Optional)
-- Helpful views for common queries
-- =============================================

-- Note: Views are commented out as they're not required for the application
-- Uncomment if you need aggregated statistics in your queries

/*
-- View for active companies with their stats
CREATE OR REPLACE VIEW public.active_companies AS
SELECT 
  c.*,
  COUNT(DISTINCT r.id) as active_resale_count
FROM public.companies c
LEFT JOIN public.resale_listings r ON c.contract_id = r.company_id AND r.is_active = true
GROUP BY c.id
ORDER BY c.created_at DESC;
*/

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- Uncomment to insert test data
-- =============================================

/*
-- Insert a test company
INSERT INTO public.companies (
  name,
  description,
  logo_url,
  equity_percentage,
  target_amount,
  token_price,
  total_tokens,
  tokens_sold,
  wallet_address,
  contract_id
) VALUES (
  'Test Company',
  'A test company for development purposes',
  '',
  10,
  100000,
  10,
  10000,
  0,
  'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);
*/

-- =============================================
-- CLEANUP (Optional)
-- Uncomment to drop all tables and start fresh
-- =============================================

/*
DROP VIEW IF EXISTS public.active_companies;
DROP TRIGGER IF EXISTS update_resale_listings_updated_at ON public.resale_listings;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.resale_listings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
*/

-- =============================================
-- VERIFICATION
-- Run these queries to verify the setup
-- =============================================

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'resale_listings', 'investments')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('companies', 'resale_listings', 'investments');

-- Check indexes
SELECT tablename, indexname h
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('companies', 'resale_listings', 'investments')
ORDER BY tablename, indexname;
