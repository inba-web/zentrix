const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Target directory for secure vault
const baseDir = process.env.ZENTRIX_USER_DATA || path.join(require('os').homedir(), '.local', 'share', 'zentrix');
const vaultDir = path.join(baseDir, 'config');
const vaultPath = path.join(vaultDir, 'vault.enc');

if (!fs.existsSync(vaultDir)) {
  fs.mkdirSync(vaultDir, { recursive: true });
}

// Fixed local system key derived from machine identifier / fallback
const SYSTEM_SECRET = process.env.ZENTRIX_VAULT_KEY || crypto.createHash('sha256').update(require('os').hostname() + '_zentrix_secret_key_2026').digest();

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', SYSTEM_SECRET, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(cipherText) {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', SYSTEM_SECRET, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

function readVault() {
  if (!fs.existsSync(vaultPath)) return {};
  try {
    const raw = fs.readFileSync(vaultPath, 'utf8');
    const decrypted = decrypt(raw);
    return decrypted ? JSON.parse(decrypted) : {};
  } catch (err) {
    return {};
  }
}

function writeVault(vaultObj) {
  try {
    const jsonStr = JSON.stringify(vaultObj);
    const encrypted = encrypt(jsonStr);
    fs.writeFileSync(vaultPath, encrypted, { mode: 0o600 }); // Restrict file permissions to owner
    return true;
  } catch (err) {
    console.error('[CREDENTIAL_STORE] Vault write failed:', err.message);
    return false;
  }
}

async function setSecret(service, secret) {
  const vault = readVault();
  vault[service] = secret;
  return writeVault(vault);
}

async function getSecret(service) {
  const vault = readVault();
  return vault[service] || null;
}

async function deleteSecret(service) {
  const vault = readVault();
  delete vault[service];
  return writeVault(vault);
}

async function hasSecret(service) {
  const secret = await getSecret(service);
  return Boolean(secret);
}

module.exports = {
  setSecret,
  getSecret,
  deleteSecret,
  hasSecret
};
