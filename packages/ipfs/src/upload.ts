/**
 * Context uploader for IPFS
 */

import { IPFSHTTPClient } from 'ipfs-http-client';
import { ContextGraph, UploadOptions, IPFSConfig } from './types';

export class ContextUploader {
  constructor(
    private client: IPFSHTTPClient,
    private config: Required<IPFSConfig>
  ) {}

  async upload(context: ContextGraph, options: UploadOptions = {}): Promise<string> {
    // TODO: Implement compression if requested
    // TODO: Implement progress tracking
    // TODO: Handle encryption

    const data = JSON.stringify(context);
    const result = await this.client.add(data);

    // Auto-pin if configured or requested
    if (this.config.autoPinpin || options.pin) {
      await this.client.pin.add(result.cid);
    }

    return result.cid.toString();
  }
}
