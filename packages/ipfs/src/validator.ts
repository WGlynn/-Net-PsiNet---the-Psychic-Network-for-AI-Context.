/**
 * CID validator and content verifier
 */

import { IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import { IPFSConfig } from './types';

export class CIDValidator {
  constructor(
    private client: IPFSHTTPClient,
    private config: Required<IPFSConfig>
  ) {}

  async validate(cidString: string): Promise<{ valid: boolean; exists: boolean; size?: number }> {
    // Validate CID format
    let cid: CID;
    try {
      cid = CID.parse(cidString);
    } catch (error) {
      return { valid: false, exists: false };
    }

    // Check if content exists
    try {
      const stat = await this.client.object.stat(cid);
      return {
        valid: true,
        exists: true,
        size: stat.CumulativeSize,
      };
    } catch (error) {
      return { valid: true, exists: false };
    }
  }

  async getSize(cidString: string): Promise<number> {
    const cid = CID.parse(cidString);
    const stat = await this.client.object.stat(cid);
    return stat.CumulativeSize;
  }

  /**
   * Verify content hash matches CID
   */
  async verifyHash(cidString: string): Promise<boolean> {
    try {
      const cid = CID.parse(cidString);

      // Download content
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }

      // Re-add and compare CID
      const data = Buffer.concat(chunks);
      const result = await this.client.add(data, { onlyHash: true });

      return result.cid.toString() === cidString;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }
}
