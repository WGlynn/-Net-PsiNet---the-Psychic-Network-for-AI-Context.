/**
 * Context downloader from IPFS
 */

import { IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { ContextGraph, DownloadOptions, IPFSConfig } from './types';

export class ContextDownloader {
  constructor(
    private client: IPFSHTTPClient,
    private config: Required<IPFSConfig>
  ) {}

  async download(cidString: string, options: DownloadOptions = {}): Promise<ContextGraph> {
    // TODO: Implement progress tracking
    // TODO: Implement decompression
    // TODO: Implement hash verification

    const cid = CID.parse(cidString);
    const chunks: Uint8Array[] = [];

    for await (const chunk of this.client.cat(cid)) {
      chunks.push(chunk);
    }

    const data = Buffer.concat(chunks).toString('utf-8');
    const context: ContextGraph = JSON.parse(data);

    return context;
  }
}
