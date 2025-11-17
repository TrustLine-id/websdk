// Core Trustline SDK
import {
  TrustlineInitOptions,
  TrustlineValidateParams,
  TrustlineValidateResponse,
  JWTAuthMessage,
  ConfigurePolicyParams,
  ConfigurePolicyResult,
  EIP712Signer,
  EIP712Domain,
  EIP712Types,
  EIP712Message
} from './types';

const DEFAULT_API_URL = 'https://api.trustline.id/api/v0';
//const DEFAULT_API_URL = 'http://localhost:8080/api/v0';
const AUTH_URL = 'https://auth.trustline.id';

class TrustlineSDK {
  private clientId: string | null = null;
  private loginUri?: string;
  private apiUrl: string = DEFAULT_API_URL;

  init(optionsOrElement: TrustlineInitOptions | HTMLElement) {
    if (optionsOrElement instanceof HTMLElement) {
      const el = optionsOrElement;
      this.clientId = el.getAttribute('data-client_id');
      this.loginUri = el.getAttribute('data-login_uri') || undefined;
    } else {
      this.clientId = optionsOrElement.clientId;
      this.loginUri = optionsOrElement.loginUri;
    }
    if (!this.clientId) {
      throw new Error('Trustline: clientId is required');
    }
  }

  authenticate() {
    // TODO: add Trustline validation support
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }
    throw new Error('Trustline: authenticate() not implemented yet');
  }

  private async openAuthPopup(): Promise<string> {
    return new Promise((resolve, reject) => {
      const popupConfig = 'toolbar=no,scrollbars=no,location=no,statusbar=no,menubar=no,resizable=0,width=620,height=800';
      const popup = window.open(AUTH_URL, 'Trustline Authentication', popupConfig);
      
      if (!popup) {
        reject(new Error('Trustline: Failed to open authentication popup. Please allow popups for this site.'));
        return;
      }

      // Focus the popup
      popup.focus();

      // Listen for messages from the popup
      const messageHandler = (event: MessageEvent) => {
        // Verify the origin for security
        console.log('event', event);
        if (event.origin !== AUTH_URL) {
          return;
        }

        try {
          const data = event.data as JWTAuthMessage;
          if (data && data.type === 'JWT_TOKEN' && typeof data.jwt === 'string') {
            // Clean up event listener
            window.removeEventListener('message', messageHandler);
            
            // Close the popup
            popup.close();
            
            // Resolve with the JWT token
            resolve(data.jwt);
          }
        } catch (error) {
          // Invalid message format, ignore
        }
      };

      window.addEventListener('message', messageHandler);

      // Handle popup closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Trustline: Authentication popup was closed by user'));
        }
      }, 1000);

      // Set a timeout for the authentication process
      setTimeout(() => {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        popup.close();
        reject(new Error('Trustline: Authentication timeout'));
      }, 300000); // 5 minutes timeout
    });
  }

  async validate(params: TrustlineValidateParams, jwt?: string): Promise<TrustlineValidateResponse> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }

    let jwtToken = jwt;

    const requireAuthentication = true;

    // If no JWT token provided, open popup to get one
    // TODO: check with backend if auth is required
    if (!jwtToken && requireAuthentication) {
      try {
        jwtToken = await this.openAuthPopup();
      } catch (error) {
        throw error;
      }
    }

    const body = {
      jsonrpc: '2.0',
      method: 'validate',
      params: {
        clientId: this.clientId,
        ...params,
      },
      id: 1,
    };
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /**
   * Normalize a hex or decimal string to lowercase
   */
  private normalizeString(value: string): string {
    return value.toLowerCase();
  }

  /**
   * Prepare transaction data for EIP-712 signing
   * For raw data (string), returns normalized hex string
   * For structured data (object), returns JSON stringified version
   */
  private prepareDataForSignature(data: { functionSelector?: string; args?: any[] } | string): string {
    if (typeof data === 'string') {
      // For raw data, use the hex string directly (normalized to lowercase)
      return this.normalizeString(data);
    } else {
      // For structured data, JSON stringify it
      return JSON.stringify({
        functionSelector: data.functionSelector,
        args: data.args
      });
    }
  }

  /**
   * Create EIP-712 domain for configurePolicy
   */
  private createEIP712Domain(chainId: string): EIP712Domain {
    // Parse chainId to bigint or number
    let chainIdValue: bigint | number;
    if (chainId.startsWith('0x')) {
      chainIdValue = BigInt(chainId);
    } else {
      chainIdValue = BigInt(chainId);
    }

    return {
      name: 'TrustLine Policy Configuration',
      version: '1',
      chainId: chainIdValue,
      verifyingContract: '0x0000000000000000000000000000000000000000'
    };
  }

  /**
   * Create EIP-712 types for configurePolicy
   */
  private createEIP712Types(): EIP712Types {
    return {
      ConfigurePolicy: [
        { name: 'chainId', type: 'string' },
        { name: 'senderAddress', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'nativeAmount', type: 'string' },
        { name: 'data', type: 'string' }, // Can be raw hex or structured JSON
        { name: 'validationMode', type: 'string' },
        { name: 'policyType', type: 'string' },
        { name: 'customization', type: 'string' }
      ]
    };
  }

  /**
   * Create EIP-712 message for configurePolicy
   * Note: The message field is named 'senderAddress' but should contain the signerAddress value
   */
  private createEIP712Message(
    params: ConfigurePolicyParams,
    dataForSignature: string
  ): EIP712Message {
    const chainId = params.chainId;
    const validationMode = params.validationMode || '';
    const customizationJson = JSON.stringify(params.customization);

    return {
      chainId: chainId,
      senderAddress: params.signerAddress, // Use signerAddress here (naming inconsistency for compatibility)
      contractAddress: params.contractAddress,
      nativeAmount: params.nativeAmount,
      data: dataForSignature, // Either raw hex string or JSON stringified structured data
      validationMode: validationMode,
      policyType: params.policyType,
      customization: customizationJson
    };
  }

  /**
   * Configure a policy customization for a specific transaction context
   * 
   * The data field can be either:
   * - Raw: string (hex string like "0x...") - will be used directly for signing (normalized to lowercase)
   * - Structured: object with { functionSelector?: string, args?: any[] } - will be JSON stringified for signing
   * 
   * @param params Configuration parameters
   * @param signer EIP-712 signer function that can sign typed data
   * @returns Promise resolving to the configuration result
   * 
   * @example
   * ```typescript
   * // Using ethers.js with raw data
   * import { ethers } from 'ethers';
   * 
   * const signer = new ethers.Wallet(privateKey, provider);
   * const eip712Signer = async (domain, types, message) => {
   *   return await signer.signTypedData(domain, types, message);
   * };
   * 
   * const result = await trustline.configurePolicy({
   *   // ... other params
   *   data: '0x3d18b9120000000000000000000000000000000000000000000000000000000000000001'
   * }, eip712Signer);
   * ```
   * 
   * @example
   * ```typescript
   * // Using structured data (automatically JSON stringified for signing)
   * const result = await trustline.configurePolicy({
   *   // ... other params
   *   data: {
   *     functionSelector: 'withdraw(uint256)',
   *     args: ['1']
   *   }
   * }, eip712Signer);
   * ```
   */
  async configurePolicy(
    params: ConfigurePolicyParams,
    signer: EIP712Signer
  ): Promise<ConfigurePolicyResult> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }

    // Validate required parameters
    if (!params.chainId) {
      throw new Error('Trustline: chainId is required');
    }
    if (!params.senderAddress) {
      throw new Error('Trustline: senderAddress is required');
    }
    if (!params.signerAddress) {
      throw new Error('Trustline: signerAddress is required');
    }
    if (!params.contractAddress) {
      throw new Error('Trustline: contractAddress is required');
    }
    if (!params.nativeAmount) {
      throw new Error('Trustline: nativeAmount is required');
    }
    if (!params.data) {
      throw new Error('Trustline: data is required');
    }
    if (!params.policyType) {
      throw new Error('Trustline: policyType is required');
    }
    if (!params.customization) {
      throw new Error('Trustline: customization is required');
    }

    // Prepare data for signing (can be raw hex or structured JSON)
    const dataForSignature = this.prepareDataForSignature(params.data);

    // Create EIP-712 domain and types
    const domain = this.createEIP712Domain(params.chainId);
    const types = this.createEIP712Types();

    // Create EIP-712 message
    const message = this.createEIP712Message(params, dataForSignature);

    // Sign the message
    let signature: string;
    try {
      signature = await signer(domain, types, message);
    } catch (error) {
      throw new Error(`Trustline: Failed to sign EIP-712 message: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Prepare request body
    const requestBody = {
      jsonrpc: '2.0',
      method: 'configurePolicy',
      id: 1,
      params: {
        chainId: params.chainId,
        senderAddress: params.senderAddress,
        signerAddress: params.signerAddress,
        contractAddress: params.contractAddress,
        nativeAmount: params.nativeAmount,
        data: params.data,
        validationMode: params.validationMode,
        policyType: params.policyType,
        customization: params.customization,
        clientId: this.clientId,
        signature: signature
      }
    };

    // Send request
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      return await res.json();
    } catch (error) {
      throw new Error(`Trustline: Failed to configure policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const trustline = new TrustlineSDK();

// UMD global export for browser usage
if (typeof window !== 'undefined') {
  (window as any).trustline = trustline;
}
