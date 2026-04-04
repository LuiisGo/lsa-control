/**
 * Helpers de WebAuthn para el cliente.
 *
 * IMPORTANTE: todas las llamadas al backend van por /api/proxy
 * para evitar el error de CORS que ocurre cuando el browser
 * intenta llamar al Apps Script directamente.
 */

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

async function proxyCall<T = unknown>(
  action: string,
  data?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const body: Record<string, unknown> = { action, ...data }
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red'
    console.error(`[webauthn] ${action}:`, message)
    return { success: false, error: message }
  }
}

export async function isWebAuthnAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function webAuthnAuthenticate(): Promise<{
  token: string
  userId: string
  nombre: string
  email: string
  role: string
} | null> {
  try {
    const challengeRes = await proxyCall<{ challenge: string; rpId: string }>(
      'webauthn-challenge'
    )
    if (!challengeRes.success || !challengeRes.data) return null

    const { challenge, rpId } = challengeRes.data

    const assertionOptions: PublicKeyCredentialRequestOptions = {
      challenge: base64ToBuffer(challenge),
      rpId,
      timeout: 60000,
      userVerification: 'required',
    }

    const assertion = (await navigator.credentials.get({
      publicKey: assertionOptions,
    })) as PublicKeyCredential | null

    if (!assertion) return null

    const assertionResponse = assertion.response as AuthenticatorAssertionResponse

    const verifyRes = await proxyCall<{
      token: string
      userId: string
      nombre: string
      email: string
      role: string
    }>('webauthn-verify', {
      credentialId: bufferToBase64(assertion.rawId),
      clientDataJSON: bufferToBase64(assertionResponse.clientDataJSON),
      authenticatorData: bufferToBase64(assertionResponse.authenticatorData),
      signature: bufferToBase64(assertionResponse.signature),
    })

    if (!verifyRes.success || !verifyRes.data) return null
    return verifyRes.data
  } catch (err) {
    console.error('[webAuthnAuthenticate]', err)
    return null
  }
}

export async function webAuthnRegister(
  userId: string,
  userName: string,
  userEmail: string
): Promise<boolean> {
  try {
    const challengeRes = await proxyCall<{
      challenge: string
      rpId: string
      rpName: string
    }>('webauthn-challenge')
    if (!challengeRes.success || !challengeRes.data) return false

    const { challenge, rpId, rpName } = challengeRes.data

    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64ToBuffer(challenge),
      rp: { id: rpId, name: rpName || 'Control LSA' },
      user: {
        id: new TextEncoder().encode(userId),
        name: userEmail,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
    }

    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null

    if (!credential) return false

    const attestationResponse = credential.response as AuthenticatorAttestationResponse

    const saveRes = await proxyCall('saveWebAuthnCredential', {
      userId,
      credentialId: bufferToBase64(credential.rawId),
      publicKey: bufferToBase64(
        attestationResponse.getPublicKey() || new ArrayBuffer(0)
      ),
      clientDataJSON: bufferToBase64(attestationResponse.clientDataJSON),
      attestationObject: bufferToBase64(attestationResponse.attestationObject),
    })

    return saveRes.success === true
  } catch (err) {
    console.error('[webAuthnRegister]', err)
    return false
  }
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
