export const ProofOfArtABI = [
  {
    inputs: [
      { internalType: 'string', name: '_promptHash', type: 'string' },
      { internalType: 'string', name: '_outputHash', type: 'string' },
      { internalType: 'string', name: '_combinedHash', type: 'string' },
      { internalType: 'string', name: '_ipfsLink', type: 'string' },
    ],
    name: 'registerProof',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '_combinedHash', type: 'string' }],
    name: 'verifyProof',
    outputs: [
      { internalType: 'bool', name: 'exists', type: 'bool' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'string', name: 'ipfsLink', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: '', type: 'string' }],
    name: 'proofs',
    outputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'promptHash', type: 'string' },
      { internalType: 'string', name: 'outputHash', type: 'string' },
      { internalType: 'string', name: 'combinedHash', type: 'string' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'string', name: 'ipfsLink', type: 'string' },
      { internalType: 'bool', name: 'exists', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
