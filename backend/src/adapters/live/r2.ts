import type { StorageProvider } from '../types.js';
import { config } from '../../config.js';
import { createHash, createHmac } from 'node:crypto';

/**
 * Cloudflare R2 via S3-compatible API with SigV4 signing (no SDK dependency —
 * keeps the worker image small and runs identically on Node and Containers).
 * Serving to clients should go through the R2 public bucket/custom domain or
 * presigned URLs; getUrl() returns the direct object URL for the worker.
 */

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export class R2Storage implements StorageProvider {
  private host = `${config.r2.accountId}.r2.cloudflarestorage.com`;

  private async signedFetch(method: string, key: string, body?: Uint8Array, contentType?: string): Promise<Response> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body ?? new Uint8Array()).digest('hex');
    const canonicalUri = `/${config.r2.bucket}/${key}`;
    const headers: Record<string, string> = {
      host: this.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...(contentType ? { 'content-type': contentType } : {}),
    };
    const signedHeaderNames = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderNames.map(h => `${h}:${headers[h]}\n`).join('');
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const kDate = hmac(`AWS4${config.r2.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, 'auto');
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign).toString('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.r2.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetch(`https://${this.host}${canonicalUri}`, {
      method,
      headers: { ...headers, authorization },
      body: body ? Buffer.from(body) : undefined,
    });
  }

  async put(key: string, data: Uint8Array, contentType: string): Promise<void> {
    const res = await this.signedFetch('PUT', key, data, contentType);
    if (!res.ok) throw new Error(`R2 put failed ${res.status}: ${await res.text()}`);
  }

  async getUrl(key: string): Promise<string> {
    return `https://${this.host}/${config.r2.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const res = await this.signedFetch('DELETE', key);
    if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed ${res.status}`);
  }
}
