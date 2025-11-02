import { ReactNode } from 'react';
import { Rocket, Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'home' | 'create' | 'investments';
  onNavigate: (page: 'home' | 'create' | 'investments') => void;
  portfolioValue: number;
}

export function Layout({ children, currentPage, onNavigate, portfolioValue }: LayoutProps) {
  const { walletAddress, isConnected, balance, connectWallet, disconnectWallet } = useWallet();

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0D1B4C] to-[#0a0e27]">
      <nav className="bg-[#0D1B4C] border-b border-[#00BFFF]/20 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('home')}>
                <Rocket className="w-8 h-8 text-[#00BFFF]" />
                <span className="text-2xl font-bold text-white">Stellark</span>
              </div>

              <div className="hidden md:flex space-x-6">
                <button
                  onClick={() => onNavigate('home')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === 'home'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => onNavigate('create')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === 'create'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Create Listing
                </button>
                <button
                  onClick={() => onNavigate('investments')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    currentPage === 'investments'
                      ? 'bg-[#00BFFF] text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  My Investments
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {isConnected && (
                <div className="hidden md:block text-right">
                  <p className="text-xs text-gray-400">Total Portfolio</p>
                  <p className="text-lg font-bold text-[#00BFFF]">{portfolioValue.toFixed(2)} XLM</p>
                </div>
              )}

              {isConnected ? (
                <div className="flex items-center space-x-3">
                  <div className="px-4 py-2 bg-[#00BFFF]/20 rounded-lg border border-[#00BFFF]/40">
                    <div className="flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-[#00BFFF]" />
                      <span className="text-white text-sm">{shortenAddress(walletAddress!)}</span>
                    </div>
                    {balance && (
                      <div className="text-xs text-[#00BFFF] mt-1">
                        {balance} XLM
                      </div>
                    )}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-6 py-2 bg-gradient-to-r from-[#00BFFF] to-[#0D1B4C] text-white rounded-lg hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all font-medium"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
