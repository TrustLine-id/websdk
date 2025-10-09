// Trustline SDK Types

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
