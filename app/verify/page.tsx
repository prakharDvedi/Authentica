'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyProofOnChain, getProvider } from '@/lib/blockchain';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

function VerifyContent() {
  const searchParams = useSearchParams();
  const hashFromUrl = searchParams.get('hash');
  
  const [hash, setHash] = useState(hashFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hashFromUrl) {
      handleVerify(hashFromUrl);
    }
  }, [hashFromUrl]);

  const handleVerify = async (hashToVerify?: string) => {
    const hashValue = hashToVerify || hash;
    
    if (!hashValue.trim()) {
      setError('Please enter a hash to verify');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const provider = getProvider();
      const result = await verifyProofOnChain(provider, hashValue);

      if (result.exists) {
        setVerificationResult(result);
      } else {
        setError('Proof not found on blockchain. This artwork may not be registered.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Failed to verify proof');
    } finally {
      setLoading(false);
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
            <Link
              href="/create"
              className="text-green-700 hover:text-green-800 font-medium transition-colors"
            >
              Create Art
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-center mb-8 text-stone-800">
          Verify Artwork Authenticity
        </h1>

        <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 mb-6 border border-green-200/50 backdrop-blur-sm">
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
              onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
            />
            <button
              onClick={() => handleVerify()}
              disabled={loading || !hash.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-500/30"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          <p className="text-sm text-stone-600 mt-2">
            Paste the combined hash from an Authentica certificate to verify
            authenticity
          </p>
        </div>

        {error && (
          <div className="bg-red-100/80 border border-red-300/50 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <h3 className="font-semibold text-red-700">Verification Failed</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {verificationResult && (
          <div className="bg-green-100/80 border-2 border-green-300/50 rounded-xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">✅</span>
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
                <h3 className="font-semibold text-stone-800 mb-2">Creator Address</h3>
                <p className="font-mono text-sm bg-white/80 p-2 rounded break-all text-stone-700 border border-green-200/50">
                  {verificationResult.creator}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-2">
                  Registration Timestamp
                </h3>
                <p className="text-sm bg-white/80 p-2 rounded text-stone-700 border border-green-200/50">
                  {new Date(verificationResult.timestamp * 1000).toLocaleString()}
                  <span className="text-stone-600 ml-2">
                    ({formatDistanceToNow(
                      new Date(verificationResult.timestamp * 1000)
                    )}{' '}
                    ago)
                  </span>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-2">IPFS Link</h3>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${verificationResult.ipfsLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-800 hover:underline text-sm break-all"
                >
                  ipfs://{verificationResult.ipfsLink}
                </a>
                <p className="text-xs text-stone-600 mt-1">
                  (Using Pinata gateway - faster and more reliable)
                </p>
              </div>

              <div className="bg-green-50/80 p-4 rounded-lg border border-green-200/50">
                <p className="text-sm text-green-800">
                  <strong className="text-green-900">Note:</strong> This proof is permanently stored on the
                  blockchain and cannot be altered or forged. The artwork file is
                  stored on IPFS for decentralized access.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-cream-100/80 rounded-xl shadow-lg p-6 mt-6 border border-green-200/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold mb-4 text-stone-800">How Verification Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-stone-700">
            <li>
              Enter the combined hash from an Authentica certificate
            </li>
            <li>
              The system queries the blockchain smart contract to verify the hash
              exists
            </li>
            <li>
              If found, the proof details (creator, timestamp, IPFS link) are
              displayed
            </li>
            <li>
              The blockchain&apos;s immutability ensures the proof cannot be tampered
              with
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-cream-50 to-green-50">
        <div className="text-xl text-stone-700">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
