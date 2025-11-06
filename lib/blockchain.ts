/**
 * Blockchain Interaction Library
 * Handles smart contract interactions for registering and verifying proofs
 */

import { ethers } from 'ethers';
import { ProofOfArtABI } from './contract-abi';

/**
 * Get contract address from environment variables
 * Works in both browser and Node.js contexts
 */
function getContractAddress(): string {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string) || '';
  }
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

/**
 * Get contract instance
 * Returns an ethers Contract instance for interacting with ProofOfArt smart contract
 */
export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contractAddress = getContractAddress();
  // Use ABI from contract-abi.ts (artifacts folder is not committed to repo)
  const abi = ProofOfArtABI;
  return new ethers.Contract(contractAddress, abi, signerOrProvider);
}

/**
 * Register proof on blockchain
 * Stores proof data permanently on-chain for verification
 * Returns transaction hash
 */
export async function registerProofOnChain(
  signer: ethers.Signer,
  proofData: {
    promptHash: string;
    outputHash: string;
    combinedHash: string;
    ipfsLink: string;
  }
): Promise<string> {
  try {
    const contractAddress = getContractAddress();
    
    if (!contractAddress || contractAddress === '') {
      throw new Error('Contract address not set. Please deploy the contract and set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file.');
    }

    const contract = getContract(signer);
    
    // Verify contract exists at address
    const code = await signer.provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at address ${contractAddress}. Please deploy the contract first.`);
    }

    // Call smart contract to register proof
    const tx = await contract.registerProof(
      proofData.promptHash,
      proofData.outputHash,
      proofData.combinedHash,
      proofData.ipfsLink
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error: any) {
    console.error('Blockchain registration error:', error);
    
    if (error.message) {
      throw new Error(`Failed to register proof on blockchain: ${error.message}`);
    }
    
    if (error.code === 'CALL_EXCEPTION') {
      throw new Error('Contract call failed. Make sure the contract is deployed and the address is correct.');
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for transaction. Please add more ETH to your wallet.');
    }
    
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user.');
    }
    
    throw new Error(`Failed to register proof on blockchain: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Verify proof on blockchain
 * Checks if a proof exists and returns its data
 * Used to verify authenticity of artwork
 */
export async function verifyProofOnChain(
  provider: ethers.Provider,
  combinedHash: string
): Promise<{
  exists: boolean;
  creator: string;
  timestamp: number;
  ipfsLink: string;
}> {
  try {
    const contract = getContract(provider);
    // Call smart contract to verify proof
    const result = await contract.verifyProof(combinedHash);
    
    return {
      exists: result[0],
      creator: result[1],
      timestamp: Number(result[2]),
      ipfsLink: result[3],
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw new Error('Failed to verify proof on blockchain');
  }
}

/**
 * Get blockchain provider
 * Returns JSON-RPC provider for connecting to Ethereum network
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}
