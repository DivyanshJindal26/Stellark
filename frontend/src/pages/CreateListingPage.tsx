import { useState, useEffect } from 'react';
import { Building2, Tag, Rocket } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import {
  initializeCompany,
  saveCompanyMetadata,
  getCompaniesMetadata,
  createResaleListing,
  getTokenBalance,
  type CompanyMetadata,
} from '../lib/contractService';
import { deployNewContract, checkBackendHealth } from '../lib/api';

type TabType = 'company' | 'resale';

export function CreateListingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [companies, setCompanies] = useState<CompanyMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const { walletAddress, isConnected } = useWallet();

  const [companyForm, setCompanyForm] = useState({
    contractId: '',
    name: '',
    description: '',
    symbol: '',
    equityPercentage: '',
    tokenPrice: '',
    totalTokens: '',
  });

  const [resaleForm, setResaleForm] = useState({
    contractId: '',
    tokensToSell: '',
    pricePerToken: '',
  });

  useEffect(() => {
    loadCompanies();
    checkBackend();
  }, []);

  const loadCompanies = async () => {
    const metadata = await getCompaniesMetadata();
    setCompanies(metadata);
  };

  const checkBackend = async () => {
    const isAvailable = await checkBackendHealth();
    setBackendAvailable(isAvailable);
  };

  const handleDeployContract = async () => {
    if (deploying) return;

    try {
      setDeploying(true);

      const result = await deployNewContract();

      if (result.success && result.contractId) {
        // Auto-fill the contract ID field
        setCompanyForm({ ...companyForm, contractId: result.contractId });
        alert(`✅ Contract deployed successfully!\n\nContract ID: ${result.contractId}\n\nYou can now fill in the company details and submit.`);
      } else {
        alert(`❌ Deployment failed: ${result.error || 'Unknown error'}\n\nPlease try the manual deployment method or check the backend logs.`);
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      alert(`❌ Deployment failed: ${error.message}\n\nMake sure the backend API is running (npm run dev in the backend folder).`);
    } finally {
      setDeploying(false);
    }
  };

  const handleCreateCompanyListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // Validate inputs
    const totalTokens = parseInt(companyForm.totalTokens);
    const tokenPrice = parseFloat(companyForm.tokenPrice);
    const equityPercent = parseFloat(companyForm.equityPercentage);
    const targetAmount = totalTokens * tokenPrice;

    if (isNaN(totalTokens) || isNaN(tokenPrice) || isNaN(equityPercent) || isNaN(targetAmount)) {
      alert('Please enter valid numbers');
      return;
    }

    try {
      setLoading(true);

      // Get the contract ID from the form
      const contractId = companyForm.contractId.trim();
      
      if (!contractId) {
        alert('Please enter a deployed contract ID');
        return;
      }

      // Validate contract ID format (should start with 'C')
      if (!contractId.startsWith('C')) {
        alert(`Invalid contract ID: ${contractId}. Contract IDs should start with 'C', not 'G' (which is for wallet addresses).`);
        return;
      }

      console.log('Creating company listing with contract:', contractId);

      // Initialize the company on the contract with all metadata
      await initializeCompany(
        walletAddress,
        contractId,
        companyForm.name,
        companyForm.symbol,
        totalTokens,
        equityPercent,
        companyForm.description,
        tokenPrice,
        targetAmount
      );

      // Save metadata to Supabase for discovery
      await saveCompanyMetadata({
        contractId,
        name: companyForm.name,
        description: companyForm.description,
        owner_wallet: walletAddress,
        token_price: tokenPrice,
        target_amount: targetAmount,
      });

      alert('Company listing created successfully on the blockchain and indexed!');
      
      // Reset form
      setCompanyForm({
        contractId: '',
        name: '',
        description: '',
        symbol: '',
        equityPercentage: '',
        tokenPrice: '',
        totalTokens: '',
      });
      
      loadCompanies();
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      alert(`Failed to create listing: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResaleListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const tokensToSell = parseInt(resaleForm.tokensToSell);
    const pricePerToken = parseFloat(resaleForm.pricePerToken);

    if (isNaN(tokensToSell) || isNaN(pricePerToken)) {
      alert('Please enter valid numbers');
      return;
    }

    try {
      setLoading(true);

      // Check user's balance
      const balance = await getTokenBalance(resaleForm.contractId, walletAddress);
      
      if (balance < tokensToSell) {
        alert(`You only have ${balance} tokens. Cannot sell ${tokensToSell}.`);
        return;
      }

      // Create resale listing (metadata only, actual transfer happens on purchase)
      await createResaleListing({
        contract_id: resaleForm.contractId,
        seller_wallet: walletAddress,
        tokens_for_sale: tokensToSell,
        price_per_token: pricePerToken,
        is_active: true,
      });

      alert('Resale listing created successfully!');
      
      // Reset form
      setResaleForm({
        contractId: '',
        tokensToSell: '',
        pricePerToken: '',
      });
    } catch (error: any) {
      console.error('Failed to create resale listing:', error);
      alert(`Failed to create listing: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Create Listing</h1>
        <p className="text-gray-400">Launch your company token or sell your existing tokens</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-[#00BFFF]/30">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'company'
              ? 'text-[#00BFFF] border-b-2 border-[#00BFFF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Building2 className="w-5 h-5 inline-block mr-2" />
          Company Token
        </button>
        <button
          onClick={() => setActiveTab('resale')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'resale'
              ? 'text-[#00BFFF] border-b-2 border-[#00BFFF]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Tag className="w-5 h-5 inline-block mr-2" />
          Resale Tokens
        </button>
      </div>

      {/* Company Token Form */}
      {activeTab === 'company' ? (
        <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-2xl p-8 border border-[#00BFFF]/30">
          <h2 className="text-2xl font-bold text-white mb-6">Launch Your Company Token</h2>
          <form onSubmit={handleCreateCompanyListing} className="space-y-6">
            {/* Auto-Deploy Section */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-purple-400" />
                    Automated Contract Deployment
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Click the button below to automatically deploy a new smart contract for your company. 
                    The contract ID will be filled in automatically once deployment is complete.
                  </p>
                  {backendAvailable === false && (
                    <p className="text-yellow-200 text-sm bg-yellow-900/20 border border-yellow-500/30 rounded px-3 py-2">
                      ⚠️ Backend API is not available. Please start it with: <code className="bg-black/30 px-2 py-1 rounded">cd backend && npm run dev</code>
                    </p>
                  )}
                  {backendAvailable === true && (
                    <p className="text-green-200 text-sm bg-green-900/20 border border-green-500/30 rounded px-3 py-2">
                      ✅ Backend API is ready
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDeployContract}
                  disabled={deploying || backendAvailable === false}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {deploying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Deploy Contract
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Contract ID * 
                <span className="text-sm text-gray-500 ml-2">
                  {companyForm.contractId ? '✅ Ready' : '(Deploy contract first)'}
                </span>
              </label>
              <input
                type="text"
                required
                value={companyForm.contractId}
                onChange={(e) => setCompanyForm({ ...companyForm, contractId: e.target.value.trim() })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-[#00BFFF] transition-colors"
                placeholder="CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                readOnly={deploying}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                placeholder="Acme Corp"
              />
            </div>



            <div>
              <label className="block text-gray-300 mb-2">Description *</label>
              <textarea
                required
                rows={4}
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                placeholder="Describe your company and what makes it special..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">Token Symbol *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={companyForm.symbol}
                  onChange={(e) => setCompanyForm({ ...companyForm, symbol: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                  placeholder="ACME"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Equity Percentage *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={companyForm.equityPercentage}
                  onChange={(e) => setCompanyForm({ ...companyForm, equityPercentage: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2">Token Price (XLM) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={companyForm.tokenPrice}
                  onChange={(e) => setCompanyForm({ ...companyForm, tokenPrice: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                  placeholder="0.10"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Total Tokens *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={companyForm.totalTokens}
                  onChange={(e) => setCompanyForm({ ...companyForm, totalTokens: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                  placeholder="1000000"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isConnected || loading}
              className="w-full py-4 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg font-medium text-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : isConnected ? 'Deploy Company Token' : 'Connect Wallet to Continue'}
            </button>
          </form>
        </div>
      ) : (
        /* Resale Form */
        <div className="bg-gradient-to-br from-[#0D1B4C] to-[#0a0e27] rounded-2xl p-8 border border-[#00BFFF]/30">
          <h2 className="text-2xl font-bold text-white mb-6">List Tokens for Resale</h2>
          <form onSubmit={handleCreateResaleListing} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2">Select Company *</label>
              <select
                required
                value={resaleForm.contractId}
                onChange={(e) => setResaleForm({ ...resaleForm, contractId: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
              >
                <option value="">Choose a company...</option>
                {companies.map((company) => (
                  <option key={company.contractId} value={company.contractId}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Tokens to Sell *</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={resaleForm.tokensToSell}
                onChange={(e) => setResaleForm({ ...resaleForm, tokensToSell: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Price per Token (XLM) *</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={resaleForm.pricePerToken}
                onChange={(e) => setResaleForm({ ...resaleForm, pricePerToken: e.target.value })}
                className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
                placeholder="0.12"
              />
            </div>

            <button
              type="submit"
              disabled={!isConnected || loading}
              className="w-full py-4 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg font-medium text-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : isConnected ? 'Create Listing' : 'Connect Wallet to Continue'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
