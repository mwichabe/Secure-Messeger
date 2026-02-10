import * as crypto from 'crypto';

export class SecurityService {
  private static instance: SecurityService;

  private encryptionKey: string;

  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 12;
  private readonly TAG_LENGTH = 16;

  private constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Encrypts data using AES-256-GCM
   * @param data - Plaintext to encrypt
   * @returns JSON string containing base64-encoded ciphertext, IV and auth tag
   */
  public encrypt(data: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      Buffer.from(this.encryptionKey, 'utf8'), 
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data, 'utf8')),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    const payload = {
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      data: encrypted.toString('base64'),
      alg: this.ALGORITHM
    };

    return JSON.stringify(payload);
  }

  /**
   * Decrypts AES-256-GCM encrypted data
   * @param encryptedData - JSON string from encrypt()
   * @returns Decrypted plaintext
   * @throws Error if decryption or authentication fails
   */
  public decrypt(encryptedData: string): string {
    let payload: any;

    try {
      payload = JSON.parse(encryptedData);
    } catch {
      throw new Error('Invalid encrypted data format');
    }

    if (!payload.iv || !payload.tag || !payload.data) {
      throw new Error('Missing required encryption fields');
    }

    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const encrypted = Buffer.from(payload.data, 'base64');

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      Buffer.from(this.encryptionKey, 'utf8'),
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  public validateMessage(message: unknown): message is {
    chatId: string;
    messageId: string;
    ts: number;
    sender: string;
    body: string;
    [key: string]: unknown;
  } {
    console.log('Validating message:', message);
    
    if (!message || typeof message !== 'object') {
      console.log('Message is not an object or is null/undefined');
      return false;
    }

    const msg = message as Record<string, unknown>;
    console.log('Message keys:', Object.keys(msg));

    const requiredFields = ['chatId', 'messageId', 'ts', 'sender', 'body'] as const;
    
    for (const field of requiredFields) {
      if (!(field in msg)) {
        console.log(`Missing required field: ${field}`);
        return false;
      }
    }

    if (
      typeof msg.chatId !== 'string'     || msg.chatId.length === 0 ||
      typeof msg.messageId !== 'string' || msg.messageId.length === 0 ||
      typeof msg.ts !== 'number'        || msg.ts <= 0 ||
      typeof msg.sender !== 'string'     || msg.sender.length === 0 ||
      typeof msg.body !== 'string'      || msg.body.length === 0
    ) {
      console.log('Field validation failed:', {
        chatId: typeof msg.chatId,
        messageId: typeof msg.messageId,
        ts: typeof msg.ts,
        sender: typeof msg.sender,
        body: typeof msg.body,
        chatIdValue: msg.chatId,
        messageIdValue: msg.messageId,
        tsValue: msg.ts,
        senderValue: msg.sender,
        bodyValue: msg.body
      });
      return false;
    }

    // Reasonable upper bounds
    if (msg.body.length > 8192) return false;
    if (msg.sender.length > 256) return false;

    console.log('Message validation passed');
    return true;
  }

  public sanitizeForLogging<T>(data: T): T | any {
    if (typeof data === 'string') {
      return '[REDACTED]';
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('secret') ||
          ['body', 'message', 'content', 'text', 'data', 'payload'].includes(lowerKey)
        ) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeForLogging(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  }

  public generateSecureId(): string {
    const timestamp = Date.now();
    const entropy = crypto.randomBytes(16).toString('hex');
    return `msg_${timestamp}_${entropy}`;
  }

  public generateSalt(): Buffer {
    return crypto.randomBytes(32);
  }

  // Placeholder — implement proper key derivation when needed
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 600_000, 32, 'sha256');
  }
}

export const securityService = SecurityService.getInstance();