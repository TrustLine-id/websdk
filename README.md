# Trustline Web SDK

A JavaScript/TypeScript SDK for integrating Trustline Web3 and Web2 action validation into any web app (React, Angular, Vue, Vanilla JS, etc).

## Features

- ✅ **Web3 Transaction Validation** - Validate blockchain transactions with customizable policies
- ✅ **Web2 Action Validation** - Validate off-chain actions and operations
- ✅ **Policy Configuration** - Customize validation policies for specific transaction contexts
- ✅ **Policy Fetching** - Retrieve resolved and default policies before validation
- ✅ **Session Management** - Open sessions for transaction validation flows
- ✅ **Authentication Flow** - Integrated JWT authentication with popup/iframe support
- ✅ **Multiple Validation Modes** - Support for Uniswap V4, Morpho V2, ERC-3643, and custom dapp modes
- ✅ **TypeScript Support** - Full TypeScript definitions included
- ✅ **Multiple Build Formats** - ESM, CommonJS, and UMD builds available

## Installation

```sh
npm install @trustline.id/websdk
```

## Quick Start

### React / Next.js / Vue / Angular

```typescript
import { trustline } from '@trustline.id/websdk';

// Initialize the SDK
trustline.init({
  clientId: 'YOUR_TRUSTLINE_CLIENT_ID',
  loginUri: 'https://yourapp.com/auth/trustline/callback', // optional
});

// Validate a Web3 transaction
const response = await trustline.validate({
  chainId: '1',
  senderAddress: '0x...',
  contractAddress: '0x...',
  nativeAmount: '0',
  data: {
    functionPrototype: 'transfer(address,uint256)',
    args: ['0x...', '1000000000000000000']
  },
  validationMode: 'dapp', // optional: 'uniswapv4', 'morphov2', 'erc3643', or 'dapp'
});

// Validate a Web2 action
const response2 = await trustline.validate({
  actionId: 'action-123',
  policyData: { foo: 'bar' },
});
```

### Vanilla JS (CDN/UMD)

```html
<script src="https://cdn.jsdelivr.net/npm/@trustline.id/websdk@latest/dist/trustline.umd.min.js"></script>
<script>
  trustline.init({ clientId: 'YOUR_TRUSTLINE_CLIENT_ID' });
  
  trustline.validate({
    chainId: '1',
    senderAddress: '0x...',
    contractAddress: '0x...',
    nativeAmount: '0',
    data: {
      functionPrototype: 'transfer(address,uint256)',
      args: ['0x...', '1000000000000000000']
    }
  }).then(function(response) {
    console.log('Validation result:', response);
  });
</script>
```

### DOM Initialization

```html
<div id="trustline-init" data-client_id="YOUR_TRUSTLINE_CLIENT_ID" data-login_uri="..."></div>
<script>
  trustline.init(document.getElementById('trustline-init'));
</script>
```

## API Reference

### `trustline.init(options | HTMLElement)`

Initialize the SDK with your client ID.

**Parameters:**
- `options`: `{ clientId: string, loginUri?: string }`
- Or pass a DOM element with `data-client_id` and optional `data-login_uri` attributes

**Example:**
```typescript
trustline.init({
  clientId: 'YOUR_TRUSTLINE_CLIENT_ID',
  loginUri: 'https://yourapp.com/auth/trustline/callback', // optional
});
```

### `trustline.validate(params, jwt?)`

Validate a Web3 transaction or Web2 action. This method:
1. Opens a session with the transaction parameters
2. Triggers authentication popup/iframe if required
3. Performs the validation

**Parameters:**
- `params`: `TrustlineValidateParams` - Web3 or Web2 validation parameters
- `jwt?`: `string` - Optional JWT token (if provided, skips authentication popup)

**Web3 Parameters:**
```typescript
{
  chainId: string | number;
  senderAddress: string;
  contractAddress: string;
  nativeAmount: string;
  data: {
    functionPrototype?: string;
    args?: any[];
  } | string; // Raw hex string or structured data
  validationMode?: 'uniswapv4' | 'morphov2' | 'erc3643' | 'dapp';
}
```

**Web2 Parameters:**
```typescript
{
  actionId: string;
  policyData: Record<string, any>;
}
```

**Returns:** `Promise<TrustlineValidateResponse>`

**Response Types:**
- `TrustlineApprovedResponse` - Transaction approved
- `TrustlineRejectedResponse` - Transaction rejected
- `TrustlineApprovalRequiredResponse` - Additional approval needed
- `TrustlineErrorResponse` - Error occurred

**Example:**
```typescript
const response = await trustline.validate({
  chainId: '1',
  senderAddress: '0x...',
  contractAddress: '0x...',
  nativeAmount: '0',
  data: {
    functionPrototype: 'transfer(address,uint256)',
    args: ['0x...', '1000000000000000000']
  }
});

if ('result' in response && response.result.status === 'approved') {
  console.log('Transaction approved!', response.result.certId);
}
```

### `trustline.configurePolicy(params, signer)`

Configure a policy customization for a specific transaction context. Customizations are stored and applied during validation when matching transaction parameters are detected.

**Parameters:**
- `params`: `ConfigurePolicyParams` - Policy configuration parameters
- `signer`: `EIP712Signer` - EIP-712 signer function

**ConfigurePolicyParams:**
```typescript
{
  chainId: string;
  senderAddress: string;
  signerAddress: string; // Address that signs the EIP-712 signature
  contractAddress: string;
  nativeAmount: string;
  data: {
    functionPrototype?: string;
    args?: any[];
  } | string; // Raw hex string or structured data
  policyType: 'UserAuthenticationPolicy';
  customization: Record<string, any>; // Policy-specific customization
  validationMode?: string | null;
}
```

**EIP712Signer:**
```typescript
type EIP712Signer = (
  domain: EIP712Domain,
  types: EIP712Types,
  message: EIP712Message
) => Promise<string>;
```

**Returns:** `Promise<ConfigurePolicyResult>`

**Example with ethers.js:**
```typescript
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const eip712Signer = async (domain, types, message) => {
  return await signer.signTypedData(domain, types, message);
};

const result = await trustline.configurePolicy({
  chainId: '1',
  senderAddress: '0x...',
  signerAddress: '0x...',
  contractAddress: '0x...',
  nativeAmount: '0',
  data: '0x...',
  policyType: 'UserAuthenticationPolicy',
  customization: {
    allowedEmailDomains: ['example.com'],
    requireEmailVerification: true
  }
}, eip712Signer);
```

**Policy Customization:**

- **UserAuthenticationPolicy:**
  ```typescript
  {
    allowedEmailDomains: string[];
    requireEmailVerification?: boolean;
  }
  ```

### `trustline.fetchPolicy(params)`

Fetch the resolved policy for a specific transaction context. Returns the exact same policy that would be applied during a `validate()` call, including any customizations.

**Parameters:**
- `params`: `FetchPolicyParams`

**FetchPolicyParams:**
```typescript
{
  chainId: string;
  senderAddress: string;
  contractAddress: string;
  nativeAmount: string;
  data: {
    functionPrototype?: string;
    args?: any[];
  } | string;
  validationMode?: string | null;
}
```

**Returns:** `Promise<FetchPolicyResult>`

**Example:**
```typescript
const result = await trustline.fetchPolicy({
  chainId: '1',
  senderAddress: '0x...',
  contractAddress: '0x...',
  nativeAmount: '0',
  data: '0x...'
});

if (result.result.success) {
  console.log('Policy type:', result.result.policy.type);
  console.log('Is customized:', result.result.isCustomized);
  console.log('Action ID:', result.result.actionId);
}
```

### `trustline.fetchDefaultPolicy(params)`

Fetch the default policy for a specific transaction context without resolving customizations. Useful for comparing default vs customized policies.

**Parameters:**
- `params`: `FetchDefaultPolicyParams`

**FetchDefaultPolicyParams:**
```typescript
{
  chainId: string;
  contractAddress: string;
  data: {
    functionPrototype?: string;
    args?: any[];
  } | string;
  validationMode?: string | null;
}
```

**Returns:** `Promise<FetchDefaultPolicyResult>`

**Example:**
```typescript
const result = await trustline.fetchDefaultPolicy({
  chainId: '1',
  contractAddress: '0x...',
  data: '0x...'
});

if (result.result.success) {
  console.log('Default policy type:', result.result.policy.type);
  console.log('Action ID:', result.result.actionId);
}
```

### `trustline.authenticate()`

Triggers Trustline's authentication flow. Currently not fully implemented.

## Validation Modes

The SDK supports different validation modes for various DeFi protocols:

- **`dapp`** (default) - Custom dapp validation mode
- **`uniswapv4`** - Uniswap V4 protocol validation
- **`morphov2`** - Morpho V2 protocol validation
- **`erc3643`** - ERC-3643 token standard validation

## Transaction Data Format

The `data` field supports two formats:

### Raw Data (Hex String)
```typescript
data: '0x...'
```

### Structured Data
```typescript
data: {
  functionPrototype: 'withdraw(uint256)',
  args: ['1']
}
```

Structured data is automatically JSON stringified for EIP-712 signing. No ABI encoding is required.

## Authentication Flow

When `validate()` is called and authentication is required, the SDK will:

1. Open a session with the transaction parameters
2. Check if authentication is required (`authRequired` flag)
3. If required, open an authentication popup or iframe overlay
4. Wait for JWT token from the authentication service
5. Use the JWT token for validation

The authentication popup/iframe can be closed by the user, which will reject the promise with an appropriate error message.

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions. All types are exported:

```typescript
import type {
  TrustlineInitOptions,
  TrustlineValidateParams,
  TrustlineValidateResponse,
  ConfigurePolicyParams,
  ConfigurePolicyResult,
  FetchPolicyParams,
  FetchPolicyResult,
  FetchDefaultPolicyParams,
  FetchDefaultPolicyResult,
  EIP712Signer,
  ValidationMode
} from '@trustline.id/websdk';
```

## Build

Build the SDK:

```sh
npm run build
```

This generates:
- `dist/index.js` - CommonJS build
- `dist/index.esm.js` - ES Module build
- `dist/trustline.umd.min.js` - UMD build (minified)
- `dist/*.d.ts` - TypeScript definitions

## License

MIT

## Links

- **Homepage:** https://www.trustline.id
- **Repository:** https://github.com/trustline-id/websdk
- **Issues:** https://github.com/trustline-id/websdk/issues
