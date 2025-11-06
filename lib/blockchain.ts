import { ethers } from 'ethers';
import ProofOfArtArtifact from '../artifacts/contracts/ProofOfArt.sol/ProofOfArt.json';
import { ProofOfArtABI } from './contract-abi';

function getContractAddress(): string {
  if (typeof window !== 'undefined') {
    return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string) || '';
  }
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contractAddress = getContractAddress();
  const abi = (ProofOfArtArtifact as any).abi || ProofOfArtABI;
  return new ethers.Contract(contractAddress, abi, signerOrProvider);
}

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
    
    const code = await signer.provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error(`No contract found at address ${contractAddress}. Please deploy the contract first.`);
    }

    const tx = await contract.registerProof(
      proofData.promptHash,
      proofData.outputHash,
      proofData.combinedHash,
      proofData.ipfsLink
    );

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

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}
