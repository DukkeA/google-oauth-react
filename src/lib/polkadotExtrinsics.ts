import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import type { ISubmittableResult } from '@polkadot/types/types';

export interface ExtrinsicResult {
  success: boolean;
  hash?: string;
  blockHash?: string;
  error?: string;
  events?: Array<{
    section: string;
    method: string;
    data: string;
  }>;
}

export interface ConnectionConfig {
  wsEndpoint: string;
}

/**
 * Initialize crypto and connect to Polkadot/Substrate node
 */
export const initializePolkadotApi = async (config: ConnectionConfig): Promise<ApiPromise> => {
  await cryptoWaitReady();
  
  const provider = new WsProvider(config.wsEndpoint);
  const api = await ApiPromise.create({ provider });
  
  await api.isReady;
  return api;
};

/**
 * Load account from keystore JSON and password
 * This is the key function that allows us to send extrinsics without wallet extension
 */
export const loadAccountFromKeystore = async (
  keystoreJson: KeyringPair$Json, // The JSON from our saved keystore
  password: string
): Promise<KeyringPair> => {
  await cryptoWaitReady();
  
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 355 });
  
  try {
    // This is the crucial part - we restore the account from the encrypted JSON
    // using the password to decrypt it
    const pair = keyring.addFromJson(keystoreJson);
    
    // Decrypt the keypair with the password
    pair.decodePkcs8(password);
    
    // Verify the account is unlocked and ready to sign
    if (pair.isLocked) {
      throw new Error('Account is still locked after password attempt');
    }
    
    return pair;
  } catch (error) {
    throw new Error(`Failed to load account from keystore: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Send a balance transfer extrinsic
 */
export const sendBalanceTransfer = async (
  api: ApiPromise,
  senderPair: KeyringPair,
  recipientAddress: string,
  amount: string | number
): Promise<ExtrinsicResult> => {
  return new Promise((resolve) => {
    try {
      const transfer = api.tx.balances.transferAllowDeath(recipientAddress, amount);
      
      transfer.signAndSend(senderPair, ({ events = [], status, dispatchError }) => {
        console.log(`Transaction status: ${status.type}`);
        
        if (dispatchError) {
          let errorMessage = 'Transaction failed';
          
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
          } else {
            errorMessage = dispatchError.toString();
          }
          
          resolve({
            success: false,
            error: errorMessage
          });
          return;
        }
        
        if (status.isInBlock) {
          console.log(`✅ Transaction included in block: ${status.asInBlock.toHex()}`);
          
          resolve({
            success: true,
            hash: transfer.hash.toHex(),
            blockHash: status.asInBlock.toHex(),
            events: events.map(({ event }) => ({
              section: event.section,
              method: event.method,
              data: event.data.toString()
            }))
          });
        }
      });
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

/**
 * Send a custom extrinsic
 */
export const sendCustomExtrinsic = async (
  api: ApiPromise,
  senderPair: KeyringPair,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>
): Promise<ExtrinsicResult> => {
  return new Promise((resolve) => {
    try {
      extrinsic.signAndSend(senderPair, ({ events = [], status, dispatchError }) => {
        console.log(`Transaction status: ${status.type}`);
        
        if (dispatchError) {
          let errorMessage = 'Transaction failed';
          
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
          } else {
            errorMessage = dispatchError.toString();
          }
          
          resolve({
            success: false,
            error: errorMessage
          });
          return;
        }
        
        if (status.isInBlock) {
          console.log(`✅ Transaction included in block: ${status.asInBlock.toHex()}`);
          
          resolve({
            success: true,
            hash: extrinsic.hash.toHex(),
            blockHash: status.asInBlock.toHex(),
            events: events.map(({ event }) => ({
              section: event.section,
              method: event.method,
              data: event.data.toString()
            }))
          });
        }
      });
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

/**
 * Example: Send a remark extrinsic (useful for testing)
 */
export const sendRemark = async (
  api: ApiPromise,
  senderPair: KeyringPair,
  message: string
): Promise<ExtrinsicResult> => {
  const remarkExtrinsic = api.tx.system.remark(message);
  return sendCustomExtrinsic(api, senderPair, remarkExtrinsic);
};

/**
 * Get account balance
 */
export const getAccountBalance = async (
  api: ApiPromise,
  address: string
): Promise<{
  free: string;
  reserved: string;
  frozen: string;
}> => {
  const accountInfo = await api.query.system.account(address);
  // Type assertion needed due to Polkadot.js types complexity
  const balance = (accountInfo as unknown as { 
    data: { 
      free: { toString(): string }; 
      reserved: { toString(): string }; 
      frozen: { toString(): string } 
    } 
  }).data;
  
  return {
    free: balance.free.toString(),
    reserved: balance.reserved.toString(),
    frozen: balance.frozen.toString()
  };
};

/**
 * Estimate transaction fee
 */
export const estimateTransactionFee = async (
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  senderAddress: string
): Promise<{
  partialFee: string;
  weight: string;
}> => {
  const paymentInfo = await extrinsic.paymentInfo(senderAddress);
  
  return {
    partialFee: paymentInfo.partialFee.toString(),
    weight: paymentInfo.weight.toString()
  };
};

/**
 * Disconnect from the API
 */
export const disconnectApi = async (api: ApiPromise): Promise<void> => {
  await api.disconnect();
};

/**
 * Example usage function that demonstrates the complete flow
 */
export const exampleSendTransactionFromKeystore = async (
  keystoreJson: KeyringPair$Json,
  password: string,
  recipientAddress: string,
  amount: string,
  wsEndpoint: string = 'wss://gen6.app/node'
): Promise<ExtrinsicResult> => {
  let api: ApiPromise | null = null;
  
  try {
    // 1. Initialize API connection
    console.log('🔗 Connecting to Polkadot node...');
    api = await initializePolkadotApi({ wsEndpoint });
    
    // 2. Load account from keystore
    console.log('🔐 Loading account from keystore...');
    const senderPair = await loadAccountFromKeystore(keystoreJson, password);
    console.log(`📍 Loaded account: ${senderPair.address}`);
    
    // 3. Check balance
    console.log('💰 Checking account balance...');
    const balance = await getAccountBalance(api, senderPair.address);
    console.log(`Free balance: ${balance.free}`);
    
    // 4. Create and estimate transaction
    console.log('📊 Estimating transaction fee...');
    const transferExtrinsic = api.tx.balances.transferAllowDeath(recipientAddress, amount);
    const feeInfo = await estimateTransactionFee(transferExtrinsic, senderPair.address);
    console.log(`Estimated fee: ${feeInfo.partialFee}`);
    
    // 5. Send transaction
    console.log('🚀 Sending transaction...');
    const result = await sendBalanceTransfer(api, senderPair, recipientAddress, amount);
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    // 6. Cleanup
    if (api) {
      await disconnectApi(api);
      console.log('🔌 Disconnected from Polkadot node');
    }
  }
};
