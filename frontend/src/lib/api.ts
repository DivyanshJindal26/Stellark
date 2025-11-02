// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DeploymentResponse {
  success: boolean;
  contractId?: string;
  message?: string;
  explorerUrl?: string;
  error?: string;
  details?: any;
}

/**
 * Deploy a new contract instance via backend API
 * This automates the contract deployment process
 */
export async function deployNewContract(): Promise<DeploymentResponse> {
  try {
    const response = await fetch(`${API_URL}/api/deploy-contract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Deployment failed');
    }

    return data;
  } catch (error: any) {
    console.error('Deployment API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to deployment API',
    };
  }
}

/**
 * Get deployment network info
 */
export async function getDeploymentInfo() {
  try {
    const response = await fetch(`${API_URL}/api/deployment-info`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch deployment info:', error);
    return null;
  }
}

/**
 * Check if backend API is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
