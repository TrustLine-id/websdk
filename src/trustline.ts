// Core Trustline SDK
import {
  TrustlineInitOptions,
  TrustlineValidateParams,
  TrustlineValidateResponse
} from './types';

const DEFAULT_API_URL = 'https://api.trustline.id/api/v0';

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

  async validate(params: TrustlineValidateParams): Promise<TrustlineValidateResponse> {
    if (!this.clientId) {
      throw new Error('Trustline: SDK not initialized');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }
}

export const trustline = new TrustlineSDK();

// UMD global export for browser usage
if (typeof window !== 'undefined') {
  (window as any).trustline = trustline;
}
