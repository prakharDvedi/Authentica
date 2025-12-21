"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-cream-50 to-green-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-stone-800 mb-4">
            Verifiable Generative AI Framework
          </h1>
          <p className="text-xl text-stone-700 mb-8 max-w-3xl mx-auto">
            Prove your AI-generated artwork&apos;s authorship and originality
            with blockchain-backed cryptographic proof. Your creativity,
            permanently verified.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/create"
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
            >
              Create Art
            </Link>
            <Link
              href="/verify"
              className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-lg shadow-green-400/30"
            >
              Verify Art
            </Link>
          </div>
        </div>

        <div className="bg-cream-100/80 rounded-xl shadow-lg p-8 border border-green-200/50 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-center mb-8 text-stone-800">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
                <span className="text-2xl font-bold text-green-700">1</span>
              </div>
              <h4 className="font-semibold mb-2 text-stone-800">
                Connect Wallet
              </h4>
              <p className="text-sm text-stone-700">Link your Web3 wallet</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
                <span className="text-2xl font-bold text-green-700">2</span>
              </div>
              <h4 className="font-semibold mb-2 text-stone-800">Create Art</h4>
              <p className="text-sm text-stone-700">Enter your prompt</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
                <span className="text-2xl font-bold text-green-700">3</span>
              </div>
              <h4 className="font-semibold mb-2 text-stone-800">
                Generate Proof
              </h4>
              <p className="text-sm text-stone-700">
                System creates cryptographic hash and stores on blockchain
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-300">
                <span className="text-2xl font-bold text-green-700">4</span>
              </div>
              <h4 className="font-semibold mb-2 text-stone-800">
                Get Certificate
              </h4>
              <p className="text-sm text-stone-700">
                Receive verifiable certificate of your artwork&apos;s
                authenticity
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
