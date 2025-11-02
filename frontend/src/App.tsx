import { useState, useEffect } from 'react';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CreateListingPage } from './pages/CreateListingPage';
import { MyInvestmentsPage } from './pages/MyInvestmentsPage';
import { getCompaniesMetadata, getTokenBalance } from './lib/contractService';

type Page = 'home' | 'create' | 'investments';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [portfolioValue, setPortfolioValue] = useState(0);
  const { walletAddress } = useWallet();

  useEffect(() => {
    if (walletAddress) {
      calculatePortfolioValue(walletAddress);
    } else {
      setPortfolioValue(0);
    }
  }, [walletAddress, currentPage]);

  const calculatePortfolioValue = async (address: string) => {
    try {
      const companies = await getCompaniesMetadata(); // NOW ASYNC!
      
      // Fetch balances from all company contracts
      const balances = await Promise.all(
        companies.map(async (company) => {
          try {
            const balance = await getTokenBalance(company.contractId, address);
            return balance * company.token_price;
          } catch (error) {
            console.error(`Error fetching balance for ${company.name}:`, error);
            return 0;
          }
        })
      );

      const totalValue = balances.reduce((sum, value) => sum + value, 0);
      setPortfolioValue(totalValue);
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
      setPortfolioValue(0);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'create':
        return <CreateListingPage />;
      case 'investments':
        return <MyInvestmentsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      portfolioValue={portfolioValue}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
