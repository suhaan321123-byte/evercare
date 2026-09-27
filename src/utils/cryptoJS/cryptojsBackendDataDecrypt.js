import CryptoJS from "crypto-js";

const secretKey =
  process.env.NEXT_PUBLIC_DECODE_JSONWEBTOKEN_BACKEND_RESPONSE_DATA_SECRET_KEY; // Same key as backend

export const backendResponseDataDecrypt = (encryptedText) => {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);
  const key = CryptoJS.enc.Utf8.parse(secretKey);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decryptedText);
};
