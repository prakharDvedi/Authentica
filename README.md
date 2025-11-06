# Authentica - Verifiable Generative AI Framework

A blockchain-based system for proving authorship and originality of AI-generated content. This system cryptographically links creators, their prompts, AI-generated outputs, and timestamps, storing them immutably on the blockchain.

## 🎯 Problem Statement

Generative AI (ChatGPT, Midjourney, DALL·E, etc.) allows anyone to create digital art instantly, but there's no reliable way to prove:
- Who created a specific AI output
- Which prompt they used
- When it was created

This project solves this by creating a **verifiable, tamper-proof proof of authorship** stored on blockchain.

## ✨ Features

- **🔐 Cryptographic Proof**: SHA-256 hashing links prompt, output, creator, and timestamp
- **⛓️ Blockchain Storage**: Immutable records on Ethereum/Polygon
- **🌐 Decentralized Storage**: IPFS for artwork and metadata storage
- **📜 Verifiable Certificates**: Downloadable proof certificates with QR codes
- **🔍 Public Verification**: Anyone can verify artwork authenticity
- **💼 Web3 Integration**: WalletConnect/RainbowKit for seamless wallet connection

## 🏗️ Architecture

```
User → Prompt Capture → AI Generator → Hashing Engine → Blockchain Record
                                   ↘
                                    ↘
                            Proof Certificate / Verifier UI
```

### Components

1. **Smart Contract** (`contracts/ProofOfArt.sol`): Stores proof hashes on blockchain
2. **Backend API** (`app/api/`): Handles AI generation, hashing, IPFS upload
3. **Frontend** (`app/`): React/Next.js UI for creation and verification
4. **Services** (`lib/`):
   - `crypto.ts`: Hashing functions
   - `ai.ts`: AI generation (OpenAI, Stability AI)
   - `ipfs.ts`: IPFS upload and retrieval
   - `blockchain.ts`: Smart contract interactions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask or compatible Web3 wallet
- API keys:
  - OpenAI API key (for DALL-E image generation)
  - IPFS API access (or use public gateway)
  - WalletConnect Project ID (for wallet connection)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
# or
yarn install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Deployed smart contract address
- `NEXT_PUBLIC_RPC_URL`: RPC URL for blockchain (e.g., Sepolia testnet)
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: WalletConnect project ID
- `IPFS_API_URL`: IPFS API endpoint (optional, uses public gateway by default)

3. **Deploy Smart Contract:**

```bash
# Compile contract
npm run compile-contract

# Deploy to testnet (configure in hardhat.config.ts)
npm run deploy-contract
```

Update `.env` with the deployed contract address.

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Creating Art with Proof

1. **Connect Wallet**: Click "Connect Wallet" and approve connection
2. **Enter Prompt**: Type your creative prompt
3. **Generate**: Click "Generate & Create Proof"
4. **View Certificate**: After generation and blockchain registration, view/download your proof certificate

### Verifying Art

1. **Navigate to Verify**: Go to `/verify` page
2. **Enter Hash**: Paste the combined hash from a certificate
3. **Verify**: Click "Verify" to check blockchain records
4. **View Results**: See creator, timestamp, and IPFS link

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Web3** | Wagmi, RainbowKit, ethers.js |
| **Blockchain** | Solidity, Hardhat, Ethereum/Polygon |
| **Storage** | IPFS (via ipfs-http-client) |
| **AI** | OpenAI API, Stability AI |
| **Hashing** | SHA-256 (Node.js crypto) |

## 📁 Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── generate/      # AI generation endpoint
│   │   └── verify/        # Verification endpoint
│   ├── create/           # Create art page
│   ├── verify/           # Verify art page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx     # Web3 providers
├── contracts/            # Solidity smart contracts
│   └── ProofOfArt.sol    # Main contract
├── lib/                  # Utility libraries
│   ├── ai.ts            # AI generation
│   ├── blockchain.ts    # Smart contract interaction
│   ├── crypto.ts        # Hashing functions
│   └── ipfs.ts          # IPFS operations
├── scripts/             # Deployment scripts
└── public/              # Static assets
```

## 🔐 Security Considerations

- **Private Keys**: Never commit private keys or `.env` files
- **API Keys**: Use environment variables for all sensitive data
- **Smart Contract**: Audit contracts before mainnet deployment
- **IPFS**: Consider using Pinata or Infura for reliable IPFS access
- **Rate Limiting**: Implement rate limiting for production API endpoints

## 🎯 Evaluation Criteria

This project addresses:

- ✅ **Innovation**: Unique cryptographic linking of AI outputs to creators
- ✅ **Technical Implementation**: Blockchain, hashing, decentralized storage
- ✅ **Feasibility**: User-friendly workflow with Web3 integration
- ✅ **Impact**: Protects digital artists and ensures fair attribution
- ✅ **Scalability**: Extensible to text, video, music generation
- ✅ **Presentation**: Complete end-to-end demo with verification

## 🚧 Future Enhancements

- Multi-modal support (music, video, text)
- AI authenticity watermarking (embed hash in pixel data)
- NFT marketplace integration for verified AI art
- Proof-of-Human attestation with privacy-preserving biometrics
- AI plagiarism checker using hash-matching
- Batch proof generation
- Creator dashboard with analytics

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a hackathon project. Feel free to fork and extend!

## 📧 Contact

Built for Web3 Hackathon - Authentica Challenge

---

**Note**: This is a demonstration project. For production use, ensure proper security audits, rate limiting, and error handling.





