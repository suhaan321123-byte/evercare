import CryptoJS from 'crypto-js';

// Secret key (should be stored securely and not in the frontend code)
const secretKey = process.env.NEXT_PUBLIC_JSONWEBTOKEN_SECRET_KEY // Replace with a strong, random key

// Function to encrypt data
export const encryptData = (data) => {
  try {
    const payload = {
      ...data,
      timestamp: Date.now(), // Current timestamp in milliseconds
    };

    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(payload), secretKey).toString();

    // URL encode the encrypted data
    const encodedData = encodeURIComponent(encryptedData);
    return encodedData;
  } catch (error) {
    console.error("Error encrypting data:", error);
    throw new Error("Encryption failed");
  }
};

// Example usage:
// const formData = {
//   username: "john.doe",
//   password: "yourPassword123"
// };

// const encryptedData = encryptData(formData);

// // Append the encoded data to the URL
// const url = `http://localhost:3000/login/redirection?data=${encryptedData}`;
// console.log(url); // Check the URL for correctness



// Function to decrypt data
export const decryptData = async (encryptedData,  expirationTimeInMs = 864000000) => {   // 10 days = 864,000,000 milliseconds (240 hours)
  try {
    // Decode the URL-encoded data
    const decodedData = decodeURIComponent(encryptedData);

    // Decrypt the data
    const bytes = CryptoJS.AES.decrypt(decodedData, secretKey);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // Check if the data has expired
    const currentTime = Date.now();
    if (currentTime - decryptedData.timestamp > expirationTimeInMs) {
      // throw new Error("Data has expired");
      return null;
    }

    return decryptedData;
  } catch (error) {
    console.error("Error decrypting data:", error);
    // throw new Error("Decryption failed");
    return null;
  }
};

// Example: Retrieve the encrypted data from the URL
// const urlParams = new URLSearchParams(window.location.search);
// const encryptedDataFromUrl = urlParams.get('data');

// // Decrypt the data
// const decryptedData = decryptData(encryptedDataFromUrl);
// console.log(decryptedData);

// Function to generate a security token for chatWidget side .
export const generateSecurityToken = (customerId, phoneNumber) => {
  return window.btoa(`${customerId}:${phoneNumber}:${Date.now()}`);
};