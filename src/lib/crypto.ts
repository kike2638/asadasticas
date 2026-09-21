import crypto from 'crypto';

// La clave maestra DEBE estar en variables de entorno (.env)
// Genera una con: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
const MASTER_KEY = process.env.MASTER_KEY;
if (!MASTER_KEY) {
  throw new Error(
    'MASTER_KEY no está definida en las variables de entorno. ' +
    'Genera una con: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
  );
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(MASTER_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const key = Buffer.from(MASTER_KEY, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
