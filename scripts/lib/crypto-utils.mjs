import crypto from 'node:crypto';

export const sha256 = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
