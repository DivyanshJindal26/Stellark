import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import {
  getCompaniesMetadata,
  getTokenBalance,
  createResaleListing,
  type CompanyMetadata,
} from '../lib/contractService';

interface Holding {
  company: CompanyMetadata;
  tokenBalance: number;
  currentValue: number;
}

export function MyInvestmentsPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [sellTokens, setSellTokens] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const { walletAddress, isConnected } = useWallet();

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadInvestments();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  const loadInvestments = async () => {
    if (!walletAddress) return;

    setIsLoading(true);

    try {
      const companies = await getCompaniesMetadata();
      
      // Fetch balances for all companies
      const holdingsData = await Promise.all(
        companies.map(async (company) => {
          try {
            const balance = await getTokenBalance(company.contractId, walletAddress);
            
            if (balance > 0) {
              return {
                company,
                tokenBalance: balance,
                currentValue: balance * company.token_price,
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching balance for ${company.name}:`, error);
            return null;
          }
        })
      );

      // Filter out null values (companies where user has no tokens)
      setHoldings(holdingsData.filter((h): h is Holding => h !== null));
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = (holding: Holding) => {
    setSelectedHolding(holding);
    setSellPrice(holding.company.token_price.toString());
    setShowSellModal(true);
  };

  const handleCreateResaleListing = async () => {
    if (!selectedHolding || !walletAddress) return;

    const tokensToSell = parseInt(sellTokens);
    const pricePerToken = parseFloat(sellPrice);

    if (isNaN(tokensToSell) || isNaN(pricePerToken)) {
      alert('Please enter valid numbers');
      return;
    }

    if (tokensToSell > selectedHolding.tokenBalance) {
      alert('You cannot sell more tokens than you own');
      return;
    }

    if (tokensToSell <= 0) {
      alert('Please enter a positive number of tokens');
      return;
    }

    try {
      await createResaleListing({
        contract_id: selectedHolding.company.contractId,
        seller_wallet: walletAddress,
        tokens_for_sale: tokensToSell,
        price_per_token: pricePerToken,
        is_active: true,
      });

      alert('Resale listing created successfully!');
      setShowSellModal(false);
      setSellTokens('');
      setSellPrice('');
      setSelectedHolding(null);
    } catch (error: any) {
      console.error('Error creating listing:', error);
      alert(`Failed to create listing: ${error.message || 'Unknown error'}`);
    }
  };

  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalTokensOwned = holdings.reduce((sum, holding) => sum + holding.tokenBalance, 0);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Wallet className="w-20 h-20 text-gray-600 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">Please connect your wallet to view your investments</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFFF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">My Investments</h1>
        <p className="text-gray-400">Track and manage your token holdings on-chain</p>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30">
          <div className="flex items-center space-x-3 mb-3">
            <DollarSign className="w-8 h-8 text-[#00BFFF]" />
            <h3 className="text-gray-400 text-sm">Total Portfolio Value</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalPortfolioValue.toFixed(2)} XLM</p>
        </div>

        <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30">
          <div className="flex items-center space-x-3 mb-3">
            <Package className="w-8 h-8 text-[#00BFFF]" />
            <h3 className="text-gray-400 text-sm">Total Tokens Owned</h3>
          </div>
          <p className="text-3xl font-bold text-white">{totalTokensOwned}</p>
        </div>

        <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp className="w-8 h-8 text-[#00BFFF]" />
            <h3 className="text-gray-400 text-sm">Companies Invested</h3>
          </div>
          <p className="text-3xl font-bold text-white">{holdings.length}</p>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Holdings</h2>

        {holdings.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-2xl border border-[#00BFFF]/30">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">You have not made any investments yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {holdings.map((holding) => (
              <div
                key={holding.company.contractId}
                className="bg-gradient-to-r from-[#0D1B4C] to-[#0a0e27] rounded-xl p-6 border border-[#00BFFF]/30 hover:border-[#00BFFF]/60 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{holding.company.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">Contract: {holding.company.contractId.slice(0, 10)}...</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Tokens Owned</p>
                        <p className="text-lg font-bold text-white">{holding.tokenBalance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Current Price</p>
                        <p className="text-lg font-bold text-[#00BFFF]">{holding.company.token_price} XLM</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Value</p>
                        <p className="text-lg font-bold text-white">{holding.currentValue.toFixed(2)} XLM</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleSell(holding)}
                      className="px-6 py-2 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all font-medium"
                    >
                      Sell Tokens
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {showSellModal && selectedHolding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-2xl p-8 max-w-md w-full border border-[#00BFFF]/30">
            <h3 className="text-2xl font-bold text-white mb-6">Sell {selectedHolding.company.name} Tokens</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2">Tokens to Sell</label>
                <input
                  type="number"
                  min="1"
                  max={selectedHolding.tokenBalance}
                  value={sellTokens}
                  onChange={(e) => setSellTokens(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF]"
                  placeholder={`Max: ${selectedHolding.tokenBalance}`}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Price per Token (XLM)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF]"
                  placeholder="0.10"
                />
              </div>

              {sellTokens && sellPrice && (
                <div className="bg-[#00BFFF]/10 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Total Sale Value</p>
                  <p className="text-2xl font-bold text-[#00BFFF]">
                    {(parseInt(sellTokens) * parseFloat(sellPrice)).toFixed(2)} XLM
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSellTokens('');
                  setSellPrice('');
                  setSelectedHolding(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateResaleListing}
                disabled={!sellTokens || !sellPrice}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
