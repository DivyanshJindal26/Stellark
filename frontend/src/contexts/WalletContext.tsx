import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  isConnected as checkFreighterConnection,
  getAddress,
  requestAccess,
  setAllowed,
} from '@stellar/freighter-api';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  balance: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Add delay to ensure Freighter is loaded
    const timer = setTimeout(() => {
      console.log('Checking for Freighter...');
      checkWalletConnection();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      refreshBalance();
      // Refresh balance every 30 seconds
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  const refreshBalance = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${walletAddress}`
      );
      
      if (response.ok) {
        const accountData = await response.json();
        const xlmBalance = accountData.balances.find(
          (b: any) => b.asset_type === 'native'
        );
        if (xlmBalance) {
          setBalance(parseFloat(xlmBalance.balance).toFixed(2));
          console.log('Balance updated:', xlmBalance.balance);
        }
      } else {
        console.error('Account not found on network');
        setBalance('0.00');
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const checkWalletConnection = async () => {
    try {
      const isFreighterConnected = await checkFreighterConnection();
      console.log('Freighter connected?', isFreighterConnected);
      
      if (isFreighterConnected) {
        const { address, error } = await getAddress();
        if (error) {
          console.error('Error getting address:', error);
          return;
        }
        console.log('Wallet address:', address);
        setWalletAddress(address);
        localStorage.setItem('stellark_wallet', address);
      }
    } catch (err) {
      console.error('Failed to check wallet connection:', err);
    }
  };

  const connectWallet = async () => {
    setError(null);
    
    console.log('Attempting to connect wallet...');
    
    try {
      // Request access to Freighter
      const { address, error: accessError } = await requestAccess();
      
      if (accessError) {
        throw new Error(accessError);
      }
      
      console.log('Connected! Public key:', address);
      
      // Set allowed for future interactions
      await setAllowed();
      
      setWalletAddress(address);
      localStorage.setItem('stellark_wallet', address);
    } catch (err: any) {
      if (err?.message?.includes('User declined access')) {
        setError('User declined wallet access');
      } else if (err?.message?.includes('Freighter is not installed')) {
        setError('Freighter wallet extension not found. Please install it from freighter.app');
        window.open('https://www.freighter.app/', '_blank');
      } else {
        setError(err?.message || 'Failed to connect wallet');
      }
      console.error('Wallet connection error:', err);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setBalance(null);
    setError(null);
    localStorage.removeItem('stellark_wallet');
  };

  return (
    <WalletContext.Provider value={{
      walletAddress,
      isConnected: !!walletAddress,
      balance,
      connectWallet,
      disconnectWallet,
      refreshBalance,
      error,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
