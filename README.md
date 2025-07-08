# Trustline Web SDK

A JavaScript/TypeScript SDK for integrating Trustline Web3 and Web2 action validation into any web app (React, Angular, Vue, Vanilla JS, etc).

## Installation

```sh
npm install @trustline.id/websdk
```

## Usage

### React / Next.js / Vue / Angular

```js
import { trustline } from '@trustline.id/websdk';

trustline.init({
  clientId: 'YOUR_TRUSTLINE_CLIENT_ID',
  loginUri: 'https://yourapp.com/auth/trustline/callback', // optional
});

// Validate a Web3 transaction
const response = await trustline.validate({
  chainId: '1',
  senderAddress: '0x...',
  contractAddress: '0x...',
  nativeAmount: '100',
  data: {
    functionSelector: '0x...',
    args: [/* ... */],
  },
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
  trustline.validate({ /* ... */ }).then(function(response) {
    // handle response
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

## API

### `trustline.init(options | HTMLElement)`
- `options`: `{ clientId: string, loginUri?: string }`
- or pass a DOM element with `data-client_id` and optional `data-login_uri` attributes.

### `trustline.validate(params)`
- Web3: `{ chainId, senderAddress, contractAddress, nativeAmount, data }`
- Web2: `{ actionId, policyData }`
- Returns a Promise resolving to the validation response.

### `trustline.authenticate()`
- Triggers Trustlines's authentication flow.

## Build

```sh
npm run build
```

## License
MIT
