import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const pem = process.env.JWT_PRIVATE_KEY;

if (!pem) {
  console.error('Error: JWT_PRIVATE_KEY is not defined in ../apps/web/.env.local');
  process.exit(1);
}

const key = crypto.createPrivateKey(pem.replace(/\\n/g, '\n'));
const jwk = key.export({ format: 'jwk' });
jwk.alg = 'ES256';
jwk.use = 'sig';
jwk.key_ops = ['sign'];

console.log(JSON.stringify(jwk, null, 2));
