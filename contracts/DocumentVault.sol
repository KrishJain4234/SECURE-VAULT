// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVault {
    struct Document {
        string hash;
        address owner;
        uint256 timestamp;
        bool verified;
    }

    mapping(string => Document) public documents;
    mapping(address => string[]) public userDocuments;

    event DocumentStored(string hash, address owner, uint256 timestamp);
    event DocumentVerified(string hash, bool verified);

    function storeDocument(string memory _hash) public {
        require(bytes(_hash).length > 0, "Hash cannot be empty");
        require(documents[_hash].owner == address(0), "Document already exists");

        documents[_hash] = Document(_hash, msg.sender, block.timestamp, false);
        userDocuments[msg.sender].push(_hash);

        emit DocumentStored(_hash, msg.sender, block.timestamp);
    }

    function verifyDocument(string memory _hash) public view returns (bool) {
        return documents[_hash].verified;
    }

    function getDocument(string memory _hash) public view returns (string memory, address, uint256, bool) {
        Document memory doc = documents[_hash];
        return (doc.hash, doc.owner, doc.timestamp, doc.verified);
    }

    function getUserDocuments(address _user) public view returns (string[] memory) {
        return userDocuments[_user];
    }

    // Function to mark document as verified (only by owner or admin)
    function markVerified(string memory _hash) public {
        require(documents[_hash].owner == msg.sender, "Only owner can verify");
        documents[_hash].verified = true;
        emit DocumentVerified(_hash, true);
    }
}