// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofOfArt {
    struct ArtProof {
        address creator;
        string promptHash;
        string outputHash;
        string combinedHash;
        uint256 timestamp;
        string ipfsLink;
        bool exists;
    }

    mapping(string => ArtProof) public proofs;
    mapping(address => string[]) public creatorProofs;
    string[] public allProofHashes;

    event ProofRegistered(
        address indexed creator,
        string indexed combinedHash,
        string promptHash,
        string outputHash,
        uint256 timestamp,
        string ipfsLink
    );

    function registerProof(
        string memory _promptHash,
        string memory _outputHash,
        string memory _combinedHash,
        string memory _ipfsLink
    ) public {
        require(bytes(_combinedHash).length > 0, "Combined hash cannot be empty");
        require(!proofs[_combinedHash].exists, "Proof already exists");

        ArtProof memory newProof = ArtProof({
            creator: msg.sender,
            promptHash: _promptHash,
            outputHash: _outputHash,
            combinedHash: _combinedHash,
            timestamp: block.timestamp,
            ipfsLink: _ipfsLink,
            exists: true
        });

        proofs[_combinedHash] = newProof;
        creatorProofs[msg.sender].push(_combinedHash);
        allProofHashes.push(_combinedHash);

        emit ProofRegistered(
            msg.sender,
            _combinedHash,
            _promptHash,
            _outputHash,
            block.timestamp,
            _ipfsLink
        );
    }

    function verifyProof(string memory _combinedHash)
        public
        view
        returns (
            bool exists,
            address creator,
            uint256 timestamp,
            string memory ipfsLink
        )
    {
        ArtProof memory proof = proofs[_combinedHash];
        return (
            proof.exists,
            proof.creator,
            proof.timestamp,
            proof.ipfsLink
        );
    }

    function getCreatorProofs(address _creator)
        public
        view
        returns (string[] memory)
    {
        return creatorProofs[_creator];
    }

    function getTotalProofs() public view returns (uint256) {
        return allProofHashes.length;
    }

    function getProof(string memory _combinedHash)
        public
        view
        returns (ArtProof memory)
    {
        require(proofs[_combinedHash].exists, "Proof does not exist");
        return proofs[_combinedHash];
    }
}
