import crypto from 'crypto';

export const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const signDocument = (data, privateKey) => {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  return sign.sign(privateKey, 'hex');
};

export const verifySignature = (data, signature, publicKey) => {
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  return verify.verify(publicKey, signature, 'hex');
};