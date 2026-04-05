import pinataSDK from '@pinata/sdk';

const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

export const uploadToIPFS = async (file) => {
  const readableStreamForFile = file.stream ? file.stream() : require('fs').createReadStream(file.path);
  const options = {
    pinataMetadata: {
      name: file.name,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
  return result.IpfsHash;
};

export const getFromIPFS = async (hash) => {
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};