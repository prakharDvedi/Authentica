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
 */
export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contractAddress = getContractAddress();
  const abi = ProofOfArtABI;
  return new ethers.Contract(contractAddress, abi, signerOrProvider);
}

/**
 * Register proof on blockchain
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
    
    if (!signer.provider) {
      throw new Error('Signer does not have a provider. Please connect to a network.');
    }
    
    const signerAddress = await signer.getAddress();
    if (!signerAddress) {
      throw new Error('Signer does not have an address. Cannot send transactions.');
    }
    console.log('Signer address:', signerAddress);
    
    const code = await signer.provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at address ${contractAddress}. Please deploy the contract first.`);
    }
    console.log('Contract verified at address:', contractAddress);

    console.log('Preparing transaction...');
    console.log('Contract address:', contractAddress);
    console.log('Function: registerProof');
    console.log('Parameters:', {
      promptHash: proofData.promptHash.substring(0, 20) + '...',
      outputHash: proofData.outputHash.substring(0, 20) + '...',
      combinedHash: proofData.combinedHash.substring(0, 20) + '...',
      ipfsLink: proofData.ipfsLink.substring(0, 20) + '...',
    });
    
    let tx;
    try {
      const gasEstimate = await contract.registerProof.estimateGas(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink
      );
      console.log('Gas estimated:', gasEstimate.toString());
      
      tx = await contract.registerProof(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink,
        {
          gasLimit: gasEstimate + (gasEstimate / 10n),
        }
      );
    } catch (estimateError: any) {
      console.warn('Gas estimation failed, sending transaction without gas limit (MetaMask will estimate):', estimateError.message);
      
      tx = await contract.registerProof(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink
      );
    }

    console.log('Transaction sent! Hash:', tx.hash);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log('Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   Transaction hash:', receipt.hash);
    
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
    const contractAddress = getContractAddress();
    
    if (!contractAddress || contractAddress === '') {
      throw new Error('Contract address not set. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file.');
    }
    
    console.log('Verifying proof:', {
      combinedHash: combinedHash.substring(0, 20) + '...',
      contractAddress,
    });
    
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at address ${contractAddress}. The contract may not be deployed or the address is incorrect.`);
    }
    console.log('Contract found at address:', contractAddress);
    
    const contract = getContract(provider);
    
    console.log('Calling verifyProof on contract...');
    const result = await contract.verifyProof(combinedHash);
    
    console.log('Verification result:', {
      exists: result[0],
      creator: result[1],
      timestamp: result[2].toString(),
      ipfsLink: result[3],
    });
    
    return {
      exists: result[0],
      creator: result[1],
      timestamp: Number(result[2]),
      ipfsLink: result[3],
    };
  } catch (error: any) {
    console.error('Blockchain verification error:', error);
    
    if (error.message?.includes('Contract address not set')) {
      throw new Error('Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local and restart the server.');
    }
    
    if (error.message?.includes('No contract found')) {
      throw new Error(`Contract not found at address. Please verify the contract is deployed and the address is correct.`);
    }
    
    if (error.code === 'CALL_EXCEPTION' || error.code === 'BAD_DATA') {
      throw new Error(`Contract call failed. This could mean:\n1. The proof was never registered on blockchain\n2. The contract address is incorrect\n3. The RPC URL is not working\n\nError: ${error.message || 'Unknown error'}`);
    }
    
    throw new Error(`Failed to verify proof on blockchain: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get blockchain provider
 * Returns JSON-RPC provider for connecting to Ethereum network
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}
