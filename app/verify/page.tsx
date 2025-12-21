"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { verifyProofOnChain, getProvider } from "@/lib/blockchain";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import TransparencyCard from "@/components/TransparencyCard";

function VerifyContent() {
  const searchParams = useSearchParams();
  const hashFromUrl = searchParams.get("hash");
  const { address, isConnected } = useAccount();

  const [hash, setHash] = useState(hashFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [similarityResult, setSimilarityResult] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  useEffect(() => {
    if (hashFromUrl) {
      handleVerify(hashFromUrl);
    }
  }, [hashFromUrl]);

  const handleVerify = async (hashToVerify?: string) => {
    const hashValue = hashToVerify || hash;

    if (!hashValue.trim()) {
      setError("Please enter a hash to verify");
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);
    setSimilarityResult(null);

    try {
      console.log("starting verification for hash:", hashValue);
      console.log(
        "contract address:",
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "not set"
      );
      console.log(
        "rpc url:",
        process.env.NEXT_PUBLIC_RPC_URL ? "set" : "not set"
      );

      const provider = getProvider();
      const result = await verifyProofOnChain(provider, hashValue);

      if (result.exists) {
        console.log("proof verified!", result);
        setVerificationResult(result);
        // Try to fetch metadata from IPFS using the hash
        await fetchMetadataFromIpfs(hashValue);
      } else {
        console.warn("proof exists but exists flag is false");
        setError(
          "Proof not found on blockchain. This artwork may not be registered. The transaction may have failed or the hash is incorrect."
        );
      }
    } catch (error: any) {
      console.error("verification error:", error);
      console.error("error details:", {
        message: error.message,
        code: error.code,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "not set",
      });
      setError(error.message || "Failed to verify proof on blockchain");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setSimilarityResult(null);
    }
  };

  const handleDecryptContent = async () => {
    // Check basic requirements
    if (!verificationResult || !address) {
      setError(
        "Cannot decrypt: Missing verification result or wallet connection"
      );
      return;
    }

    // Check if user is the creator
    if (address.toLowerCase() !== verificationResult.creator?.toLowerCase()) {
      setError(
        "Only the creator can decrypt this content. Please connect with the creator's wallet."
      );
      return;
    }

    // Check if metadata is loaded, if not, try to fetch it
    let currentMetadata = metadata;
    if (!currentMetadata) {
      console.log("metadata not loaded, fetching...");
      await fetchMetadataFromIpfs(verificationResult.combinedHash || hash);
      // Wait a bit for metadata to load
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Re-read metadata state (it should be updated by now)
      // Note: We'll use the metadata from state, but if it's still null, we'll proceed anyway
    }

    // Check if content is encrypted (default to true if metadata not available)
    // All new content is encrypted by default
    const isEncrypted = currentMetadata?.encrypted !== false; // Default to true if not specified

    if (!isEncrypted && currentMetadata) {
      setError(
        "Content is not encrypted. You can access it directly from IPFS."
      );
      return;
    }

    setDecrypting(true);
    setError(null);

    try {
      const response = await fetch("/api/decrypt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ipfsCid: verificationResult.ipfsLink,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Decryption failed");
      }

      // Set decrypted content as data URL
      // Use metadata type if available, otherwise default to image
      const contentType =
        (metadata?.type || "image") === "image" ? "image/png" : "audio/mpeg";
      setDecryptedContent(
        `data:${contentType};base64,${data.decryptedContent}`
      );
    } catch (error: any) {
      console.error("decryption error:", error);
      setError(`Failed to decrypt content: ${error.message}`);
    } finally {
      setDecrypting(false);
    }
  };

  const handleCompareImages = async () => {
    if (!uploadedImage || !verificationResult) {
      setError("Please upload an image and verify a hash first");
      return;
    }

    setComparing(true);
    setError(null);
    setSimilarityResult(null);

    try {
      // Always use server-side comparison (includes steganography detection)
      // Client-side comparison doesn't include steganography check, so we skip it
      const formData = new FormData();
      formData.append("image", uploadedImage);
      formData.append(
        "originalImageUrl",
        `https://gateway.pinata.cloud/ipfs/${verificationResult.ipfsLink}`
      );

      // If we have embedding hash in metadata, include it
      if (verificationResult.clipEmbeddingHash) {
        formData.append(
          "originalEmbeddingHash",
          verificationResult.clipEmbeddingHash
        );
      }

      console.log(
        "sending image to server for comparison and steganography detection..."
      );
      const response = await fetch("/api/compare", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to compare images");
      }

      console.log("server response:", {
        similarity: data.similarity,
        verdict: data.verdict,
        steganography: data.steganography,
      });

      setSimilarityResult(data);
    } catch (error: any) {
      console.error("comparison error:", error);
      setError(error.message || "Failed to compare images");
    } finally {
      setComparing(false);
    }
  };

  const fetchMetadataFromIpfs = async (hashValue: string) => {
    setLoadingMetadata(true);
    try {
      // Fetch metadata using the API endpoint
      const response = await fetch(
        `/api/metadata?hash=${encodeURIComponent(hashValue)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.metadata) {
          setMetadata(data.metadata);
        }
      }
    } catch (error) {
      console.error("failed to fetch metadata:", error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-cream-50 to-green-50">
      <nav className="border-b border-green-200/50 bg-cream-100/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"
            >
              Authentica
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/create"
                className="text-green-700 hover:text-green-800 font-medium transition-colors"
              >
                Create Art
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-center mb-8 text-stone-800">
          Verify Artwork Authenticity
        </h1>

        {/* Wallet Connection Info */}
        <div className="bg-blue-50/80 rounded-xl shadow-lg p-6 mb-6 border border-blue-200/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-800 mb-1">
                Wallet Connection
              </h3>
              <p className="text-sm text-stone-600">
                {isConnected
                  ? `Connected: ${address?.substring(
                      0,
                      6
                    )}...${address?.substring(38)}`
                  : "Connect your wallet to decrypt and view encrypted content if you are the creator"}
              </p>
              {isConnected && verificationResult && (
                <p className="text-xs text-stone-500 mt-2">
                  {address?.toLowerCase() ===
                  verificationResult.creator?.toLowerCase()
                    ? "You are the creator - You can decrypt and view the content"
                    : "You can verify the proof, but only the creator can decrypt encrypted content"}
                </p>
              )}
            </div>
            {!isConnected && <ConnectButton />}
          </div>
        </div>

        <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 mb-6 border border-green-200/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 text-stone-800">
            Verify by Hash
          </h2>
          <label className="block text-sm font-medium text-stone-800 mb-2">
            Enter Combined Hash or Proof Hash
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Enter hash to verify..."
              className="flex-1 px-4 py-3 bg-white/80 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-stone-800 placeholder-stone-500"
              onKeyPress={(e) => e.key === "Enter" && handleVerify()}
            />
            <button
              onClick={() => handleVerify()}
              disabled={loading || !hash.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-500/30"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
          <p className="text-sm text-stone-600 mt-2">
            Paste the combined hash from an Authentica certificate to verify
            authenticity
          </p>
        </div>

        {verificationResult && (
          <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 mb-6 border border-green-200/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-stone-800">
              Tamper Detection
            </h2>
            <p className="text-sm text-stone-600 mb-4">
              Upload an image to check if it matches the original artwork or has
              been modified
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-800 mb-2">
                  Upload Image to Compare
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-stone-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                />
              </div>

              {imagePreview && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-800 mb-2">
                      Original (from IPFS)
                    </h3>
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${verificationResult.ipfsLink}`}
                      alt="Original artwork"
                      className="w-full rounded-lg border-2 border-green-300"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-800 mb-2">
                      Uploaded Image
                    </h3>
                    <img
                      src={imagePreview}
                      alt="Uploaded image"
                      className="w-full rounded-lg border-2 border-blue-300"
                    />
                  </div>
                </div>
              )}

              {uploadedImage && (
                <button
                  onClick={handleCompareImages}
                  disabled={comparing || !verificationResult}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30"
                >
                  {comparing ? "Comparing Images..." : "Compare Images"}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100/80 border border-red-300/50 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl"></span>
              <div>
                <h3 className="font-semibold text-red-700">
                  Verification Failed
                </h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {verificationResult && (
          <div className="bg-green-100/80 border-2 border-green-300/50 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl"></span>
              <div>
                <h2 className="text-3xl font-bold text-green-700">
                  Verification Successful
                </h2>
                <p className="text-green-600">
                  This artwork is verified and registered on the blockchain
                </p>
              </div>
            </div>

            <div className="bg-cream-100/80 rounded-lg p-6 space-y-4 border border-green-200/50">
              <div>
                <h3 className="font-semibold text-stone-800 mb-2">
                  Creator Address
                </h3>
                <p className="font-mono text-sm bg-white/80 p-2 rounded break-all text-stone-700 border border-green-200/50">
                  {verificationResult.creator}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-2">
                  Registration Timestamp
                </h3>
                <p className="text-sm bg-white/80 p-2 rounded text-stone-700 border border-green-200/50">
                  {new Date(
                    verificationResult.timestamp * 1000
                  ).toLocaleString()}
                  <span className="text-stone-600 ml-2">
                    (
                    {formatDistanceToNow(
                      new Date(verificationResult.timestamp * 1000)
                    )}{" "}
                    ago)
                  </span>
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
                  verificationResult.creator?.toLowerCase() ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-mono bg-white/80 p-2 rounded break-all text-stone-700 border border-green-200/50 flex-1">
                        {verificationResult.ipfsLink}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            verificationResult.ipfsLink
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
                      Encrypted - Only you (creator) can decrypt this content
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      <strong>Private CID:</strong> Do NOT share this CID.
                      Content is encrypted and only accessible through this app
                      with your wallet.
                    </p>
                    {!decryptedContent && (
                      <button
                        onClick={handleDecryptContent}
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
                        {decryptedContent.startsWith("data:image/") ? (
                          <img
                            src={decryptedContent}
                            alt="Decrypted content"
                            className="w-full rounded-lg border border-green-300"
                          />
                        ) : decryptedContent.startsWith("data:audio/") ? (
                          <audio
                            controls
                            src={decryptedContent}
                            className="w-full rounded-lg"
                          >
                            Your browser does not support the audio element.
                          </audio>
                        ) : (metadata?.type || "image") === "image" ? (
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
                            Your browser does not support the audio element.
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
                          verificationResult.creator?.toLowerCase()
                        ? `This content was created by ${verificationResult.creator?.substring(
                            0,
                            6
                          )}...${verificationResult.creator?.substring(
                            38
                          )}. IPFS CID is hidden for security.`
                        : "IPFS CID is encrypted and only accessible by the creator."}
                    </p>
                    {!isConnected && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        Connect the creator's wallet to decrypt and view content
                      </p>
                    )}
                    {isConnected &&
                      address?.toLowerCase() !==
                        verificationResult.creator?.toLowerCase() && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Wallet mismatch - You are not the creator of this
                          content
                        </p>
                      )}
                  </>
                )}
              </div>

              <div className="bg-green-50/80 p-4 rounded-lg border border-green-200/50">
                <p className="text-sm text-green-800">
                  <strong className="text-green-900">Note:</strong> This proof
                  is permanently stored on the blockchain and cannot be altered
                  or forged. The artwork file is stored on IPFS for
                  decentralized access.
                </p>
              </div>
            </div>

            {metadata?.transparency && (
              <div className="mt-6">
                <TransparencyCard
                  transparency={metadata.transparency}
                  prompt={metadata.prompt || "N/A"}
                />
              </div>
            )}
          </div>
        )}

        {similarityResult && (
          <div className="bg-gradient-to-br from-blue-50/90 to-purple-50/90 rounded-xl shadow-lg p-8 border-2 border-blue-300/50 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-center mb-6 text-stone-800">
              Tamper Detection Result
            </h2>

            <div className="text-center mb-6">
              <div className="inline-block">
                <div
                  className="text-6xl font-bold mb-2"
                  style={{
                    color:
                      similarityResult.similarity >= 95
                        ? "#10b981"
                        : similarityResult.similarity >= 85
                        ? "#f59e0b"
                        : similarityResult.similarity >= 60
                        ? "#ef4444"
                        : "#6b7280",
                  }}
                >
                  {similarityResult.similarity.toFixed(1)}%
                </div>
                <div className="w-64 h-4 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${similarityResult.similarity}%`,
                      backgroundColor:
                        similarityResult.similarity >= 95
                          ? "#10b981"
                          : similarityResult.similarity >= 85
                          ? "#f59e0b"
                          : similarityResult.similarity >= 60
                          ? "#ef4444"
                          : "#6b7280",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/80 rounded-lg p-6 space-y-4 border border-blue-200/50">
              <div className="text-center">
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{
                    color:
                      similarityResult.verdict === "authentic"
                        ? "#10b981"
                        : similarityResult.verdict === "minor_edits"
                        ? "#f59e0b"
                        : similarityResult.verdict === "modified"
                        ? "#ef4444"
                        : "#6b7280",
                  }}
                >
                  {similarityResult.verdict === "authentic" && "Authentic"}
                  {similarityResult.verdict === "minor_edits" && "Minor Edits"}
                  {similarityResult.verdict === "modified" && "Modified"}
                  {similarityResult.verdict === "different" &&
                    "Different Artwork"}
                </h3>
                <p className="text-stone-700">{similarityResult.message}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">
                    Similarity Score
                  </h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {similarityResult.similarity.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">
                    Detection Method
                  </h4>
                  <p className="text-sm text-stone-700">
                    {similarityResult.method === "clip"
                      ? "CLIP Embeddings"
                      : similarityResult.method === "canvas"
                      ? "Canvas Pixel Analysis"
                      : "Hash Comparison"}
                  </p>
                </div>
              </div>

              {/* Steganography Warning */}
              {similarityResult.steganography?.suspicious && (
                <div className="bg-red-100/90 border-2 border-red-400 rounded-lg p-6 mt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl"></span>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-800 text-lg mb-2">
                        STEGANOGRAPHY DETECTED
                      </h4>
                      <p className="text-red-700 mb-2">
                        {similarityResult.steganography.details}
                      </p>
                      <div className="mt-3 space-y-1 text-sm">
                        <p className="text-red-600">
                          <strong>Detection Method:</strong>{" "}
                          {similarityResult.steganography.method}
                        </p>
                        <p className="text-red-600">
                          <strong>Confidence:</strong>{" "}
                          {similarityResult.steganography.confidence}%
                        </p>
                      </div>
                      <div className="mt-4 bg-red-50 p-3 rounded border border-red-200">
                        <p className="text-sm text-red-800">
                          <strong>Security Warning:</strong> Hidden data was
                          found embedded in this image's pixels. This may
                          indicate an attempt to bypass tamper detection or hide
                          malicious content. Proceed with caution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50/80 p-4 rounded-lg border border-blue-200/50 mt-4">
                <p className="text-sm text-blue-800">
                  <strong className="text-blue-900">How it works:</strong>{" "}
                  {similarityResult.method === "clip"
                    ? "Using AI vision embeddings (CLIP) to detect visual similarity even if the image was cropped, filtered, or color-adjusted."
                    : similarityResult.method === "canvas"
                    ? "Using canvas-based pixel analysis to compare actual image content. This method detects visual similarity even with minor edits like brush strokes or filters."
                    : similarityResult.method === "simple"
                    ? "Using basic image comparison (file size, byte comparison). For better accuracy with edited images, enable the Python CLIP service."
                    : "Using hash comparison. For better accuracy, enable the Python CLIP service."}
                </p>
                {similarityResult.warning && (
                  <p className="text-sm text-yellow-800 mt-2 bg-yellow-50 p-2 rounded">
                    {similarityResult.warning}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-cream-100/80 rounded-xl shadow-lg p-6 mt-6 border border-green-200/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 text-stone-800">
            How Verification Works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-stone-700">
            <li>Enter the combined hash from an Authentica certificate</li>
            <li>
              The system queries the blockchain smart contract to verify the
              hash exists
            </li>
            <li>
              If found, the proof details (creator, timestamp, IPFS link) are
              displayed
            </li>
            <li>
              The blockchain&apos;s immutability ensures the proof cannot be
              tampered with
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-cream-50 to-green-50">
          <div className="text-xl text-stone-700">Loading...</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
