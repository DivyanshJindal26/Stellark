import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  scValToNative,
  nativeToScVal,
  xdr,
  rpc,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const { Server, Api, assembleTransaction } = rpc;

// Testnet Configuration
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export const server = new Server(SOROBAN_RPC_URL);

// Contract ID - Load from environment variable (optional, used as default)
export const EQUITY_TOKEN_CONTRACT_ID = import.meta.env.VITE_EQUITY_TOKEN_CONTRACT_ID || "";

// Native XLM token address on Stellar testnet
// This is the Stellar Asset Contract (SAC) address for native XLM on testnet
export const XLM_TOKEN_ADDRESS = import.meta.env.VITE_XLM_TOKEN_ADDRESS || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/**
 * Build and submit a Soroban contract transaction
 */
export async function invokeContract(
  walletAddress: string,
  contractId: string,
  method: string,
  params: xdr.ScVal[]
): Promise<any> {
  try {
    const contract = new Contract(contractId);
    
    // Get account from network
    const account = await server.getAccount(walletAddress);
    
    // Build the operation
    const operation = contract.call(method, ...params);
    
    // Build transaction
    let transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    // Simulate first to get the resource fee
    const simulated = await server.simulateTransaction(transaction);
    
    if (Api.isSimulationError(simulated)) {
      console.error('Simulation error details:', simulated);
      console.error('Error:', simulated.error);
      throw new Error(`Simulation failed: ${simulated.error || 'Unknown error'}`);
    }
    
    console.log('Simulation successful:', simulated);
    console.log('Simulation auth:', (simulated as any).result?.auth);
    
    // Assemble the transaction with simulation results
    const assembled = assembleTransaction(transaction, simulated);
    
    // Sign with Freighter
    const { signedTxXdr } = await signTransaction(assembled.build().toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: walletAddress, // Ensure this wallet signs
    });
    
    const signedTransaction = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    
    // Submit transaction
    const sendResponse = await server.sendTransaction(signedTransaction);
    
    if (sendResponse.status === 'PENDING') {
      // Poll for result
      let getResponse = await server.getTransaction(sendResponse.hash);
      
      // Poll until the transaction is confirmed or times out
      while (getResponse.status === Api.GetTransactionStatus.NOT_FOUND) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(sendResponse.hash);
      }
      
      if (getResponse.status === Api.GetTransactionStatus.SUCCESS) {
        // Parse the result
        const result = (getResponse as any).returnValue;
        return result ? scValToNative(result) : null;
      } else {
        throw new Error(`Transaction failed: ${getResponse.status}`);
      }
    }
    
    throw new Error('Transaction submission failed');
  } catch (error) {
    console.error('Contract invocation error:', error);
    throw error;
  }
}

/**
 * Read-only contract call (doesn't require signing)
 */
export async function readContract(
  contractId: string,
  method: string,
  params: xdr.ScVal[] = []
): Promise<any> {
  try {
    const contract = new Contract(contractId);
    
    // Use a dummy source account for read-only calls
    const account = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    
    const operation = contract.call(method, ...params);
    
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed`);
    }
    
    const result = (simulated as any).result?.retval;
    return result ? scValToNative(result) : null;
  } catch (error) {
    console.error('Contract read error:', error);
    throw error;
  }
}

/**
 * Helper functions to convert JS values to Soroban types
 */
export function addressToScVal(address: string): xdr.ScVal {
  return nativeToScVal(address, { type: 'address' });
}

export function stringToScVal(str: string): xdr.ScVal {
  return nativeToScVal(str, { type: 'string' });
}

export function numberToScVal(num: number): xdr.ScVal {
  return nativeToScVal(num, { type: 'i128' });
}

/**
 * Convert BigInt to Number safely
 */
export function bigIntToNumber(value: any): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  return 0;
}

/**
 * Get account sequence for transaction building
 */
export async function getAccount(address: string) {
  return await server.getAccount(address);
}
