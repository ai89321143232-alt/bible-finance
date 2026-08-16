// ============================================================
// webPush.ts — Shared Web Push логика (RFC 8291 + VAPID)
// ============================================================
// Используется backend-функциями для отправки push-уведомлений
// в PWA (Safari iOS 16.4+, Android Chrome) и нативные сборки (APK).
// ============================================================

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPwqEPUUL7czTnpEy_kKQ0NnVQ7GD1NBsbPHaFkeqAFk1V7LggPXD-d0ZGjU8gt3ghOXonlimbbo9bcYWnwTdy0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '6PyOB0pLH5IXCaaIeYHVDBVyys-JUqYXMaCp2fyB9lY';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@biblefinance.app';

// --- Base64URL helpers ---

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- DER encoding for PKCS8 ---

function derLength(len: number): number[] {
  if (len < 0x80) return [len];
  if (len < 0x100) return [0x81, len];
  return [0x82, (len >> 8) & 0xff, len & 0xff];
}

function rawPrivateKeyToPkcs8(rawKey: Uint8Array): Uint8Array {
  // OID ecPublicKey (1.2.840.10045.2.1)
  const oidEc = [0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01];
  // OID prime256v1 (1.2.840.10045.3.1.7)
  const oidP256 = [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];

  const algIdContent = [...oidEc, ...oidP256];
  const algId = [0x30, ...derLength(algIdContent.length), ...algIdContent];

  // Private key OCTET STRING containing SEQUENCE { INTEGER 1, OCTET STRING rawKey }
  const octetStringContent = [0x04, rawKey.length, ...rawKey];
  const privSeqContent = [0x02, 0x01, 0x01, ...octetStringContent]; // INTEGER 1
  const privSeq = [0x30, ...derLength(privSeqContent.length), ...privSeqContent];
  const privOctet = [0x04, ...derLength(privSeq.length), ...privSeq];

  const topContent = [0x02, 0x01, 0x00, ...algId, ...privOctet];
  const pkcs8 = [0x30, ...derLength(topContent.length), ...topContent];
  return new Uint8Array(pkcs8);
}

// --- VAPID JWT ---

async function createVapidJwt(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud, exp, sub: VAPID_SUBJECT };

  const enc = new TextEncoder();
  const headerB64 = b64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;

  const privKeyBytes = b64urlDecode(VAPID_PRIVATE_KEY);
  const pkcs8Der = rawPrivateKeyToPkcs8(privKeyBytes);

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(data)
  );

  const signatureB64 = b64urlEncode(new Uint8Array(signature));
  return `${data}.${signatureB64}`;
}

// --- HKDF (RFC 5869) ---

async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

// --- Payload encryption (RFC 8291 / aes128gcm) ---

async function encryptPayload(
  payload: string,
  p256dh: string,
  authSecret: string
): Promise<Uint8Array> {
  // 1. Generate ephemeral ECDH P-256 key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // 2. Import client's public key
  const clientPublicKeyRaw = b64urlDecode(p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Compute shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeyPair.privateKey,
      256
    )
  );

  // 4. Export server public key (65 bytes, uncompressed)
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // 5. Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. IKM = authSecret || sharedSecret
  const authSecretBytes = b64urlDecode(authSecret);
  const ikm = new Uint8Array(authSecretBytes.length + sharedSecret.length);
  ikm.set(authSecretBytes);
  ikm.set(sharedSecret, authSecretBytes.length);

  // 7. key_info = "WebPush: info\0" || clientPublicKey || serverPublicKey
  const keyInfoPrefix = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = new Uint8Array(
    keyInfoPrefix.length + clientPublicKeyRaw.length + serverPublicKeyRaw.length
  );
  keyInfo.set(keyInfoPrefix);
  keyInfo.set(clientPublicKeyRaw, keyInfoPrefix.length);
  keyInfo.set(serverPublicKeyRaw, keyInfoPrefix.length + clientPublicKeyRaw.length);

  // 8. Content encryption key (16 bytes)
  const cek = await hkdfSha256(ikm, salt, keyInfo, 16);

  // 9. Nonce (12 bytes) — info = "Content-Encoding: nonce\0"
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await hkdfSha256(ikm, salt, nonceInfo, 12);

  // 10. Encrypt with AES-128-GCM
  const plaintext = new TextEncoder().encode(payload);
  // RFC 8291: append 0x02 padding byte
  const plaintextWithPad = new Uint8Array(plaintext.length + 1);
  plaintextWithPad.set(plaintext);
  plaintextWithPad[plaintext.length] = 0x02;

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      plaintextWithPad
    )
  );

  // 11. Package: salt(16) || serverPublicKey(65) || ciphertext+tag
  const result = new Uint8Array(16 + serverPublicKeyRaw.length + encrypted.length);
  result.set(salt);
  result.set(serverPublicKeyRaw, 16);
  result.set(encrypted, 16 + serverPublicKeyRaw.length);

  return result;
}

// --- Public API ---

export async function sendWebPushNotification(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: { title?: string; body?: string; icon?: string; tag?: string; data?: any }
): Promise<{ sent: boolean; statusCode?: number; reason?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { sent: false, reason: 'VAPID keys not configured' };
  }

  try {
    const jwt = await createVapidJwt(subscription.endpoint);
    const encrypted = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys_p256dh,
      subscription.keys_auth
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '2419200',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: encrypted,
    });

    if (response.ok || response.status === 201) {
      return { sent: true, statusCode: response.status };
    }
    return { sent: false, statusCode: response.status, reason: response.statusText };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

export async function sendPushToUser(
  base44: any,
  userId: string,
  payload: { title?: string; body?: string; icon?: string; tag?: string; data?: any }
): Promise<any[]> {
  // 1. Web Push (PWA — Safari iOS 16.4+, Android Chrome)
  const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
    user_id: userId,
    is_active: true,
  });

  const results = [];
  for (const sub of subscriptions) {
    const result = await sendWebPushNotification(sub, payload);
    results.push({ subscriptionId: sub.id, channel: 'web_push', ...result });

    // Mark expired subscriptions as inactive
    if (result.statusCode === 410 || result.statusCode === 404) {
      await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false });
    }
  }

  // 2. Native push (APK — requires native mobile build with push credentials)
  try {
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: userId,
      title: payload.title || 'Библия Финансов',
      content: payload.body || '',
    });
    results.push({ channel: 'native_push', sent: true });
  } catch (e) {
    results.push({ channel: 'native_push', sent: false, reason: 'Native build not configured' });
  }

  return results;
}