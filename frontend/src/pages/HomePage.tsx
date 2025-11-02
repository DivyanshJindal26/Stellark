import { useState, useEffect } from 'react';
import { Building2, TrendingUp, Users } from 'lucide-react';
import { InvestModal } from '../components/InvestModal';
import { useWallet } from '../contexts/WalletContext';
import {
  getCompaniesMetadata,
  getCompanyMetadata,
  getActiveResaleListings,
  getCompanyInfo,
  getTokenBalance,
  mintTokens,
  transferTokensWithPayment,
  updateResaleListingQuantity,
  deactivateResaleListing,
  type CompanyMetadata,
  type ResaleListing,
  type CompanyInfo,
} from '../lib/contractService';
import { XLM_TOKEN_ADDRESS } from '../lib/stellar';

interface CompanyWithOnChainData {
  metadata: CompanyMetadata;
  onChainInfo: CompanyInfo | null;
  tokensSold: number;
}

export function HomePage() {
  const [companies, setCompanies] = useState<CompanyWithOnChainData[]>([]);
  const [resaleListings, setResaleListings] = useState<(ResaleListing & { companyName?: string })[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithOnChainData | null>(null);
  const [selectedResale, setSelectedResale] = useState<(ResaleListing & { companyName?: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const { walletAddress, isConnected } = useWallet();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCompanies(), loadResaleListings()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const metadata = await getCompaniesMetadata();
      
      // Fetch on-chain data for each company
      const companiesWithData = await Promise.all(
        metadata.map(async (meta) => {
          try {
            const onChainInfo = await getCompanyInfo(meta.contractId);
            // Calculate tokens sold by checking owner's balance vs total supply
            const ownerBalance = await getTokenBalance(meta.contractId, meta.owner_wallet);
            const tokensSold = onChainInfo 
              ? Number(onChainInfo.total_supply) - Number(ownerBalance)
              : 0;
            
            return {
              metadata: meta,
              onChainInfo,
              tokensSold,
            };
          } catch (error) {
            console.error(`Error loading company ${meta.contractId}:`, error);
            return {
              metadata: meta,
              onChainInfo: null,
              tokensSold: 0,
            };
          }
        })
      );
      
      setCompanies(companiesWithData);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadResaleListings = async () => {
    try {
      const listings = await getActiveResaleListings();
      
      // Enrich with company names
      const enriched = await Promise.all(
        listings.map(async (listing) => ({
          ...listing,
          companyName: (await getCompanyMetadata(listing.contract_id))?.name || 'Unknown Company',
        }))
      );
      
      setResaleListings(enriched);
    } catch (error) {
      console.error('Error loading resale listings:', error);
    }
  };

  const handleInvest = async (tokens: number, _totalAmount: number) => {
    if (!isConnected || !walletAddress || !selectedCompany) {
      alert('Please connect your wallet first');
      return;
    }

    if (!selectedCompany.onChainInfo) {
      alert('Company contract not initialized');
      return;
    }

    try {
      setLoading(true);
      
      // Use mint function - buyer signs and gets tokens from owner's balance
      // Payment in XLM is automatically transferred from buyer to owner
      await mintTokens(
        walletAddress, // buyer signs the transaction
        selectedCompany.metadata.contractId,
        walletAddress, // tokens go to buyer's address
        tokens,
        XLM_TOKEN_ADDRESS // XLM token address for payment
      );
      
      alert(`Investment successful! ${tokens} tokens transferred to your wallet.`);
      setSelectedCompany(null);
      await loadData();
    } catch (error: any) {
      console.error('Investment error:', error);
      alert(`Investment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyResale = async (tokens: number, _totalAmount: number) => {
    if (!isConnected || !walletAddress || !selectedResale) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      
      // Transfer tokens from seller to buyer with XLM payment
      // Buyer signs, pays seller, and receives tokens atomically
      await transferTokensWithPayment(
        walletAddress, // buyer (signs the transaction)
        selectedResale.seller_wallet, // seller
        selectedResale.contract_id,
        tokens,
        selectedResale.price_per_token,
        XLM_TOKEN_ADDRESS
      );
      
      // Calculate remaining tokens
      const remainingTokens = selectedResale.tokens_for_sale - tokens;
      
      if (remainingTokens > 0) {
        // Update listing with remaining tokens
        await updateResaleListingQuantity(selectedResale.id, remainingTokens);
        alert(`Purchase successful! ${tokens} tokens transferred. ${remainingTokens} tokens still available.`);
      } else {
        // All tokens sold - deactivate listing
        await deactivateResaleListing(selectedResale.id);
        alert('Purchase successful! All tokens from this listing have been sold.');
      }
      
      setSelectedResale(null);
      await loadData();
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFFF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">
          Invest in the Future with <span className="text-[#00BFFF]">Blockchain</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Buy equity tokens from innovative companies powered by Stellar Soroban smart contracts
        </p>
      </div>

      {/* Company Listings */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Available Companies</h2>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-[#00BFFF]/20 text-[#00BFFF] rounded-lg hover:bg-[#00BFFF]/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {companies.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl border border-[#00BFFF]/30">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No companies listed yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => {
              const totalTokens = company.onChainInfo?.total_supply || 0;
              const availableTokens = totalTokens - company.tokensSold;
              const fundsRaised = company.tokensSold * company.metadata.token_price;
              const progress = (fundsRaised / (company.metadata.token_price * totalTokens) * 100) || 0;

              return (
                <div
                  key={company.metadata.contractId}
                  className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30 hover:border-[#00BFFF]/60 transition-all cursor-pointer"
                  onClick={() => setSelectedCompany(company)}
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#00BFFF]/20 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-[#00BFFF]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{company.metadata.name}</h3>
                      <p className="text-sm text-gray-400">
                        {company.onChainInfo ? `${company.onChainInfo.equity_percent}% equity` : 'Loading...'}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{company.metadata.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Token Price</span>
                      <span className="text-[#00BFFF] font-semibold">{company.metadata.token_price} XLM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Available Tokens</span>
                      <span className="text-white font-semibold">{availableTokens} / {totalTokens}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-[#00BFFF] font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-[#00BFFF] h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    className="w-full py-2 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all font-medium"
                    disabled={availableTokens === 0}
                  >
                    {availableTokens === 0 ? 'Sold Out' : 'Invest Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Resale Marketplace */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">Secondary Market</h2>

        {resaleListings.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl border border-[#00BFFF]/30">
            <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No tokens available for resale yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {resaleListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-gradient-to-r from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30 hover:border-[#00BFFF]/60 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-[#00BFFF]/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#00BFFF]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{listing.companyName}</h3>
                      <p className="text-sm text-gray-400">Seller: {shortenAddress(listing.seller_wallet)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Tokens Available</p>
                      <p className="text-lg font-bold text-white">{listing.tokens_for_sale}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Price per Token</p>
                      <p className="text-lg font-bold text-[#00BFFF]">{listing.price_per_token} XLM</p>
                    </div>
                    <button
                      onClick={() => setSelectedResale(listing)}
                      className="px-6 py-2 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all font-medium"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Investment Modal for Primary Listings */}
      {selectedCompany && selectedCompany.onChainInfo && (
        <InvestModal
          companyName={selectedCompany.metadata.name}
          tokenPrice={selectedCompany.metadata.token_price}
          availableTokens={selectedCompany.onChainInfo.total_supply - selectedCompany.tokensSold}
          onClose={() => setSelectedCompany(null)}
          onInvest={handleInvest}
        />
      )}

      {/* Investment Modal for Resale Listings */}
      {selectedResale && (
        <InvestModal
          companyName={selectedResale.companyName || 'Unknown Company'}
          tokenPrice={selectedResale.price_per_token}
          availableTokens={selectedResale.tokens_for_sale}
          onClose={() => setSelectedResale(null)}
          onInvest={handleBuyResale}
        />
      )}
    </div>
  );
}
