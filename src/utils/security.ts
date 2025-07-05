/**
 * Security utilities and configurations
 */

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for Vite in dev
  'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Tailwind
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*'], // for dev server
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}

/**
 * Generate CSP header string
 */
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive
      }
      return `${directive} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

/**
 * Secure cookie options
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 86400 // 24 hours
}

/**
 * Generate a cryptographically secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash sensitive data (e.g., for storing API keys)
 */
export const hashSensitiveData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify data integrity using HMAC
 */
export const generateHMAC = async (
  data: string,
  secret: string
): Promise<string> => {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )
  
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify HMAC signature
 */
export const verifyHMAC = async (
  data: string,
  signature: string,
  secret: string
): Promise<boolean> => {
  const expectedSignature = await generateHMAC(data, secret)
  return expectedSignature === signature
}

/**
 * Sanitize URLs to prevent open redirect vulnerabilities
 */
export const sanitizeRedirectUrl = (url: string, allowedHosts: string[] = []): string | null => {
  try {
    const parsed = new URL(url, window.location.origin)
    
    // Allow relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url
    }
    
    // Check if the host is allowed
    const isAllowed = allowedHosts.some(host => 
      parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    )
    
    if (isAllowed || parsed.origin === window.location.origin) {
      return parsed.toString()
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * CSRF token management
 */
export class CSRFTokenManager {
  private static TOKEN_KEY = 'csrf_token'
  private static TOKEN_HEADER = 'X-CSRF-Token'
  
  static generateToken(): string {
    const token = generateSecureToken()
    sessionStorage.setItem(this.TOKEN_KEY, token)
    return token
  }
  
  static getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY)
  }
  
  static validateToken(token: string): boolean {
    const storedToken = this.getToken()
    return storedToken !== null && storedToken === token
  }
  
  static getHeader(): Record<string, string> {
    const token = this.getToken()
    if (!token) {
      throw new Error('CSRF token not found')
    }
    return { [this.TOKEN_HEADER]: token }
  }
}

/**
 * Secure storage wrapper with encryption (for sensitive client-side data)
 */
export class SecureStorage {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
  
  static async encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    )
    
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)
    
    return btoa(String.fromCharCode(...combined))
  }
  
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)
    
    const key = await this.deriveKey(password, salt)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}