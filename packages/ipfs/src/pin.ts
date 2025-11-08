/**
 * Pin manager for IPFS content persistence
 */

import { IPFSHTTPClient } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';

export class PinManager {
  constructor(private client: IPFSHTTPClient) {}

  async pin(cidString: string): Promise<boolean> {
    try {
      const cid = CID.parse(cidString);
      await this.client.pin.add(cid);
      return true;
    } catch (error) {
      console.error('Failed to pin:', error);
      return false;
    }
  }

  async unpin(cidString: string): Promise<boolean> {
    try {
      const cid = CID.parse(cidString);
      await this.client.pin.rm(cid);
      return true;
    } catch (error) {
      console.error('Failed to unpin:', error);
      return false;
    }
  }

  async isPinned(cidString: string): Promise<boolean> {
    try {
      const cid = CID.parse(cidString);
      for await (const pin of this.client.pin.ls({ paths: [cid] })) {
        if (pin.cid.toString() === cidString) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async listPinned(): Promise<string[]> {
    const pins: string[] = [];
    for await (const pin of this.client.pin.ls()) {
      pins.push(pin.cid.toString());
    }
    return pins;
  }
}
