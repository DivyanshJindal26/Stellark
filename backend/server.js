import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7042;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stellark API is running' });
});

/**
 * Deploy a new contract instance
 * POST /api/deploy-contract
 * 
 * This endpoint builds and deploys a fresh Soroban contract to the testnet.
 * Each deployment creates a unique contract instance with its own storage.
 */
app.post('/api/deploy-contract', async (req, res) => {
  try {
    console.log('📦 Starting contract deployment...');

    // Path to the stellark contracts directory
    const contractsPath = path.join(__dirname, '..', 'stellark');
    
    // Build the contract
    console.log('🔨 Building contract...');
    const buildCommand = `cd ${contractsPath}/contracts/equity-token && cargo build --target wasm32-unknown-unknown --release`;
    
    try {
      const { stdout: buildStdout, stderr: buildStderr } = await execPromise(buildCommand);
      if (buildStderr && !buildStderr.includes('Finished')) {
        console.error('Build warnings:', buildStderr);
      }
      console.log('✅ Contract built successfully');
    } catch (buildError) {
      console.error('Build error:', buildError);
      return res.status(500).json({
        success: false,
        error: 'Contract build failed',
        details: buildError.message
      });
    }

    // Deploy the contract
    console.log('🚀 Deploying contract to testnet...');
    const deployCommand = `cd ${contractsPath} && stellar contract deploy --wasm target/wasm32v1-none/release/equity_token.wasm --source alice --network testnet`;
    
    try {
      const { stdout: deployStdout, stderr: deployStderr } = await execPromise(deployCommand);
      
      // The contract ID is in the stdout, typically the last line
      const contractId = deployStdout.trim().split('\n').pop().trim();
      
      // Validate contract ID format (should start with 'C')
      if (!contractId || !contractId.startsWith('C') || contractId.length < 50) {
        console.error('Invalid contract ID:', contractId);
        console.error('Deploy stdout:', deployStdout);
        console.error('Deploy stderr:', deployStderr);
        return res.status(500).json({
          success: false,
          error: 'Failed to extract valid contract ID',
          details: { stdout: deployStdout, stderr: deployStderr }
        });
      }

      console.log('✅ Contract deployed successfully!');
      console.log('📋 Contract ID:', contractId);

      res.json({
        success: true,
        contractId: contractId,
        message: 'Contract deployed successfully',
        explorerUrl: `https://stellar.expert/explorer/testnet/contract/${contractId}`
      });

    } catch (deployError) {
      console.error('Deploy error:', deployError);
      return res.status(500).json({
        success: false,
        error: 'Contract deployment failed',
        details: deployError.message
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Get deployment status/info
 * GET /api/deployment-info
 */
app.get('/api/deployment-info', (req, res) => {
  res.json({
    network: 'testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    explorerUrl: 'https://stellar.expert/explorer/testnet'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Stellark API running on http://localhost:${PORT}`);
  console.log(`📡 Network: Stellar Testnet`);
  console.log(`🔗 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /api/deploy-contract - Deploy new contract`);
  console.log(`   GET  /api/deployment-info - Get network info`);
});
