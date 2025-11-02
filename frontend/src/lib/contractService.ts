import {
  invokeContract,
  readContract,
  addressToScVal,
  stringToScVal,
  numberToScVal,
  bigIntToNumber,
} from './stellar';
import { supabase } from './supabase';

/**
 * Company data structure matching the contract
 */
export interface CompanyInfo {
  name: string;
  symbol: string;
  total_supply: number;
  owner: string;
  equity_percent: number;
  description: string;
  token_price: number;
  target_amount: number;
}

/**
 * Initialize a new company token on-chain
 * Contract signature: init_company(env, name, symbol, total_supply, owner_addr, equity_percent, description, token_price, target_amount)
 */
export async function initializeCompany(
  walletAddress: string,
  contractId: string,
  name: string,
  symbol: string,
  totalSupply: number,
  equityPercent: number,
  description: string,
  tokenPrice: number,
  targetAmount: number
): Promise<void> {
  // Convert to stroops (1 XLM = 10^7 stroops) for prices/amounts
  const tokenPriceStroops = Math.floor(tokenPrice * 10_000_000);
  const targetAmountStroops = Math.floor(targetAmount * 10_000_000);
  
  const params = [
    stringToScVal(name),
    stringToScVal(symbol),
    numberToScVal(totalSupply),
    addressToScVal(walletAddress), // owner_addr
    numberToScVal(equityPercent),
    stringToScVal(description),
    numberToScVal(tokenPriceStroops),
    numberToScVal(targetAmountStroops),
  ];
  
  console.log('Initializing company with params:', {
    name,
    symbol,
    totalSupply,
    owner: walletAddress,
    equityPercent,
    description,
    tokenPrice: `${tokenPrice} XLM (${tokenPriceStroops} stroops)`,
    targetAmount: `${targetAmount} XLM (${targetAmountStroops} stroops)`,
  });
  
  await invokeContract(walletAddress, contractId, 'init_company', params);
}

/**
 * Get company information from contract
 */
export async function getCompanyInfo(contractId: string): Promise<CompanyInfo | null> {
  try {
    const result = await readContract(contractId, 'get_company_info', []);
    if (!result) return null;
    
    // Convert BigInt fields to Number
    return {
      name: result.name,
      symbol: result.symbol,
      total_supply: bigIntToNumber(result.total_supply),
      owner: result.owner,
      equity_percent: bigIntToNumber(result.equity_percent),
      description: result.description || '',
      token_price: bigIntToNumber(result.token_price),
      target_amount: bigIntToNumber(result.target_amount),
    };
  } catch (error) {
    console.error('Error getting company info:', error);
    return null;
  }
}

/**
 * Mint tokens to investor (buyer signs the transaction)
 * Transfers tokens from owner's balance to buyer's balance
 * Requires XLM payment from buyer to owner
 */
export async function mintTokens(
  buyerAddress: string,
  contractId: string,
  toAddress: string,
  amount: number,
  xlmTokenAddress: string
): Promise<void> {
  console.log('mintTokens called with:', { buyerAddress, contractId, toAddress, amount, xlmTokenAddress });
  
  const params = [
    addressToScVal(toAddress),
    numberToScVal(amount),
    addressToScVal(xlmTokenAddress),
  ];
  
  console.log('Converted params:', params);
  console.log('Number of params:', params.length);
  
  // Buyer signs the transaction (not owner)
  await invokeContract(buyerAddress, contractId, 'mint', params);
}

/**
 * Purchase tokens from company owner (for primary market investments)
 * Only requires buyer's signature - transfers tokens from owner to buyer
 */
export async function purchaseTokens(
  buyerAddress: string,
  contractId: string,
  amount: number
): Promise<void> {
  const params = [
    addressToScVal(buyerAddress),
    numberToScVal(amount),
  ];
  
  await invokeContract(buyerAddress, contractId, 'purchase', params);
}

/**
 * Transfer tokens between addresses (free - no payment)
 */
export async function transferTokens(
  fromAddress: string,
  toAddress: string,
  contractId: string,
  amount: number
): Promise<void> {
  const params = [
    addressToScVal(fromAddress),
    addressToScVal(toAddress),
    numberToScVal(amount),
  ];
  
  await invokeContract(fromAddress, contractId, 'transfer', params);
}

/**
 * Transfer tokens with payment (for resale market)
 * Buyer signs, pays seller in XLM, and receives tokens
 */
export async function transferTokensWithPayment(
  buyerAddress: string,
  sellerAddress: string,
  contractId: string,
  amount: number,
  pricePerToken: number,
  xlmTokenAddress: string
): Promise<void> {
  // Convert price to stroops (1 XLM = 10^7 stroops)
  const pricePerTokenStroops = Math.floor(pricePerToken * 10_000_000);
  
  const params = [
    addressToScVal(sellerAddress),
    addressToScVal(buyerAddress),
    numberToScVal(amount),
    numberToScVal(pricePerTokenStroops),
    addressToScVal(xlmTokenAddress),
  ];
  
  // Buyer signs the transaction
  await invokeContract(buyerAddress, contractId, 'transfer_with_payment', params);
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(
  contractId: string,
  address: string
): Promise<number> {
  try {
    const params = [addressToScVal(address)];
    const result = await readContract(contractId, 'balance_of', params);
    // Convert BigInt to Number
    return bigIntToNumber(result);
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

/**
 * Burn tokens
 */
export async function burnTokens(
  walletAddress: string,
  contractId: string,
  amount: number
): Promise<void> {
  const params = [
    addressToScVal(walletAddress),
    numberToScVal(amount),
  ];
  
  await invokeContract(walletAddress, contractId, 'burn', params);
}

/**
 * Storage service for off-chain data (metadata, descriptions, etc.)
 * Uses Supabase for global discovery and metadata storage
 */

export interface CompanyMetadata {
  contractId: string; // The deployed contract address for this company
  name: string;
  description: string;
  logo_url?: string;
  owner_wallet: string;
  token_price: number; // Price per token in XLM
  target_amount: number; // Fundraising target in XLM
  created_at: string;
}

export interface ResaleListing {
  id: string;
  contract_id: string;
  seller_wallet: string;
  tokens_for_sale: number;
  price_per_token: number;
  is_active: boolean;
  created_at: string;
}

// Company Metadata Storage (Supabase)
export async function saveCompanyMetadata(metadata: Omit<CompanyMetadata, 'created_at'>): Promise<void> {
  const { error } = await (supabase as any).from('companies').insert({
    name: metadata.name,
    description: metadata.description,
    logo_url: metadata.logo_url || '',
    equity_percentage: 10, // Default, will come from on-chain
    target_amount: metadata.target_amount,
    token_price: metadata.token_price,
    total_tokens: 0, // Will be fetched from contract
    tokens_sold: 0,
    wallet_address: metadata.owner_wallet,
    contract_id: metadata.contractId,
  });
  
  if (error) {
    console.error('Error saving company:', error);
    throw error;
  }
}

export async function getCompaniesMetadata(): Promise<CompanyMetadata[]> {
  const { data, error } = await (supabase as any)
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
  
  return (data || []).map((c: any) => ({
    contractId: c.contract_id || c.wallet_address, // Fallback for old data
    name: c.name,
    description: c.description,
    logo_url: c.logo_url,
    owner_wallet: c.wallet_address,
    token_price: c.token_price,
    target_amount: c.target_amount,
    created_at: c.created_at,
  }));
}

export async function getCompanyMetadata(contractId: string): Promise<CompanyMetadata | null> {
  const { data, error } = await (supabase as any)
    .from('companies')
    .select('*')
    .or(`contract_id.eq.${contractId},wallet_address.eq.${contractId}`) // Support both columns
    .single();
  
  if (error || !data) {
    console.error('Error fetching company:', error);
    return null;
  }
  
  return {
    contractId: data.contract_id || data.wallet_address,
    name: data.name,
    description: data.description,
    logo_url: data.logo_url,
    owner_wallet: data.wallet_address,
    token_price: data.token_price,
    target_amount: data.target_amount,
    created_at: data.created_at,
  };
}

// Resale Listings Storage (Supabase)
export async function createResaleListing(listing: Omit<ResaleListing, 'id' | 'created_at'>): Promise<ResaleListing> {
  const { data, error } = await (supabase as any)
    .from('resale_listings')
    .insert({
      company_id: listing.contract_id, // Map to existing column
      seller_wallet: listing.seller_wallet,
      tokens_for_sale: listing.tokens_for_sale,
      price_per_token: listing.price_per_token,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating resale listing:', error);
    throw error;
  }
  
  return {
    id: data.id,
    contract_id: listing.contract_id,
    seller_wallet: data.seller_wallet,
    tokens_for_sale: data.tokens_for_sale,
    price_per_token: data.price_per_token,
    is_active: data.is_active,
    created_at: data.created_at,
  };
}

export async function getResaleListings(): Promise<ResaleListing[]> {
  const { data, error } = await (supabase as any)
    .from('resale_listings')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching resale listings:', error);
    return [];
  }
  
  return (data || []).map((l: any) => ({
    id: l.id,
    contract_id: l.company_id,
    seller_wallet: l.seller_wallet,
    tokens_for_sale: l.tokens_for_sale,
    price_per_token: l.price_per_token,
    is_active: l.is_active,
    created_at: l.created_at,
  }));
}

export async function getActiveResaleListings(): Promise<ResaleListing[]> {
  const { data, error } = await (supabase as any)
    .from('resale_listings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching active resale listings:', error);
    return [];
  }
  
  return (data || []).map((l: any) => ({
    id: l.id,
    contract_id: l.company_id,
    seller_wallet: l.seller_wallet,
    tokens_for_sale: l.tokens_for_sale,
    price_per_token: l.price_per_token,
    is_active: l.is_active,
    created_at: l.created_at,
  }));
}

export async function updateResaleListingQuantity(id: string, newQuantity: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('resale_listings')
    .update({ tokens_for_sale: newQuantity })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating resale listing:', error);
    throw error;
  }
}

export async function deactivateResaleListing(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('resale_listings')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) {
    console.error('Error deactivating resale listing:', error);
    throw error;
  }
}

export async function getResaleListingsByContract(contractId: string): Promise<ResaleListing[]> {
  const { data, error } = await (supabase as any)
    .from('resale_listings')
    .select('*')
    .eq('company_id', contractId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching resale listings by contract:', error);
    return [];
  }
  
  return (data || []).map((l: any) => ({
    id: l.id,
    contract_id: l.company_id,
    seller_wallet: l.seller_wallet,
    tokens_for_sale: l.tokens_for_sale,
    price_per_token: l.price_per_token,
    is_active: l.is_active,
    created_at: l.created_at,
  }));
}
