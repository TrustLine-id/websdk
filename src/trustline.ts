// Core Trustline SDK
import {
  TrustlineInitOptions,
  TrustlineValidateParams,
  TrustlineValidateResponse,
  JWTAuthMessage
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
      const popupConfig = 'toolbar=no,scrollbars=no,location=no,statusbar=no,menubar=no,resizable=0,width=700,height=1000';
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
}

export const trustline = new TrustlineSDK();

// UMD global export for browser usage
if (typeof window !== 'undefined') {
  (window as any).trustline = trustline;
}
