# Trustline Web SDK

A JavaScript/TypeScript SDK for integrating Trustline Web3 and Web2 action validation into any web app (React, Angular, Vue, Vanilla JS, etc).

Supports **EVM** and **Stellar (Soroban)** intents: the same `validate()` flow pre-validates an action off-chain; on approval the backend can publish an oracle proof that the on-chain contract consumes (e.g. via `require_trustline*`).

## Features

- ✅ **Web3 Transaction Validation** - Validate blockchain transactions with customizable policies
- ✅ **Web2 Action Validation** - Validate off-chain actions and operations
- ✅ **Policy Configuration** - Customize validation policies for specific transaction contexts
- ✅ **Policy Fetching** - Retrieve resolved and default policies before validation
- ✅ **Session Management** - Open sessions for transaction validation flows
- ✅ **Authentication Flow** - Integrated JWT authentication with popup/iframe support
- ✅ **Multiple Validation Modes** - Support for Uniswap V4, Morpho V2, ERC-3643, and custom dapp modes (Stellar uses `dapp` today)
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

// Validate an EVM transaction
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

// Validate a Stellar / Soroban intent (then sign the on-chain invoke, e.g. with Freighter)
const stellarResponse = await trustline.validate({
  chainId: '2', // Stellar testnet (1=mainnet, 2=testnet, 3=futurenet)
  senderAddress: 'G...',
  contractAddress: 'C...', // protocol / firewall contract
  nativeAmount: '0', // stroops as decimal string; "0" when no XLM is bound into the intent
  data: {
    functionPrototype: 'forward(symbol,vec<>)',
    args: ['bump', []]
  },
  validationMode: 'dapp',
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
  chainId: string | number;       // EVM chain id, or Stellar: "1" mainnet / "2" testnet / "3" futurenet
  senderAddress: string;          // EVM 0x…, or Stellar G…
  contractAddress: string;        // EVM contract, or Soroban protocol contract C… (not the VE)
  nativeAmount: string;           // EVM value, or stroops decimal string for Stellar
  data: {
    functionPrototype?: string;
    args?: any[];                 // Positional values; Stellar types must be explicit in functionPrototype
  } | string;                     // Raw hex (`0x…`): EVM calldata, or Stellar canonical intent bytes
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

Approved payload shape (SDK typically exposes it under `response.result`):

```typescript
{
  status: 'approved',
  certId: '...',
  attestation: {
    timestamp: '...',         // ISO-8601
    policyHash: '...',
    signature?: '0x...'       // EVM only
  }
}
```

**Example (EVM):**
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

**Example (Stellar - Firewall `forward` / bump):**
```typescript
const response = await trustline.validate({
  chainId: '2',
  senderAddress: 'G...',
  contractAddress: 'C...', // firewall / protocol contract id
  nativeAmount: '0',
  validationMode: 'dapp',
  data: {
    functionPrototype: 'forward(symbol,vec<>)',
    args: ['bump', []]
  }
});

if ('result' in response && response.result.status === 'approved') {
  // Then sign the matching on-chain invoke (e.g. Freighter):
  // forward(fn_name="bump", args=[])
  console.log('Approved', response.result.certId);
}
```

**Example (Stellar - Payment Forwarder `pay_native`, 1 XLM):**
```typescript
const response = await trustline.validate({
  chainId: '2',
  senderAddress: 'G...',
  contractAddress: 'C...', // payment forwarder contract id
  nativeAmount: '10000000', // 1 XLM in stroops
  validationMode: 'dapp',
  data: {
    functionPrototype: 'pay_native(address,address,i128)',
    args: [
      'C...', // native SAC
      'G...', // destination
      '10000000'
    ]
  }
});
```

### `trustline.configurePolicy(params, signer)`

Configure a policy customization for a specific transaction context. Customizations are stored and applied during validation when matching transaction parameters are detected.

> **EVM only today.** Backend `configurePolicy` uses EIP-712 + EVM actionId/hash helpers.

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

> **EVM-oriented today.** Same limitation as `configurePolicy`: actionId/hash are computed with EVM helpers, so results are not reliable for Stellar contexts.

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

> **EVM-oriented today** (same caveat as `fetchPolicy`).

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

- **`dapp`** (default) - Custom dapp validation mode - **required for Stellar / Soroban today**
- **`uniswapv4`** - Uniswap V4 protocol validation (EVM)
- **`morphov2`** - Morpho V2 protocol validation (EVM)
- **`erc3643`** - ERC-3643 token standard validation (EVM)

On Stellar, `validationMode` maps to the on-chain intent hash domain (`mode_u32`; `dapp` → `0`).

## Transaction Data Format

The `data` field supports **raw** (`0x…` hex string) or **structured** (`{ functionPrototype, args }`). Both engines accept either form; semantics differ.

| Form | EVM | Stellar |
|------|-----|---------|
| **Structured** | ABI-encoded via prototype + **positional** args | Explicit types in `functionPrototype` + **positional** args → local `encode_intent` (no value inference) |
| **Raw** | `msg.data` calldata as-is | Hex of **pre-canonicalized intent bytes** |

Use **structured** for Stellar in normal integrations. Raw Stellar is only for opaque bytes you already computed to match on-chain `require_trustline*` - it skips SCVal conversion / intent helpers.

### Raw Data
```typescript
data: '0x...' // EVM calldata, or Stellar canonical intent bytes
```

### Structured Data (same shape for EVM and Stellar)

**EVM:** types come from `functionPrototype`; `args` are positional values (no `{ type, value }` wrappers).

**Stellar:** types must be **fully explicit** in `functionPrototype` (no SEP-48 fetch, no value inference). `args` are values only. Named structs use `struct{field:type,…}` (field names required for the ScMap); JSON may be an object **or** a positional array. `vec<T>` = homogeneous; `vec<T1,T2,…>` = heterogeneous `Vec<Val>` (e.g. firewall `forward` args); `vec<>` = empty vec only.

```typescript
// EVM — types from the prototype string
data: {
  functionPrototype: 'withdraw(uint256)',
  args: ['1']
}

// Stellar — empty forward payload
data: {
  functionPrototype: 'forward(symbol,vec<>)',
  args: ['bump', []]
}

data: {
  functionPrototype: 'pay_native(address,address,i128)',
  args: ['C...', 'G...', '10000000']
}

// Stellar — Blend submit (homogeneous vec of structs), positional struct values
data: {
  functionPrototype:
    'submit(address,address,vec<struct{address:address,amount:i128,request_type:u32}>)',
  args: [
    'G...FROM',
    'G...SPENDER',
    [
      ['C...ASSET', '10000000', 2],
      ['C...OTHER', '5000000', 0]
    ]
  ]
}

// Same structs as named objects (equivalent XDR)
data: {
  functionPrototype:
    'submit(address,address,vec<struct{address:address,amount:i128,request_type:u32}>)',
  args: [
    'G...FROM',
    'G...SPENDER',
    [
      { address: 'C...ASSET', amount: '10000000', request_type: 2 },
      { address: 'C...OTHER', amount: '5000000', request_type: 0 }
    ]
  ]
}

// Stellar — Blend via firewall forward (heterogeneous vec = Vec<Val> bag)
data: {
  functionPrototype:
    'forward(symbol,vec<address,address,vec<struct{address:address,amount:i128,request_type:u32}>>)',
  args: [
    'submit',
    [
      'G...FROM',
      'G...SPENDER',
      [['C...ASSET', '10000000', 2]]
    ]
  ]
}
```

| Stellar prototype type | JSON value |
|------------------------|------------|
| `address` / `symbol` / `string` | string (addresses `G…`/`C…`) |
| `bytes` / `bytesN` / `bytesN<N>` | hex string: `"0xab…"`, empty → `"0x"` or `""` (**not** a JSON array of numbers) |
| integers (`i128`, `u64`, …) | decimal string (preferred) or number |
| `bool` | boolean |
| `vec<T>` | JSON array of `T` |
| `vec<T1,T2,…>` | JSON array of length N (heterogeneous `Vec<Val>`) |
| `vec<>` | `[]` only |
| `tuple` / `(T1,T2)` | JSON array |
| `map<K,V>` | `[[k,v], …]` or a JSON object (string/symbol keys) |
| `option<T>` | `null` (none) or a value of type `T` |
| `struct{field:type,…}` | `{ field: value, … }` **or** `[v0, v1, …]` in field declaration order → ScMap |

**Field semantics on Stellar:**

| Field | Meaning |
|-------|---------|
| `chainId` | Logical Trustline chain id for the Stellar network (see mapping below) |
| `senderAddress` | Stellar account (`G…`) that will `require_auth` as business sender |
| `contractAddress` | Protocol / firewall / forwarder contract (`C…`), **not** the Validation Engine |
| `nativeAmount` | Intent `value` as decimal stroops string (`"0"` if none) |

**Stellar `chainId` → network:**

| `chainId` | Network |
|-----------|---------|
| `"1"` | Mainnet |
| `"2"` | Testnet |
| `"3"` | Futurenet |

After `validate` succeeds with `status: 'approved'`, the user signs the **matching** on-chain invoke (same sender, protocol, value, and canonical `data`). The SDK does not build or submit Soroban transactions.

Structured data is also JSON-stringified for EIP-712 signing in `configurePolicy` (**EVM only**). No ABI encoding is required from the app for validation.

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
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **Issues:** https://github.com/trustline-id/websdk/issues
