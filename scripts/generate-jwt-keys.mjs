/**
 * Generate an EC P-256 key pair for Supabase ES256 JWT signing.
 *
 * Usage:  node scripts/generate-jwt-keys.mjs
 *
 * Output:
 *   - Prints the PRIVATE key (PEM) → paste into .env as JWT_PRIVATE_KEY
 *   - Prints the PUBLIC key (JWK)  → upload to Supabase Project Settings → JWT → Add Signing Key
 */

import crypto from 'node:crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

const privatePem = privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString()
  .trim();

const publicJwk = publicKey.export({ format: 'jwk' });

// Add JWK metadata required by Supabase
publicJwk.alg = 'ES256';
publicJwk.use = 'sig';
publicJwk.key_ops = ['verify'];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  EC P-256 KEY PAIR GENERATED');
console.log('═══════════════════════════════════════════════════════════════');
console.log();
console.log('1) PRIVATE KEY (PEM) — add to your .env files as JWT_PRIVATE_KEY');
console.log('   Replace newlines with \\n when pasting into .env');
console.log('───────────────────────────────────────────────────────────────');
console.log(privatePem);
console.log();
console.log('   One-liner for .env:');
console.log(`   JWT_PRIVATE_KEY="${privatePem.replace(/\n/g, '\\n')}"`);
console.log();
console.log('2) PUBLIC KEY (JWK) — upload to Supabase');
console.log('   Go to: Project Settings → JWT → Add Signing Key → Import JWK');
console.log('───────────────────────────────────────────────────────────────');
console.log(JSON.stringify(publicJwk, null, 2));
console.log();
console.log('═══════════════════════════════════════════════════════════════');
