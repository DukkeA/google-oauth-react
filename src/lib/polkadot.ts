import { mnemonicGenerate, cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';

export interface SubstrateAccount {
  mnemonic: string; // Just to show the user immediately after generation
  address: string;
  publicKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keystoreJson: any; // We use any for now for compatibility with KeyringPair$Json
  meta: {
    name: string;
    created: string;
  };
}

/**
 * Interface for the standard Polkadot.js keystore JSON format
 */
export interface PolkadotKeystoreJson {
  address: string;
  encoded: string;
  encoding: {
    content: string[];
    type: string[];
    version: string;
  };
  meta: {
    name: string;
    whenCreated: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Initialize crypto and ensure WASM is ready
 * This must be called before any cryptographic operations
 */
export const initializeCrypto = async (): Promise<void> => {
  await cryptoWaitReady();
};

/**
 * Generate a new Substrate/Polkadot account with mnemonic and JSON format
 * @param accountName - Name for the account
 * @param password - Password to encrypt the JSON keystore
 * @returns Promise<SubstrateAccount> - Generated account with all necessary data
 */
export const generateSubstrateAccount = async (
  accountName: string = 'Generated Account',
  password: string = 'myStr0ngP@ssworD'
): Promise<SubstrateAccount> => {
  // Ensure crypto is ready
  await initializeCrypto();
  
  // Generate a random 12-word mnemonic
  const mnemonic = mnemonicGenerate(12);
  
  // Create a keyring instance (defaults to sr25519)
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 355 });
  
  // Add the account to keyring with mnemonic
  const pair = keyring.addFromUri(mnemonic, { 
    name: accountName,
    created: new Date().toISOString()
  });
  
  // Get the JSON representation of the keystore (encrypted with password)
  const keystoreJson = keyring.toJson(pair.address, password);
  
  return {
    mnemonic,
    address: pair.address,
    publicKey: u8aToHex(pair.publicKey),
    keystoreJson,
    meta: {
      name: accountName,
      created: new Date().toISOString()
    }
  };
};

/**
 * Create account from existing mnemonic
 * @param mnemonic - Existing mnemonic phrase
 * @param accountName - Name for the account
 * @param password - Password to encrypt the JSON keystore
 * @returns Promise<SubstrateAccount> - Account data
 */
export const createAccountFromMnemonic = async (
  mnemonic: string,
  accountName: string = 'Imported Account',
  password: string = 'myStr0ngP@ssworD'
): Promise<SubstrateAccount> => {
  // Ensure crypto is ready
  await initializeCrypto();
  
  // Create a keyring instance
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 355 });
  
  // Add the account to keyring with existing mnemonic
  const pair = keyring.addFromUri(mnemonic, { 
    name: accountName,
    created: new Date().toISOString()
  });
  
  // Get the JSON representation of the keystore (encrypted with password)
  const keystoreJson = keyring.toJson(pair.address, password);
  
  return {
    mnemonic,
    address: pair.address,
    publicKey: u8aToHex(pair.publicKey),
    keystoreJson,
    meta: {
      name: accountName,
      created: new Date().toISOString()
    }
  };
};

/**
 * Validate a mnemonic phrase
 * @param mnemonic - Mnemonic phrase to validate
 * @returns boolean - True if valid, false otherwise
 */
export const validateMnemonic = async (mnemonic: string): Promise<boolean> => {
  try {
    await initializeCrypto();
    return mnemonicValidate(mnemonic);
  } catch (error) {
    console.error('Error validating mnemonic:', error);
    return false;
  }
};

/**
 * Convert account keystore to the standard Polkadot.js JSON format for storage/export
 * This format can be imported into Polkadot.js Extension and other compatible wallets
 * ⚠️ IMPORTANT: This format does NOT include the mnemonic for security reasons
 * @param account - SubstrateAccount with keystore
 * @returns string - JSON string in standard Polkadot.js format
 */
export const accountToPolkadotJson = (account: SubstrateAccount): string => {
  // Return only the encrypted keystore JSON (standard Polkadot.js format)
  // This is what should be saved and can be imported into wallets
  return JSON.stringify(account.keystoreJson, null, 2);
};

/**
 * Create account info from a standard Polkadot.js keystore JSON
 * Note: This won't include the mnemonic since it's not stored in the keystore
 * @param keystoreJsonString - JSON string in Polkadot.js keystore format
 * @returns SubstrateAccount - Account data (without mnemonic)
 */
export const accountFromPolkadotJson = (keystoreJsonString: string): SubstrateAccount => {
  const keystoreJson = JSON.parse(keystoreJsonString);
  
  return {
    mnemonic: '', // Not available from keystore for security reasons
    address: keystoreJson.address,
    publicKey: '', // Would need to derive from the keystore if needed
    keystoreJson,
    meta: {
      name: keystoreJson.meta?.name || 'Imported Account',
      created: keystoreJson.meta?.whenCreated 
        ? new Date(keystoreJson.meta.whenCreated).toISOString()
        : new Date().toISOString()
    }
  };
};

/**
 * Convert account data to JSON string for storage (DEPRECATED - use accountToPolkadotJson instead)
 * @param account - SubstrateAccount to serialize
 * @returns string - JSON string representation
 */
export const serializeAccount = (account: SubstrateAccount): string => {
  console.warn('serializeAccount is deprecated. Use accountToPolkadotJson for standard format.');
  return JSON.stringify(account, null, 2);
};

/**
 * Parse account data from JSON string (DEPRECATED - use accountFromPolkadotJson instead)
 * @param jsonString - JSON string to parse
 * @returns SubstrateAccount - Parsed account data
 */
export const deserializeAccount = (jsonString: string): SubstrateAccount => {
  console.warn('deserializeAccount is deprecated. Use accountFromPolkadotJson for standard format.');
  return JSON.parse(jsonString);
};

/**
 * Generate multiple accounts at once
 * @param count - Number of accounts to generate
 * @param baseAccountName - Base name for accounts (will be numbered)
 * @param password - Password for encryption
 * @returns Promise<SubstrateAccount[]> - Array of generated accounts
 */
export const generateMultipleAccounts = async (
  count: number = 1,
  baseAccountName: string = 'Account',
  password: string = 'myStr0ngP@ssworD'
): Promise<SubstrateAccount[]> => {
  const accounts: SubstrateAccount[] = [];
  
  for (let i = 1; i <= count; i++) {
    const accountName = `${baseAccountName} ${i}`;
    const account = await generateSubstrateAccount(accountName, password);
    accounts.push(account);
  }
  
  return accounts;
};
