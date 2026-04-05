export const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const truncateHash = (hash, length = 10) => {
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};

export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

export const generateRandomId = () => {
  return Math.random().toString(36).substr(2, 9);
};