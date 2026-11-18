// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EIP712Signer } from '../src/types';

const API_URL = 'https://api.trustline.id/api/v0';
const AUTH_URL = 'https://auth.trustline.id';
const CLIENT_ID = 'client-123';

type Sdk = typeof import('../src/index').trustline;

/** Fresh SDK instance: the module exports a singleton, so reload it for every test. */
async function freshSdk(): Promise<Sdk> {
  vi.resetModules();
  return (await import('../src/index')).trustline;
}

async function initSdk(): Promise<Sdk> {
  const sdk = await freshSdk();
  sdk.init({ clientId: CLIENT_ID });
  return sdk;
}

const reply = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

let fetchMock: ReturnType<typeof vi.fn>;

/** Request number `i` sent through fetch: URL, init and parsed JSON body. */
function request(i: number) {
  const [url, init] = fetchMock.mock.calls[i] as [string, RequestInit];
  return { url, init, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
}

/** Lets pending promise callbacks (mocked fetch, res.json) run. */
async function flush() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

const web3 = {
  chainId: '84532',
  senderAddress: '0x1111111111111111111111111111111111111111',
  contractAddress: '0x2222222222222222222222222222222222222222',
  nativeAmount: '0',
  data: { functionPrototype: 'withdraw(uint256)', args: ['1'] },
};

describe('init', () => {
  it('rejects a missing client id', async () => {
    const sdk = await freshSdk();
    expect(() => sdk.init({ clientId: '' })).toThrow('Trustline: clientId is required');
    const el = document.createElement('div');
    expect(() => sdk.init(el)).toThrow('Trustline: clientId is required');
  });

  it('reads the client id from data attributes of an element', async () => {
    const sdk = await freshSdk();
    const el = document.createElement('div');
    el.setAttribute('data-client_id', 'from-element');
    el.setAttribute('data-login_uri', 'https://app.example/callback');
    sdk.init(el);

    fetchMock.mockResolvedValueOnce(reply({ jsonrpc: '2.0', id: 1, result: { success: true } }));
    await sdk.fetchDefaultPolicy({ chainId: '1', contractAddress: web3.contractAddress, data: '0x' });
    expect(request(0).body.params.clientId).toBe('from-element');
  });

  it('exposes the singleton on window for the UMD build', async () => {
    const sdk = await freshSdk();
    expect((window as unknown as { trustline: Sdk }).trustline).toBe(sdk);
  });
});

describe('before init', () => {
  it.each([
    ['validate', (sdk: Sdk) => sdk.validate(web3)],
    ['fetchPolicy', (sdk: Sdk) => sdk.fetchPolicy(web3)],
    ['fetchDefaultPolicy', (sdk: Sdk) => sdk.fetchDefaultPolicy(web3)],
    ['configurePolicy', (sdk: Sdk) => sdk.configurePolicy({ ...web3, signerAddress: web3.senderAddress, policyType: 'IPLocationPolicy', customization: {} }, vi.fn())],
  ])('%s refuses to run and sends nothing', async (_name, call) => {
    const sdk = await freshSdk();
    await expect(call(sdk)).rejects.toThrow('Trustline: SDK not initialized');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticate() checks init, then reports it is not implemented', async () => {
    const sdk = await freshSdk();
    expect(() => sdk.authenticate()).toThrow('Trustline: SDK not initialized');
    sdk.init({ clientId: CLIENT_ID });
    expect(() => sdk.authenticate()).toThrow('not implemented');
  });
});

describe('fetchPolicy', () => {
  it('sends a JSON-RPC request with the configured client id', async () => {
    const sdk = await initSdk();
    const response = { jsonrpc: '2.0', id: 1, result: { success: true, policy: { type: 'IPLocationPolicy' } } };
    fetchMock.mockResolvedValueOnce(reply(response));

    // A clientId smuggled in the params must not replace the configured one.
    const result = await sdk.fetchPolicy({ ...web3, validationMode: 'dapp', clientId: 'other' } as never);

    expect(result).toEqual(response);
    const { url, init, headers, body } = request(0);
    expect(url).toBe(API_URL);
    expect(init.method).toBe('POST');
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
    expect(body).toEqual({
      jsonrpc: '2.0',
      method: 'fetchPolicy',
      id: 1,
      params: { ...web3, validationMode: 'dapp', clientId: CLIENT_ID },
    });
  });

  it.each(['chainId', 'senderAddress', 'contractAddress', 'nativeAmount', 'data'])('requires %s', async (field) => {
    const sdk = await initSdk();
    await expect(sdk.fetchPolicy({ ...web3, [field]: '' })).rejects.toThrow(`Trustline: ${field} is required`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('wraps network failures', async () => {
    const sdk = await initSdk();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(sdk.fetchPolicy(web3)).rejects.toThrow('Trustline: Failed to fetch policy: Failed to fetch');
  });
});

describe('fetchDefaultPolicy', () => {
  it('only sends the fields the default policy depends on', async () => {
    const sdk = await initSdk();
    fetchMock.mockResolvedValueOnce(reply({ jsonrpc: '2.0', id: 1, result: { success: true } }));
    await sdk.fetchDefaultPolicy({ ...web3, data: '0xABCD' });
    expect(request(0).body).toEqual({
      jsonrpc: '2.0',
      method: 'fetchDefaultPolicy',
      id: 1,
      params: { chainId: '84532', contractAddress: web3.contractAddress, data: '0xABCD', clientId: CLIENT_ID },
    });
  });

  it.each(['chainId', 'contractAddress', 'data'])('requires %s', async (field) => {
    const sdk = await initSdk();
    await expect(sdk.fetchDefaultPolicy({ ...web3, [field]: '' })).rejects.toThrow(`Trustline: ${field} is required`);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('configurePolicy', () => {
  const params = {
    ...web3,
    chainId: '0x14a34', // 84532
    signerAddress: '0x3333333333333333333333333333333333333333',
    data: '0xABCDEF',
    validationMode: null,
    policyType: 'IPLocationPolicy',
    customization: { allowedCountries: ['FR'] },
  };

  it('signs the EIP-712 payload and sends the signature', async () => {
    const sdk = await initSdk();
    const signer = vi.fn<EIP712Signer>().mockResolvedValue('0xsig');
    fetchMock.mockResolvedValueOnce(reply({ jsonrpc: '2.0', id: 1, result: { success: true } }));

    await sdk.configurePolicy(params, signer);

    expect(signer).toHaveBeenCalledTimes(1);
    const [domain, types, message] = signer.mock.calls[0];
    expect(domain).toEqual({
      name: 'TrustLine Policy Configuration',
      version: '1',
      chainId: 84532n,
      verifyingContract: '0x0000000000000000000000000000000000000000',
    });
    expect(types.ConfigurePolicy.map((f) => f.name)).toEqual([
      'chainId', 'senderAddress', 'contractAddress', 'nativeAmount', 'data', 'validationMode', 'policyType', 'customization',
    ]);
    expect(message).toEqual({
      chainId: '0x14a34',
      senderAddress: params.signerAddress, // the signer, not the sender
      contractAddress: params.contractAddress,
      nativeAmount: '0',
      data: '0xabcdef', // raw data is lowercased for signing
      validationMode: '',
      policyType: 'IPLocationPolicy',
      customization: '{"allowedCountries":["FR"]}',
    });

    const { body } = request(0);
    expect(body.method).toBe('configurePolicy');
    expect(body.params).toMatchObject({
      signerAddress: params.signerAddress,
      senderAddress: params.senderAddress,
      data: '0xABCDEF',
      customization: params.customization,
      clientId: CLIENT_ID,
      signature: '0xsig',
    });
  });

  it('signs structured data as JSON', async () => {
    const sdk = await initSdk();
    const signer = vi.fn<EIP712Signer>().mockResolvedValue('0xsig');
    fetchMock.mockResolvedValueOnce(reply({ jsonrpc: '2.0', id: 1, result: { success: true } }));
    await sdk.configurePolicy({ ...params, chainId: '1', data: { functionPrototype: 'withdraw(uint256)', args: ['1'] } }, signer);
    expect(signer.mock.calls[0][0].chainId).toBe(1n);
    expect(signer.mock.calls[0][2].data).toBe('{"functionPrototype":"withdraw(uint256)","args":["1"]}');
  });

  it('does not send anything when signing fails', async () => {
    const sdk = await initSdk();
    const signer = vi.fn<EIP712Signer>().mockRejectedValue(new Error('user rejected'));
    await expect(sdk.configurePolicy(params, signer)).rejects.toThrow('Trustline: Failed to sign EIP-712 message: user rejected');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['chainId', 'senderAddress', 'signerAddress', 'contractAddress', 'nativeAmount', 'data', 'policyType', 'customization'])(
    'requires %s before asking for a signature',
    async (field) => {
      const sdk = await initSdk();
      const signer = vi.fn<EIP712Signer>();
      await expect(sdk.configurePolicy({ ...params, [field]: field === 'customization' ? undefined : '' } as never, signer)).rejects.toThrow(
        `Trustline: ${field} is required`,
      );
      expect(signer).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('rejects a malformed chain id before signing', async () => {
    const sdk = await initSdk();
    const signer = vi.fn<EIP712Signer>();
    await expect(sdk.configurePolicy({ ...params, chainId: 'mainnet' }, signer)).rejects.toThrow();
    expect(signer).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('validate', () => {
  const approved = { jsonrpc: '2.0', id: 1, result: { status: 'approved', certId: 'cert-1' } };
  const session = (result: Record<string, unknown>) => reply({ jsonrpc: '2.0', id: 1, result: { success: true, sessionId: 'sess-1', ...result } });

  it('opens a session, then validates it without credentials when no auth is required', async () => {
    const sdk = await initSdk();
    fetchMock.mockResolvedValueOnce(session({ authRequired: false })).mockResolvedValueOnce(reply(approved));

    const web2 = { actionId: 'action-1', policyData: { amount: 10 } };
    await expect(sdk.validate(web2)).resolves.toEqual(approved);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(request(0).url).toBe(API_URL);
    expect(request(0).body).toEqual({ jsonrpc: '2.0', method: 'openSession', id: 1, params: { clientId: CLIENT_ID, ...web2 } });
    expect(request(1).url).toBe(API_URL);
    expect(request(1).body).toEqual({ jsonrpc: '2.0', method: 'validate', id: 1, params: { sessionId: 'sess-1' } });
    expect(request(1).headers).not.toHaveProperty('Authorization');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('uses a caller-provided JWT as bearer token without opening the auth UI', async () => {
    const sdk = await initSdk();
    fetchMock.mockResolvedValueOnce(session({ authRequired: true })).mockResolvedValueOnce(reply(approved));
    await sdk.validate(web3, 'jwt-from-app');
    expect(request(1).headers.Authorization).toBe('Bearer jwt-from-app');
    expect(document.querySelector('iframe')).toBeNull();
  });

  it.each([
    ['a JSON-RPC error', { jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Unknown client' } }, 'Failed to open session: Unknown client'],
    ['success: false', { jsonrpc: '2.0', id: 1, result: { success: false, error: 'Policy not found' } }, 'Failed to open session: Policy not found'],
    ['no session id', { jsonrpc: '2.0', id: 1, result: { success: true } }, 'Failed to open session: Missing sessionId'],
  ])('stops when openSession returns %s', async (_name, response, message) => {
    const sdk = await initSdk();
    fetchMock.mockResolvedValueOnce(reply(response));
    await expect(sdk.validate(web3)).rejects.toThrow(message);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wraps openSession network failures', async () => {
    const sdk = await initSdk();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(sdk.validate(web3)).rejects.toThrow('Trustline: Failed to open session: Failed to fetch');
  });
});

describe('validate with interactive authentication', () => {
  const approved = { jsonrpc: '2.0', id: 1, result: { status: 'approved' } };

  async function startAuth() {
    const sdk = await initSdk();
    fetchMock
      .mockResolvedValueOnce(reply({ jsonrpc: '2.0', id: 1, result: { success: true, sessionId: 'sess-42', authRequired: true } }))
      .mockResolvedValueOnce(reply(approved));
    const pending = sdk.validate(web3);
    await flush();
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    return { pending, iframe: iframe! };
  }

  const post = (origin: string, data: unknown) => window.dispatchEvent(new MessageEvent('message', { origin, data }));

  it('shows the auth iframe and validates with the JWT it posts back', async () => {
    const { pending, iframe } = await startAuth();
    expect(iframe.src).toBe(`${AUTH_URL}/?sessionId=sess-42`);
    expect(iframe.getAttribute('allow')).toBe('publickey-credentials-get; publickey-credentials-create');
    expect(document.body.style.overflow).toBe('hidden');

    post(AUTH_URL, { type: 'JWT_TOKEN', jwt: 'jwt-1' });

    await expect(pending).resolves.toEqual(approved);
    expect(request(1).headers.Authorization).toBe('Bearer jwt-1');
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('ignores messages from other origins and malformed messages', async () => {
    const { pending } = await startAuth();

    post('https://evil.example', { type: 'JWT_TOKEN', jwt: 'forged' });
    post('https://auth.trustline.id.evil.example', { type: 'JWT_TOKEN', jwt: 'forged' });
    post('http://auth.trustline.id', { type: 'JWT_TOKEN', jwt: 'forged' });
    post(AUTH_URL, { type: 'OTHER', jwt: 'forged' });
    post(AUTH_URL, { type: 'JWT_TOKEN', jwt: 123 });
    post(AUTH_URL, 'JWT_TOKEN');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).not.toBeNull();

    post(AUTH_URL, { type: 'JWT_TOKEN', jwt: 'genuine' });
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(request(1).headers.Authorization).toBe('Bearer genuine');
  });

  it('rejects when the user closes the overlay', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { pending } = await startAuth();
    document.querySelector<HTMLButtonElement>('button')!.click();

    await expect(pending).rejects.toThrow('Trustline: Authentication was cancelled by user');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).toBeNull();
    expect(removeListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('times out after 5 minutes', async () => {
    vi.useFakeTimers();
    const { pending } = await startAuth();
    const outcome = expect(pending).rejects.toThrow('Trustline: Authentication timeout');

    await vi.advanceTimersByTimeAsync(299_000);
    expect(document.querySelector('iframe')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1_000);

    await outcome;
    expect(document.querySelector('iframe')).toBeNull();
    // A late token must not trigger a validation.
    post(AUTH_URL, { type: 'JWT_TOKEN', jwt: 'late' });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
