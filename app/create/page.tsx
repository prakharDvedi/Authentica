"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWalletClient,
  useChainId,
  useSwitchNetwork,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { registerProofOnChain } from "@/lib/blockchain";
import { BrowserProvider } from "ethers";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import CameraCapture from "@/components/CameraCapture";
import TransparencyCard from "@/components/TransparencyCard";
import { generatePDFCertificate } from "@/lib/certificate";

export default function CreatePage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchNetwork } = useSwitchNetwork();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<"image" | "music">("image");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [proof, setProof] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [faceHash, setFaceHash] = useState<string | null>(null);
  const [faceTimestamp, setFaceTimestamp] = useState<number | null>(null);
  const [transparencyData, setTransparencyData] = useState<any>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !isConnected || !address) {
      alert("Please connect your wallet and enter a prompt");
      return;
    }

    setLoading(true);
    setGeneratedImage(null);
    setGeneratedAudio(null);
    setProof(null);
    setCertificate(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          userAddress: address,
          type: contentType,
          faceHash: faceHash || undefined,
          faceTimestamp: faceTimestamp || undefined,
        }),
      });

      const responseContentType = response.headers.get("content-type");
      if (
        !responseContentType ||
        !responseContentType.includes("application/json")
      ) {
        const text = await response.text();
        throw new Error(
          `API returned non-JSON response: ${text.substring(0, 200)}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Set generated content based on type
      if (contentType === "image") {
        setGeneratedImage(`data:image/png;base64,${data.proof.outputBuffer}`);
      } else if (contentType === "music") {
        // BeatOven returns MP3, dummy audio returns WAV
        const audioType =
          data.proof.transparency?.provider === "beatoven"
            ? "audio/mpeg"
            : "audio/wav";
        setGeneratedAudio(
          `data:${audioType};base64,${data.proof.outputBuffer}`
        );
      }

      setProof(data.proof);
      setTransparencyData(data.proof.transparency || null);

      let txHash: string | null = null;

      // delay for wallet to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // check env variables
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      console.log("transaction debug:", {
        walletClient: !!walletClient,
        walletClientType: walletClient ? typeof walletClient : "null",
        isConnected,
        address,
        chainId,
        contractAddress: contractAddress || "not set",
        contractAddressLength: contractAddress?.length || 0,
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ? "set" : "not set",
      });

      if (!contractAddress || contractAddress === "") {
        alert("contract address not set");
        throw new Error("contract address not set");
      }

      if (!isConnected || !address) {
        console.error("wallet not connected");
        alert("wallet not connected");
      } else if (!walletClient) {
        console.error("wallet client not available");
        console.error(
          "this might be a timing issue. try waiting a moment and generating again."
        );
        alert("wallet client not available");
      } else {
        try {
          if (chainId !== 11155111) {
            if (switchNetwork) {
              try {
                console.log("attempting to switch to sepolia network...");
                switchNetwork(11155111);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                if (chainId !== 11155111) {
                  throw new Error(
                    "network switch failed. please switch to sepolia testnet manually in metamask."
                  );
                }
              } catch (switchError: any) {
                throw new Error(
                  `failed to switch to sepolia network. please switch manually in metamask:\n\n1. open metamask\n2. click network dropdown\n3. select "sepolia"\n4. try again`
                );
              }
            } else {
              throw new Error(
                `wrong network! please switch to sepolia testnet (chain id: 11155111). current network chain id: ${chainId}. open metamask and switch to sepolia testnet.`
              );
            }
          }

          const provider = new BrowserProvider(walletClient as any);
          const signer = await provider.getSigner(address);

          const network = await provider.getNetwork();
          console.log(
            "connected to network:",
            network.name,
            "chain id:",
            network.chainId.toString()
          );

          if (network.chainId !== 11155111n) {
            throw new Error(
              `network mismatch! wallet is on chain id ${network.chainId}, but contract is on sepolia (11155111). please switch to sepolia testnet in metamask and try again.`
            );
          }

          console.log("starting blockchain registration...");
          console.log(
            "contract address:",
            process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "not set"
          );
          console.log(
            "rpc url:",
            process.env.NEXT_PUBLIC_RPC_URL ? "set" : "not set"
          );

          txHash = await registerProofOnChain(signer, {
            promptHash: data.proof.promptHash,
            outputHash: data.proof.outputHash,
            combinedHash: data.proof.combinedHash,
            ipfsLink: data.proof.outputCid,
          });

          console.log("transaction successful! hash:", txHash);
        } catch (error: any) {
          console.error("blockchain registration error:", error);
          console.error("error details:", {
            message: error.message,
            code: error.code,
            data: error.data,
            chainId,
            contractAddress:
              process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "not set",
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "not set",
          });

          // Show err msg
          let errorMessage = "Failed to register proof on blockchain. ";

          if (error.message?.includes("contract address not set")) {
            errorMessage += "Please set contract address.";
          } else if (
            error.message?.includes("network") ||
            error.message?.includes("chain id")
          ) {
            errorMessage =
              error.message || "Please switch to sepolia testnet in metamask.";
          } else if (error.message?.includes("No contract found")) {
            errorMessage +=
              "contract not deployed. please deploy the contract first.";
          } else if (
            error.code === "ACTION_REJECTED" ||
            error.message?.includes("rejected")
          ) {
            errorMessage = "transaction was rejected. please try again.";
          } else {
            errorMessage += error.message || "Unknown error occurred.";
          }

          alert(errorMessage);
          console.warn("Blockchain registration failed:", error.message);
        }
      }

      // Log final status
      if (!txHash) {
        console.warn("transaction hash is null - transaction was not sent");
      }

      const cert = {
        creator: address,
        prompt,
        promptHash: data.proof.promptHash,
        outputHash: data.proof.outputHash,
        combinedHash: data.proof.combinedHash,
        timestamp: new Date(data.proof.timestamp).toISOString(),
        ipfsLink: data.proof.outputCid,
        metadataCid: data.proof.metadataCid,
        txHash: txHash || "not-registered",
        verificationUrl: `${window.location.origin}/verify?hash=${data.proof.combinedHash}`,
        faceHash: data.proof.faceHash || null,
        faceVerified: !!data.proof.faceHash,
        transparency: data.proof.transparency || null,
        encrypted: true,
        type: contentType,
      };

      setCertificate(cert);

      // reset decrypted content when new certificate is created
      setDecryptedContent(null);
    } catch (error: any) {
      console.error("generation error:", error);
      alert("failed to generate: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-cream-50 to-green-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-stone-800">
            Create Verifiable AI Art
          </h1>

          {!mounted ? (
            <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 text-center border border-green-200/50 backdrop-blur-sm">
              <p className="text-lg text-stone-700">Loading...</p>
            </div>
          ) : !isConnected ? (
            <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 text-center border border-green-200/50 backdrop-blur-sm">
              <p className="text-lg text-stone-700 mb-4">
                Connect your wallet to get started
              </p>
              <ConnectButton />
            </div>
          ) : (
            <>
              <div className="bg-cream-100/80 rounded-xl shadow-lg p-6 mb-6 border border-green-200/50 backdrop-blur-sm">
                {/* Content Type Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-stone-800 mb-2">
                    Content Type
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setContentType("image");
                        setGeneratedImage(null);
                        setGeneratedAudio(null);
                        setProof(null);
                        setCertificate(null);
                      }}
                      className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        contentType === "image"
                          ? "bg-green-600 text-white shadow-md scale-105"
                          : "bg-white/80 text-stone-700 hover:bg-green-50 border border-green-300"
                      }`}
                    >
                      🖼️ Image
                    </button>
                    {/* <button
                      type="button"
                      onClick={() => {
                        setContentType("music");
                        setGeneratedImage(null);
                        setGeneratedAudio(null);
                        setProof(null);
                        setCertificate(null);
                      }}
                      className={`px-6 py-3 rounded-lg font-medium transition-all ${
                        contentType === "music"
                          ? "bg-green-600 text-white shadow-md scale-105"
                          : "bg-white/80 text-stone-700 hover:bg-green-50 border border-green-300"
                      }`}
                    >
                      Music
                    </button> */}
                  </div>
                </div>

                <label className="block text-sm font-medium text-stone-800 mb-2">
                  Enter your prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    contentType === "image"
                      ? "A futuristic cityscape at sunset with flying cars..."
                      : "Upbeat electronic dance music with synthesizers and drums, 120 BPM..."
                  }
                  className="w-full px-4 py-3 bg-white/80 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-stone-800 placeholder-stone-500"
                  rows={4}
                />

                <div className="mt-4">
                  <CameraCapture
                    onCapture={(hash, timestamp) => {
                      setFaceHash(hash);
                      setFaceTimestamp(timestamp);
                    }}
                    onError={(error) => {
                      console.error("camera error:", error);
                    }}
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? contentType === "image"
                      ? "Generating Image..."
                      : "Generating Music..."
                    : contentType === "image"
                    ? "Generate Image & Create Proof"
                    : "Generate Music & Create Proof"}
                </button>
              </div>

              {(generatedImage || generatedAudio) && (
                <div className="space-y-6 mb-6">
                  <div className="bg-cream-100/80 rounded-xl shadow-lg p-6 border border-green-200/50 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold mb-4 text-stone-800">
                      {contentType === "image"
                        ? "Generated Artwork"
                        : "Generated Music"}
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        {contentType === "image" && generatedImage && (
                          <img
                            src={generatedImage}
                            alt="Generated artwork"
                            className="w-full rounded-lg mb-4"
                          />
                        )}
                        {contentType === "music" && generatedAudio && (
                          <div className="mb-4">
                            <audio
                              controls
                              src={generatedAudio}
                              className="w-full rounded-lg"
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        {proof && (
                          <div className="bg-white/80 p-4 rounded-lg border border-green-200/50">
                            <p className="text-sm text-stone-700">
                              <strong className="text-stone-800">
                                Combined Hash:
                              </strong>{" "}
                              <code className="text-xs text-green-700 font-mono">
                                {proof.combinedHash}
                              </code>
                            </p>
                          </div>
                        )}
                      </div>

                      {transparencyData && (
                        <div>
                          <TransparencyCard
                            transparency={transparencyData}
                            prompt={prompt}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {certificate && (
                <div className="bg-gradient-to-br from-cream-100/90 to-green-50/90 rounded-xl shadow-lg p-8 border-2 border-green-300/50 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <h2 className="text-3xl font-bold text-center text-stone-800">
                      Authentica Certificate
                    </h2>
                    {certificate.faceVerified && (
                      <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full border border-green-300">
                        <span className="text-lg"></span>
                        <span className="text-sm font-semibold text-green-800">
                          Face Verified
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Creator
                      </h3>
                      <p className="text-sm font-mono bg-white/80 p-2 rounded text-stone-700 border border-green-200/50">
                        {certificate.creator}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Timestamp
                      </h3>
                      <p className="text-sm bg-white/80 p-2 rounded text-stone-700 border border-green-200/50">
                        {new Date(certificate.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Prompt
                      </h3>
                      <p className="text-sm bg-white/80 p-2 rounded text-stone-700 border border-green-200/50">
                        {certificate.prompt}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Combined Hash
                      </h3>
                      <p className="text-xs font-mono bg-white/80 p-2 rounded break-all text-green-700 border border-green-200/50">
                        {certificate.combinedHash}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Transaction Hash
                      </h3>
                      <p className="text-xs font-mono bg-white/80 p-2 rounded break-all text-green-600 border border-green-200/50">
                        {certificate.txHash}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        IPFS Content ID (CID)
                      </h3>
                      {/* STRICT ACCESS: Only show CID to creator, and only as copy button (not clickable link) */}
                      {address &&
                      isConnected &&
                      address.toLowerCase() ===
                        certificate.creator?.toLowerCase() ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-mono bg-white/80 p-2 rounded break-all text-stone-700 border border-green-200/50 flex-1">
                              {certificate.ipfsLink}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  certificate.ipfsLink
                                );
                                alert(
                                  "CID copied to clipboard! Use this in your Pinata dashboard."
                                );
                              }}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                              title="Copy CID to clipboard"
                            >
                              Copy CID
                            </button>
                          </div>
                          <p className="text-xs text-green-600 mt-1 font-semibold">
                            Encrypted - Only you (creator) can decrypt this
                            content
                          </p>
                          <p className="text-xs text-stone-600 mt-1">
                            <strong>Private CID:</strong> Do NOT share this CID.
                            Content is encrypted and only accessible through
                            this app with your wallet.
                          </p>
                          <p className="text-xs text-amber-600 mt-2 font-medium">
                            To view content: Click "Decrypt & View" below.
                            Decryption happens securely on our server using your
                            wallet.
                          </p>
                          {!decryptedContent && (
                            <button
                              onClick={async () => {
                                if (!address || !certificate.ipfsLink) {
                                  alert("Wallet not connected or CID missing");
                                  return;
                                }

                                setDecrypting(true);
                                try {
                                  const response = await fetch("/api/decrypt", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      ipfsCid: certificate.ipfsLink,
                                      userAddress: address,
                                    }),
                                  });

                                  const data = await response.json();

                                  if (!data.success) {
                                    throw new Error(
                                      data.error || "Decryption failed"
                                    );
                                  }

                                  // Set decrypted content as data URL
                                  const contentType =
                                    certificate.type === "image"
                                      ? "image/png"
                                      : "audio/mpeg";
                                  setDecryptedContent(
                                    `data:${contentType};base64,${data.decryptedContent}`
                                  );
                                } catch (error: any) {
                                  console.error("decryption error:", error);
                                  alert(`Failed to decrypt: ${error.message}`);
                                } finally {
                                  setDecrypting(false);
                                }
                              }}
                              disabled={decrypting || !isConnected}
                              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
                            >
                              {decrypting
                                ? "Decrypting..."
                                : "Decrypt & View Content Securely"}
                            </button>
                          )}
                          {decryptedContent && (
                            <div className="mt-4">
                              <p className="text-xs text-green-600 mb-2 font-semibold">
                                Content decrypted successfully
                              </p>
                              {certificate.type === "image" ? (
                                <img
                                  src={decryptedContent}
                                  alt="Decrypted content"
                                  className="w-full rounded-lg border border-green-300"
                                />
                              ) : (
                                <audio
                                  controls
                                  src={decryptedContent}
                                  className="w-full rounded-lg"
                                >
                                  Your browser does not support the audio
                                  element.
                                </audio>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-stone-500 italic font-semibold">
                            IPFS CID Hidden - Wallet Access Required
                          </p>
                          <p className="text-xs text-stone-600 mt-1">
                            {!isConnected
                              ? "Connect your wallet to view the IPFS CID. Only the creator can access encrypted content."
                              : address?.toLowerCase() !==
                                certificate.creator?.toLowerCase()
                              ? "This content was created by a different wallet. IPFS CID is hidden for security."
                              : "IPFS CID is encrypted and only accessible by the creator."}
                          </p>
                          {!isConnected && (
                            <p className="text-xs text-amber-600 mt-2 font-medium">
                              Connect the creator's wallet to decrypt and view
                              content
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-800 mb-2">
                        Verification URL
                      </h3>
                      <a
                        href={certificate.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:text-green-800 hover:underline break-all"
                      >
                        {certificate.verificationUrl}
                      </a>
                    </div>

                    {certificate.faceHash && (
                      <div>
                        <h3 className="font-semibold text-stone-800 mb-2">
                          Face Verification Hash
                        </h3>
                        <p className="text-xs font-mono bg-white/80 p-2 rounded break-all text-green-700 border border-green-200/50">
                          {certificate.faceHash}
                        </p>
                        <p className="text-xs text-stone-600 mt-1">
                          Only the hash is stored, not your image
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG
                        value={certificate.verificationUrl}
                        size={200}
                      />
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <button
                      onClick={async () => {
                        await generatePDFCertificate(certificate);
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 font-semibold"
                    >
                      📄 Download PDF Certificate
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
