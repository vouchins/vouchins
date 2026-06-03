"use client";

import { SupabaseClient } from "@supabase/supabase-js";

// Helper: Convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert Base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a 256-bit AES-GCM key from User ID using PBKDF2 and a fixed salt
async function deriveKeyFromUserId(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const fixedSalt = encoder.encode("vouchins-static-e2ee-salt-12345");
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fixedSalt,
      iterations: 10000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Generate RSA-OAEP Key Pair (2048-bit modulus)
export async function generateKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export CryptoKey to JWK JSON String
export async function exportKeyToJwk(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
}

// Import CryptoKey from JWK JSON String
export async function importPrivateKeyFromJwk(jwkStr: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Encrypt Private Key JWK using derived AES-GCM key
export async function encryptPrivateKeyWithUserId(privateKey: CryptoKey, userId: string): Promise<string> {
  const jwkStr = await exportKeyToJwk(privateKey);
  const encoder = new TextEncoder();
  const jwkBytes = encoder.encode(jwkStr);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKeyFromUserId(userId);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    aesKey,
    jwkBytes
  );

  return JSON.stringify({
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer)
  });
}

// Decrypt Private Key JWK using derived AES-GCM key
export async function decryptPrivateKeyWithUserId(encryptedJson: string, userId: string): Promise<string> {
  const { ciphertext, iv } = JSON.parse(encryptedJson);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  const aesKey = await deriveKeyFromUserId(userId);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(ivBuffer)
    },
    aesKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}

// Silent E2EE Keys initialization
export async function initE2EEKeys(userId: string, supabase: SupabaseClient): Promise<string> {
  const cacheKey = `vouchins_e2ee_private_key_${userId}`;
  
  // 1. Query Supabase first to see if key record exists
  const { data, error } = await supabase
    .from("user_public_keys")
    .select("public_key, encrypted_private_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (data && !error && data.encrypted_private_key) {
    // Check if we have the private key cached locally
    const cachedJwk = localStorage.getItem(cacheKey);
    if (cachedJwk) {
      return cachedJwk;
    }

    try {
      // Decrypt private key from database and cache it
      const decryptedJwk = await decryptPrivateKeyWithUserId(data.encrypted_private_key, userId);
      localStorage.setItem(cacheKey, decryptedJwk);
      return decryptedJwk;
    } catch (err) {
      console.warn("Failed to decrypt stored private key, regenerating...", err);
      // Key format changed or corrupted, fall through to regenerate
    }
  }

  // 2. Generate new key pair
  const { publicKey, privateKey } = await generateKeyPair();
  const publicKeyJwk = await exportKeyToJwk(publicKey);
  const privateKeyJwk = await exportKeyToJwk(privateKey);
  
  const encryptedPrivateJwk = await encryptPrivateKeyWithUserId(privateKey, userId);

  // 3. Save to Supabase (upsert so it overwrites if there is a corrupted/cleared key)
  const { error: upsertError } = await supabase.from("user_public_keys").upsert({
    user_id: userId,
    public_key: publicKeyJwk,
    encrypted_private_key: encryptedPrivateJwk
  });

  if (upsertError) {
    throw new Error("Failed to save cryptographic keys to database: " + upsertError.message);
  }

  // 4. Cache locally
  localStorage.setItem(cacheKey, privateKeyJwk);
  return privateKeyJwk;
}

// Hybrid Encryption
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyJwkStr: string,
  senderPublicKeyJwkStr: string
): Promise<{
  encryptedContent: string;
  encryptedKeyReceiver: string;
  encryptedKeySender: string;
  iv: string;
}> {
  // 1. Generate random AES-GCM key (session key)
  const sessionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);

  // 2. Encrypt plaintext using the session key
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    plaintextBytes
  );

  // 3. Import RSA Public Keys
  const recipientPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(recipientPublicKeyJwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  const senderPublicKey = await window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(senderPublicKeyJwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  // 4. Encrypt session key with RSA keys
  const encryptedKeyReceiver = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawSessionKey
  );

  const encryptedKeySender = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawSessionKey
  );

  return {
    encryptedContent: arrayBufferToBase64(ciphertext),
    encryptedKeyReceiver: arrayBufferToBase64(encryptedKeyReceiver),
    encryptedKeySender: arrayBufferToBase64(encryptedKeySender),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt message
export async function decryptMessage(
  encryptedContentBase64: string,
  encryptedKeyBase64: string,
  privateKeyJwkStr: string,
  ivBase64: string
): Promise<string> {
  const privateKey = await importPrivateKeyFromJwk(privateKeyJwkStr);

  const encryptedContent = base64ToArrayBuffer(encryptedContentBase64);
  const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  // 1. Decrypt raw session key bytes
  const rawSessionKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKey
  );

  // 2. Import raw session key
  const sessionKey = await window.crypto.subtle.importKey(
    "raw",
    rawSessionKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 3. Decrypt message content
  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    sessionKey,
    encryptedContent
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBytes);
}
