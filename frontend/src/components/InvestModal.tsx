import { useState } from 'react';
import { X } from 'lucide-react';

interface InvestModalProps {
  companyName: string;
  tokenPrice: number;
  availableTokens: number;
  onClose: () => void;
  onInvest: (tokens: number, totalAmount: number) => Promise<void>;
}

export function InvestModal({ companyName, tokenPrice, availableTokens, onClose, onInvest }: InvestModalProps) {
  const [tokens, setTokens] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = tokens * tokenPrice;

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string (user is typing)
    if (value === '') {
      setTokens(0);
      return;
    }
    
    // Parse and clamp the value
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setTokens(Math.max(0, Math.min(availableTokens, numValue)));
    }
  };

  const handleInvest = async () => {
    if (tokens < 1) {
      alert('Please enter at least 1 token');
      return;
    }
    
    setIsProcessing(true);
    try {
      await onInvest(tokens, totalAmount);
      onClose();
    } catch (error) {
      console.error('Investment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1B4C] rounded-2xl max-w-md w-full p-6 border border-[#00BFFF]/30 shadow-2xl shadow-[#00BFFF]/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Invest in {companyName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a0e27] rounded-lg p-4 border border-[#00BFFF]/20">
            <p className="text-gray-400 text-sm mb-1">Token Price</p>
            <p className="text-2xl font-bold text-[#00BFFF]">{tokenPrice} XLM</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Number of Tokens</label>
            <input
              type="number"
              min="1"
              max={availableTokens}
              value={tokens === 0 ? '' : tokens}
              onChange={handleTokenChange}
              className="w-full px-4 py-3 bg-[#0a0e27] border border-[#00BFFF]/30 rounded-lg text-white focus:outline-none focus:border-[#00BFFF] transition-colors"
              placeholder="Enter number of tokens"
            />
            <p className="text-sm text-gray-400 mt-1">Available: {availableTokens} tokens</p>
          </div>

          <div className="bg-gradient-to-r from-[#00BFFF]/20 to-[#0D1B4C]/20 rounded-lg p-4 border border-[#00BFFF]/30">
            <p className="text-gray-400 text-sm mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-white">{totalAmount.toFixed(2)} XLM</p>
          </div>

          <button
            onClick={handleInvest}
            disabled={isProcessing || tokens < 1 || tokens > availableTokens}
            className="w-full py-3 bg-gradient-to-r from-[#00BFFF] to-[#0D8BDB] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#00BFFF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Confirm Investment'}
          </button>
        </div>
      </div>
    </div>
  );
}
