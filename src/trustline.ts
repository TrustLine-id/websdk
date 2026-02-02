// Core Trustline SDK
import {
  TrustlineInitOptions,
  TrustlineValidateParams,
  TrustlineValidateResponse,
  JWTAuthMessage,
  ConfigurePolicyParams,
  ConfigurePolicyResult,
  FetchPolicyParams,
  FetchPolicyResult,
  FetchDefaultPolicyParams,
  FetchDefaultPolicyResult,
  EIP712Signer,
  EIP712Domain,
  EIP712Types,
  EIP712Message,
  OpenSessionParams,
  OpenSessionResult
} from './types';

const DEFAULT_API_URL = 'https://api.trustline.id/api/v0';
//const DEFAULT_API_URL = 'http://localhost:8080/api/v0';
const AUTH_URL = 'https://auth.trustline.id';
//const AUTH_URL = 'http://localhost:3000';

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

  /**
   * Open a session for transaction validation
   * This must be called before validate() to establish a session context
   * 
   * @param params Transaction parameters (same as validate params - can be Web3 or Web2)
   * @returns Promise resolving to session result with sessionId
   */
  private async openSession(params: OpenSessionParams): Promise<OpenSessionResult> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }

    const body = {
      jsonrpc: '2.0',
      method: 'openSession',
      params: {
        clientId: this.clientId,
        ...params,
      },
      id: 1,
    };

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (error) {
      throw new Error(`Trustline: Failed to open session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async openAuthPopup(sessionId?: string, usePopup: boolean = false): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = sessionId ? `${AUTH_URL}?sessionId=${sessionId}` : AUTH_URL;
      
      let cleanup: () => void;
      let checkClosed: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Cleanup function
      const cleanupResources = () => {
        if (checkClosed) {
          clearInterval(checkClosed);
          checkClosed = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        window.removeEventListener('message', messageHandler);
      };

      // Message handler for both popup and iframe
      const messageHandler = (event: MessageEvent) => {
        // Verify the origin for security
        if (event.origin !== AUTH_URL) {
          return;
        }

        try {
          const data = event.data as JWTAuthMessage;
          if (data && data.type === 'JWT_TOKEN' && typeof data.jwt === 'string') {
            // Clean up resources
            cleanupResources();
            
            // Close popup or remove overlay
            if (cleanup) {
              cleanup();
            }
            
            // Resolve with the JWT token
            resolve(data.jwt);
          }
        } catch (error) {
          // Invalid message format, ignore
        }
      };

      window.addEventListener('message', messageHandler);

      // Timeout handler
      const handleTimeout = () => {
        cleanupResources();
        if (cleanup) {
          cleanup();
        }
        reject(new Error('Trustline: Authentication timeout'));
      };

      if (usePopup) {
        // Popup mode
        const popupConfig = 'toolbar=no,scrollbars=no,location=no,statusbar=no,menubar=no,resizable=0,width=620,height=800';
        const popup = window.open(authUrl, 'Trustline Authentication', popupConfig);

        if (!popup) {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Trustline: Failed to open authentication popup. Please allow popups for this site.'));
          return;
        }

        popup.focus();

        // Cleanup function for popup
        cleanup = () => {
          if (popup && !popup.closed) {
            popup.close();
          }
        };

        // Popup closed manually
        checkClosed = setInterval(() => {
          if (popup.closed) {
            cleanupResources();
            cleanup();
            reject(new Error('Trustline: Authentication popup was closed by user'));
          }
        }, 1000);

        // Timeout for the authentication process
        timeoutId = setTimeout(handleTimeout, 300000); // 5 minutes timeout
      } else {
        // Iframe overlay mode
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.75);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        // Iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.style.cssText = `
          position: relative;
          width: 620px;
          height: 800px;
          max-width: 90vw;
          max-height: 90vh;
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        `;

        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
          position: absolute;
          top: 0px;
          right: 0px;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 5px;
          margin: 10px;
          padding: 0 0;
          background-color:rgba(0, 123, 255, 0.5);
          color: white;
          font-size: 24px;
          font-weight: bold;
          font-family: 'Montserrat', sans-serif;
          cursor: pointer;
          z-index: 1000000;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: background-color 0.2s;
        `;
        closeButton.onmouseover = () => {
          closeButton.style.backgroundColor = 'rgba(0, 123, 255, 1)';
        };
        closeButton.onmouseout = () => {
          closeButton.style.backgroundColor = 'rgba(0, 123, 255, 0.4)';
        };
        closeButton.onclick = () => {
          cleanupResources();
          cleanup();
          reject(new Error('Trustline: Authentication was cancelled by user'));
        };

        // Iframe
        const iframe = document.createElement('iframe');
        iframe.src = authUrl;
        iframe.style.cssText = `
          width: 100%;
          height: 100%;
          border: none;
        `;
        iframe.setAttribute('allow', 'camera; microphone; geolocation');

        iframeContainer.appendChild(closeButton);
        iframeContainer.appendChild(iframe);
        overlay.appendChild(iframeContainer);
        document.body.appendChild(overlay);

        // Prevent body scroll when overlay is open
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Cleanup function for iframe overlay
        cleanup = () => {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          document.body.style.overflow = originalOverflow;
        };

        // Set a timeout for the authentication process
        timeoutId = setTimeout(handleTimeout, 300000); // 5 minutes timeout
      }
    });
  }

  async validate(params: TrustlineValidateParams, jwt?: string): Promise<TrustlineValidateResponse> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }

    let jwtToken = jwt;
    let sessionId: string | undefined;

    // Step 1: Open session with transaction params
    let authRequired = false;
    try {
      const sessionResult = await this.openSession(params);
      
      // Check if openSession was successful
      if ('error' in sessionResult) {
        throw new Error(`Trustline: Failed to open session: ${sessionResult.error.message}`);
      }
      
      if (!sessionResult.result.success) {
        throw new Error('Trustline: Failed to open session: Unknown error');
      }
      
      sessionId = sessionResult.result.sessionId;
      authRequired = sessionResult.result.authRequired;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Trustline: Failed to open session: ${String(error)}`);
    }

    // Step 2: Get JWT token via auth popup (with sessionId) if authentication is required
    if (!jwtToken && authRequired) {
      try {
        jwtToken = await this.openAuthPopup(sessionId);
      } catch (error) {
        throw error;
      }
    }

    // Step 3: Validate with only sessionId
    const body = {
      jsonrpc: '2.0',
      method: 'validate',
      params: {
        sessionId: sessionId,
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

  /**
   * Fetch the resolved policy for a specific transaction context
   * 
   * Returns the exact same policy that would be applied during a validate() call,
   * including any customizations that have been configured via configurePolicy().
   * 
   * The data field can be either:
   * - Raw: string (hex string like "0x...")
   * - Structured: object with { functionSelector?: string, args?: any[] }
   * 
   * @param params Fetch policy parameters
   * @returns Promise resolving to the fetch policy result
   * 
   * @example
   * ```typescript
   * // Using raw data
   * const result = await trustline.fetchPolicy({
   *   chainId: '84532',
   *   senderAddress: '0x...',
   *   contractAddress: '0x...',
   *   nativeAmount: '0',
   *   data: '0x3d18b9120000000000000000000000000000000000000000000000000000000000000001'
   * });
   * 
   * if (result.result.success) {
   *   console.log('Policy type:', result.result.policy.type);
   *   console.log('Action ID:', result.result.actionId);
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Using structured data
   * const result = await trustline.fetchPolicy({
   *   chainId: '84532',
   *   senderAddress: '0x...',
   *   contractAddress: '0x...',
   *   nativeAmount: '0',
   *   data: {
   *     functionSelector: 'withdraw(uint256)',
   *     args: ['1']
   *   }
   * });
   * ```
   */
  async fetchPolicy(params: FetchPolicyParams): Promise<FetchPolicyResult> {
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
    if (!params.contractAddress) {
      throw new Error('Trustline: contractAddress is required');
    }
    if (!params.nativeAmount) {
      throw new Error('Trustline: nativeAmount is required');
    }
    if (!params.data) {
      throw new Error('Trustline: data is required');
    }

    // Prepare request body
    const requestBody = {
      jsonrpc: '2.0',
      method: 'fetchPolicy',
      id: 1,
      params: {
        chainId: params.chainId,
        senderAddress: params.senderAddress,
        contractAddress: params.contractAddress,
        nativeAmount: params.nativeAmount,
        data: params.data,
        validationMode: params.validationMode,
        clientId: this.clientId
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
      throw new Error(`Trustline: Failed to fetch policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch the default policy for a specific transaction context
   * 
   * Returns the default policy without resolving any customizations.
   * This is useful for comparing default vs customized policies.
   * 
   * The data field can be either:
   * - Raw: string (hex string like "0x...")
   * - Structured: object with { functionSelector?: string, args?: any[] }
   * 
   * @param params Fetch default policy parameters
   * @returns Promise resolving to the fetch default policy result
   * 
   * @example
   * ```typescript
   * // Using raw data
   * const result = await trustline.fetchDefaultPolicy({
   *   chainId: '84532',
   *   contractAddress: '0x...',
   *   data: '0x3d18b9120000000000000000000000000000000000000000000000000000000000000001'
   * });
   * 
   * if (result.result.success) {
   *   console.log('Default policy type:', result.result.policy.type);
   *   console.log('Action ID:', result.result.actionId);
   * }
   * ```
   * 
   * @example
   * ```typescript
   * // Using structured data
   * const result = await trustline.fetchDefaultPolicy({
   *   chainId: '84532',
   *   contractAddress: '0x...',
   *   data: {
   *     functionSelector: 'withdraw(uint256)',
   *     args: ['1']
   *   }
   * });
   * ```
   */
  async fetchDefaultPolicy(params: FetchDefaultPolicyParams): Promise<FetchDefaultPolicyResult> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
    }

    // Validate required parameters
    if (!params.chainId) {
      throw new Error('Trustline: chainId is required');
    }
    if (!params.contractAddress) {
      throw new Error('Trustline: contractAddress is required');
    }
    if (!params.data) {
      throw new Error('Trustline: data is required');
    }

    // Prepare request body
    const requestBody = {
      jsonrpc: '2.0',
      method: 'fetchDefaultPolicy',
      id: 1,
      params: {
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        data: params.data,
        validationMode: params.validationMode,
        clientId: this.clientId
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
      throw new Error(`Trustline: Failed to fetch default policy: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const trustline = new TrustlineSDK();

// UMD global export for browser usage
if (typeof window !== 'undefined') {
  (window as any).trustline = trustline;
}
