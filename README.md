# Authentica - Verifiable Generative AI Framework

A blockchain-based system for proving authorship and originality of AI-generated content. This system cryptographically links creators, their prompts, AI-generated outputs, and timestamps, storing them immutably on the blockchain.

## 🎯 Problem Statement

Generative AI (ChatGPT, Midjourney, DALL·E, etc.) allows anyone to create digital art instantly, but there's no reliable way to prove:
- Who created a specific AI output
- Which prompt they used
- When it was created

This project solves this by creating a **verifiable, tamper-proof proof of authorship** stored on blockchain.

## ✨ Features

### Core Features
- **🔐 Cryptographic Proof**: SHA-256 hashing links prompt, output, creator, and timestamp
- **⛓️ Blockchain Storage**: Immutable records on Ethereum (Sepolia testnet)
- **🌐 Decentralized Storage**: IPFS for artwork and metadata storage
- **📜 Verifiable Certificates**: Downloadable PDF certificates with QR codes
- **🔍 Public Verification**: Anyone can verify artwork authenticity
- **💼 Web3 Integration**: WalletConnect/RainbowKit for seamless wallet connection

### Advanced Security Features
- **📸 Face Verification**: Optional webcam capture to prove human creator (hash-only, privacy-preserving)
- **🔍 Tamper Detection**: AI-powered image comparison to detect modifications
- **🛡️ Steganography Detection**: Detects hidden data embedded in pixels (LSB steganography)
- **🔐 IPFS Encryption**: Optional encryption for private content (creator-only decryption)
- **📊 AI Transparency Card**: Displays AI generation parameters (model, steps, seed, etc.)

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
   - `ai.ts`: AI generation (Stability AI)
   - `ipfs.ts`: IPFS upload and retrieval
   - `blockchain.ts`: Smart contract interactions
   - `steganography.ts`: Steganography detection
   - `imageComparison.ts`: Tamper detection
   - `certificate.ts`: PDF certificate generation

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- API keys:
  - Stability AI API key (for image generation)
  - Pinata JWT token (for IPFS storage)
  - WalletConnect Project ID (for wallet connection)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Create `.env.local` file:

```bash
# AI Generation
STABILITY_API_KEY=your-stability-api-key

# IPFS (Pinata)
IPFS_API_URL=https://api.pinata.cloud
IPFS_AUTH=your-pinata-jwt-token

# Blockchain
NEXT_PUBLIC_CONTRACT_ADDRESS=your-contract-address
NEXT_PUBLIC_RPC_URL=your-rpc-url
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id
```

3. **Deploy Smart Contract:**

```bash
# Compile contract
npm run compile-contract

# Deploy to testnet
npm run deploy-contract
```

Update `.env.local` with the deployed contract address.

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Creating Art with Proof

1. **Connect Wallet**: Click "Connect Wallet" and approve connection
2. **Enter Prompt**: Type your creative prompt
3. **Optional Face Verification**: Capture webcam photo to prove human creator
4. **Generate**: Click "Generate & Create Proof"
5. **View Certificate**: After generation and blockchain registration, view/download your proof certificate

### Verifying Art

1. **Navigate to Verify**: Go to `/verify` page
2. **Enter Hash**: Paste the combined hash from a certificate
3. **Verify**: Click "Verify" to check blockchain records
4. **Upload for Tamper Detection**: Upload an image to check if it matches the original
5. **View Results**: See creator, timestamp, IPFS link, and tamper detection results

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Web3** | Wagmi, RainbowKit, ethers.js |
| **Blockchain** | Solidity, Hardhat, Ethereum (Sepolia) |
| **Storage** | IPFS (Pinata) |
| **AI** | Stability AI API |
| **Security** | SHA-256, AES-256-GCM encryption, Steganography detection |

## 📁 Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── generate/      # AI generation endpoint
│   │   ├── compare/       # Tamper detection endpoint
│   │   ├── verify/        # Verification endpoint
│   │   └── metadata/      # Metadata retrieval
│   ├── create/           # Create art page
│   ├── verify/           # Verify art page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx     # Web3 providers
├── components/           # React components
│   ├── CameraCapture.tsx # Face verification
│   └── TransparencyCard.tsx # AI transparency display
├── contracts/            # Solidity smart contracts
│   └── ProofOfArt.sol    # Main contract
├── lib/                  # Utility libraries
│   ├── ai.ts            # AI generation
│   ├── blockchain.ts    # Smart contract interaction
│   ├── crypto.ts        # Hashing functions
│   ├── ipfs.ts          # IPFS operations
│   ├── steganography.ts # Steganography detection
│   ├── imageComparison.ts # Tamper detection
│   └── certificate.ts   # PDF generation
├── services/             # External services
│   ├── clip_service.py  # CLIP embedding service (optional)
│   └── README.md        # Service documentation
└── test_steganography.js # Testing utility
```

## 🔐 Security Features

### Tamper Detection
- **AI-Powered Comparison**: Uses CLIP embeddings for visual similarity detection
- **Multi-Metric Analysis**: Combines structure, pixel data, histogram, and size comparison
- **Fallback Methods**: Canvas-based pixel analysis when CLIP service unavailable

### Steganography Detection
- **LSB Pattern Analysis**: Detects bias in least significant bits
- **Statistical Tests**: Chi-square test, entropy analysis, RS analysis
- **Multi-Method Detection**: Combines 5 detection methods for accuracy

### Privacy Features
- **Face Verification**: Only stores hash, not actual images
- **IPFS Encryption**: Optional AES-256-GCM encryption for private content
- **Signature-Based Decryption**: Only creator can decrypt using wallet signature

## 📚 Documentation

- **Tamper Detection**: See `TAMPER_DETECTION_ANALYSIS.md` for accuracy analysis
- **Steganography Testing**: See `STEGANOGRAPHY_TESTING_GUIDE.md` for testing instructions
- **CLIP Service**: See `services/README.md` for optional AI service setup

## 🔐 Security Considerations

- **Private Keys**: Never commit private keys or `.env.local` files
- **API Keys**: Use environment variables for all sensitive data
- **Smart Contract**: Audit contracts before mainnet deployment
- **IPFS**: Consider using Pinata or Infura for reliable IPFS access
- **Rate Limiting**: Implement rate limiting for production API endpoints

## 🎯 Evaluation Criteria

This project addresses:

- ✅ **Innovation**: Unique cryptographic linking of AI outputs to creators
- ✅ **Technical Implementation**: Blockchain, hashing, decentralized storage, security features
- ✅ **Feasibility**: User-friendly workflow with Web3 integration
- ✅ **Impact**: Protects digital artists and ensures fair attribution
- ✅ **Scalability**: Extensible to text, video, music generation
- ✅ **Presentation**: Complete end-to-end demo with verification

## 🚧 Future Enhancements

- Multi-modal support (music, video, text)
- Enhanced steganography detection with machine learning
- NFT marketplace integration for verified AI art
- Batch proof generation
- Creator dashboard with analytics
- Improved tamper detection with perceptual hashing

## 📝 License

MIT License

## 🤝 Contributing

This is a hackathon project. Feel free to fork and extend!

---

**Note**: This is a demonstration project. For production use, ensure proper security audits, rate limiting, and error handling.
