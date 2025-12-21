import { ethers } from "ethers";
import { ProofOfArtABI } from "./contract-abi";

function getContractAddress(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string) || "";
  }
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

export function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const contractAddress = getContractAddress();
  const abi = ProofOfArtABI;
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

    if (!contractAddress || contractAddress === "") {
      throw new Error("no contact address");
    }

    const contract = getContract(signer);

    if (!signer.provider) {
      throw new Error("no provider");
    }

    const signerAddress = await signer.getAddress();
    if (!signerAddress) {
      throw new Error("no signer address");
    }
    console.log("signer address:", signerAddress);

    const code = await signer.provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error(`no contract found at address ${contractAddress}`);
    }
    console.log("contract verified at address:", contractAddress);

    console.log("preparing transaction...");
    console.log("contract address:", contractAddress);
    console.log("function: registerproof");
    console.log("parameters:", {
      promptHash: proofData.promptHash.substring(0, 20) + "...",
      outputHash: proofData.outputHash.substring(0, 20) + "...",
      combinedHash: proofData.combinedHash.substring(0, 20) + "...",
      ipfsLink: proofData.ipfsLink.substring(0, 20) + "...",
    });

    let tx;
    try {
      const gasEstimate = await contract.registerProof.estimateGas(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink
      );
      console.log("gas estimated:", gasEstimate.toString());

      tx = await contract.registerProof(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink,
        {
          gasLimit: gasEstimate + gasEstimate / 10n,
        }
      );
    } catch (estimateError: any) {
      console.warn(
        "gas estimation failed, sending transaction without gas limit (metamask will estimate):",
        estimateError.message
      );

      tx = await contract.registerProof(
        proofData.promptHash,
        proofData.outputHash,
        proofData.combinedHash,
        proofData.ipfsLink
      );
    }

    console.log("transaction sent! hash:", tx.hash);
    console.log("waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("transaction confirmed!");
    console.log("   block:", receipt.blockNumber);
    console.log("   gas used:", receipt.gasUsed.toString());
    console.log("   transaction hash:", receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error("blockchain registration error:", error);

    if (error.message) {
      throw new Error(
        `Failed to register proof on blockchain: ${error.message}`
      );
    }

    if (error.code === "CALL_EXCEPTION") {
      throw new Error("Contract call failed");
    }

    if (error.code === "INSUFFICIENT_FUNDS") {
      throw new Error("gareeb");
    }

    if (error.code === "ACTION_REJECTED") {
      throw new Error("rejected by user");
    }

    throw new Error(
      `failed to register proof on blockchain: ${
        error.message || "Unknown error"
      }`
    );
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
    const contractAddress = getContractAddress();

    if (!contractAddress || contractAddress === "") {
      throw new Error("no contract address");
    }

    console.log("verifying proof:", {
      combinedHash: combinedHash.substring(0, 20) + "...",
      contractAddress,
    });

    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error(`no contract found at address ${contractAddress}`);
    }
    console.log("contract found at address:", contractAddress);

    const contract = getContract(provider);

    console.log("calling verifyproof on contract...");
    const result = await contract.verifyProof(combinedHash);

    console.log("verification result:", {
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
    console.error("blockchain verification error:", error);

    if (error.message?.includes("Contract address not set")) {
      throw new Error("no contract address");
    }

    if (error.message?.includes("No contract found")) {
      throw new Error(`Contract not found at address`);
    }

    if (error.code === "CALL_EXCEPTION" || error.code === "BAD_DATA") {
      throw new Error(`Contract call failed`);
    }

    throw new Error(
      `failed to verify proof on blockchain: ${
        error.message || "Unknown error"
      }`
    );
  }
}

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}
