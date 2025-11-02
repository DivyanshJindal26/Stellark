export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          description: string
          logo_url: string
          equity_percentage: number
          target_amount: number
          token_price: number
          total_tokens: number
          tokens_sold: number
          wallet_address: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          logo_url?: string
          equity_percentage: number
          target_amount: number
          token_price: number
          total_tokens: number
          tokens_sold?: number
          wallet_address: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          logo_url?: string
          equity_percentage?: number
          target_amount?: number
          token_price?: number
          total_tokens?: number
          tokens_sold?: number
          wallet_address?: string
          created_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          company_id: string
          investor_wallet: string
          tokens_purchased: number
          amount_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          investor_wallet: string
          tokens_purchased: number
          amount_paid: number
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          investor_wallet?: string
          tokens_purchased?: number
          amount_paid?: number
          created_at?: string
        }
      }
      resale_listings: {
        Row: {
          id: string
          company_id: string
          seller_wallet: string
          tokens_for_sale: number
          price_per_token: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          seller_wallet: string
          tokens_for_sale: number
          price_per_token: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          seller_wallet?: string
          tokens_for_sale?: number
          price_per_token?: number
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}
