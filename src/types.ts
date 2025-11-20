// Trustline SDK Types

export type ValidationMode = 'uniswapv4' | 'morphov2' | 'erc3643' | 'dapp';

export interface TrustlineInitOptions {
  clientId: string;
  loginUri?: string;
}

export interface TrustlineWeb3ValidateParams {
  chainId: string | number;
  senderAddress: string;
  contractAddress: string;
  nativeAmount: string;
  data: {
    functionSelector?: string;
    args?: any[];
  } | string;
  validationMode?: ValidationMode;
}

export interface TrustlineWeb2ValidateParams {
  actionId: string;
  policyData: Record<string, any>;
}

export type TrustlineValidateParams = TrustlineWeb3ValidateParams | TrustlineWeb2ValidateParams;

export interface TrustlineApprovedResponse {
  jsonrpc: string;
  id: number;
  result: {
    status: 'approved';
    certId: string;
    partialCert: {
      timestamp: string;
      signature: string;
      policyHash?: string;
    };
  };
}

export interface TrustlineRejectedResponse {
  jsonrpc: string;
  id: number;
  result: {
    status: 'rejected';
    type?: string;
    provider?: string;
    reason: string;
  };
}

export interface TrustlineApprovalRequiredResponse {
  jsonrpc: string;
  id: number;
  result: {
    status: 'approval_required';
  };
}

export interface TrustlineErrorResponse {
  jsonrpc: string;
  id: number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JWTAuthMessage {
  type: 'JWT_TOKEN';
  jwt: string;
}

export type TrustlineValidateResponse =
  | TrustlineApprovedResponse
  | TrustlineRejectedResponse
  | TrustlineApprovalRequiredResponse
  | TrustlineErrorResponse;

// configurePolicy Types

export type JsonElement = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonElement[] 
  | { [key: string]: JsonElement };

export interface ConfigurePolicyParams {
  /**
   * Chain ID (required)
   * Can be hex string (0x...) or decimal string
   */
  chainId: string;
  
  /**
   * Sender address (required)
   * The address that will send the transaction
   * This is used for transaction context matching
   */
  senderAddress: string;
  
  /**
   * Signer address (required)
   * The address that signs the EIP-712 signature
   * This is verified during signature validation
   * For use case verification (e.g., Escrow), this must match the depositor
   */
  signerAddress: string;
  
  /**
   * Contract address (required)
   * The target contract address for the transaction
   * Also used as clientId if clientId is not provided
   */
  contractAddress: string;
  
  /**
   * Native amount (required)
   * Transaction value in native token (ETH, etc.)
   * Can be hex string (0x...) or decimal string
   * Will be normalized to lowercase for hashing
   */
  nativeAmount: string;
  
  /**
   * Transaction data (required)
   * Can be either:
   * - Raw: { msgData: "0x..." }
   * - Structured: { functionSelector: "withdraw(uint256)", args: [...] }
   */
  data: {
    functionSelector?: string;
    args?: any[];
  } | string;
  
  /**
   * Validation mode (optional)
   * "erc3643", "uniswapv4", "morphov2", or null/undefined for dapp mode
   */
  validationMode?: string | null;
  
  /**
   * Policy type (required)
   * One of: "UserAuthenticationPolicy", "IPLocationPolicy", "ProxyCheckPolicy", "RiskAssessmentPolicy"
   */
  policyType: string;
  
  /**
   * Customization parameters (required)
   * JSON object with policy-specific parameters
   */
  customization: Record<string, any>;
}

export interface ConfigurePolicyResponse {
  jsonrpc: string;
  id: number;
  result: {
    success: boolean;
    error?: string;
  };
}

export interface ConfigurePolicyErrorResponse {
  jsonrpc: string;
  id: number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type ConfigurePolicyResult = ConfigurePolicyResponse | ConfigurePolicyErrorResponse;

// fetchPolicy Types

export interface FetchPolicyParams {
  /**
   * Chain ID (required)
   * Can be hex string (0x...) or decimal string
   */
  chainId: string;
  
  /**
   * Sender address (required)
   * The address that will send the transaction
   * Used for customization lookup matching
   */
  senderAddress: string;
  
  /**
   * Contract address (required)
   * The target contract address for the transaction
   * Also used as clientId if clientId is not provided
   */
  contractAddress: string;
  
  /**
   * Native amount (required)
   * Transaction value in native token (ETH, etc.)
   * Can be hex string (0x...) or decimal string
   */
  nativeAmount: string;
  
  /**
   * Transaction data (required)
   * Can be either:
   * - Raw: string (hex string like "0x...")
   * - Structured: object with { functionSelector?: string, args?: any[] }
   */
  data: {
    functionSelector?: string;
    args?: any[];
  } | string;
  
  /**
   * Validation mode (optional)
   * "erc3643", "uniswapv4", "morphov2", or null/undefined for dapp mode
   */
  validationMode?: string | null;
}

export interface Policy {
  type: string;
  [key: string]: any;
}

export interface FetchPolicyResponse {
  jsonrpc: string;
  id: number;
  result: {
    success: true;
    policy: Policy;
    isCustomized: boolean;
    actionId: string;
    clientId: string;
    transactionDataHash: string;
  };
}

export interface FetchPolicyErrorResponse {
  jsonrpc: string;
  id: number;
  result: {
    success: false;
    error: string;
  };
}

export type FetchPolicyResult = FetchPolicyResponse | FetchPolicyErrorResponse;

// fetchDefaultPolicy Types

export interface FetchDefaultPolicyParams {
  /**
   * Chain ID (required)
   * Can be hex string (0x...) or decimal string
   */
  chainId: string;
  
  /**
   * Contract address (required)
   * The target contract address for the transaction
   * Also used as clientId if clientId is not provided
   */
  contractAddress: string;
  
  /**
   * Transaction data (required)
   * Can be either:
   * - Raw: string (hex string like "0x...")
   * - Structured: object with { functionSelector?: string, args?: any[] }
   */
  data: {
    functionSelector?: string;
    args?: any[];
  } | string;
  
  /**
   * Validation mode (optional)
   * "erc3643", "uniswapv4", "morphov2", or null/undefined for dapp mode
   */
  validationMode?: string | null;
}

export interface FetchDefaultPolicyResponse {
  jsonrpc: string;
  id: number;
  result: {
    success: true;
    policy: Policy;
    actionId: string;
    clientId: string;
  };
}

export interface FetchDefaultPolicyErrorResponse {
  jsonrpc: string;
  id: number;
  result: {
    success: false;
    error: string;
  };
}

export type FetchDefaultPolicyResult = FetchDefaultPolicyResponse | FetchDefaultPolicyErrorResponse;

// EIP-712 Signer Interface
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: bigint | number;
  verifyingContract: string;
}

export interface EIP712Types {
  [key: string]: Array<{ name: string; type: string }>;
}

export interface EIP712Message {
  [key: string]: any;
}

/**
 * Signer function for EIP-712 typed data signing
 * @param domain EIP-712 domain
 * @param types EIP-712 types
 * @param message EIP-712 message
 * @returns Promise resolving to the signature string (0x...)
 */
export type EIP712Signer = (
  domain: EIP712Domain,
  types: EIP712Types,
  message: EIP712Message
) => Promise<string>;
