/**
 * Main ΨNet IPFS Client
 *
 * Provides a unified interface for all IPFS operations
 */

import { create as createIPFSClient, IPFSHTTPClient } from 'ipfs-http-client';
import { ContextUploader } from './upload';
import { ContextDownloader } from './download';
import { PinManager } from './pin';
import { CIDValidator } from './validator';
import { IPFSConfig, ContextGraph, UploadOptions, DownloadOptions } from './types';
import { CID } from 'multiformats/cid';

/**
 * Main ΨNet IPFS client
 *
 * @example
 * ```typescript
 * const ipfs = new PsiNetIPFS({
 *   apiUrl: 'http://localhost:5001',
 *   gatewayUrl: 'http://localhost:8080'
 * });
 *
 * // Upload context
 * const cid = await ipfs.upload(contextGraph, { pin: true });
 *
 * // Download context
 * const context = await ipfs.download(cid);
 *
 * // Check if pinned
 * const pinned = await ipfs.isPinned(cid);
 * ```
 */
export class PsiNetIPFS {
  private client: IPFSHTTPClient;
  private config: Required<IPFSConfig>;
  private uploader: ContextUploader;
  private downloader: ContextDownloader;
  private pinManager: PinManager;
  private validator: CIDValidator;

  constructor(config: IPFSConfig = {}) {
    // Set defaults
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:5001',
      gatewayUrl: config.gatewayUrl || 'http://localhost:8080',
      timeout: config.timeout || 30000,
      autoPinpin: config.autoPinpin ?? true,
    };

    // Create IPFS client
    this.client = createIPFSClient({
      url: this.config.apiUrl,
      timeout: this.config.timeout,
    });

    // Initialize modules
    this.uploader = new ContextUploader(this.client, this.config);
    this.downloader = new ContextDownloader(this.client, this.config);
    this.pinManager = new PinManager(this.client);
    this.validator = new CIDValidator(this.client, this.config);
  }

  /**
   * Upload a context graph to IPFS
   *
   * @param context - The context graph to upload
   * @param options - Upload options
   * @returns The CID of the uploaded context
   *
   * @example
   * ```typescript
   * const cid = await ipfs.upload(contextGraph, {
   *   pin: true,
   *   compress: true,
   *   onProgress: (progress) => console.log(`${progress.percentage}%`)
   * });
   * ```
   */
  async upload(context: ContextGraph, options?: UploadOptions): Promise<string> {
    return this.uploader.upload(context, options);
  }

  /**
   * Download a context graph from IPFS
   *
   * @param cid - The CID of the context to download
   * @param options - Download options
   * @returns The downloaded context graph
   *
   * @example
   * ```typescript
   * const context = await ipfs.download(cid, {
   *   verifyHash: true,
   *   decompress: true
   * });
   * ```
   */
  async download(cid: string, options?: DownloadOptions): Promise<ContextGraph> {
    return this.downloader.download(cid, options);
  }

  /**
   * Pin a context to ensure persistence
   *
   * @param cid - The CID to pin
   * @returns True if successfully pinned
   */
  async pin(cid: string): Promise<boolean> {
    return this.pinManager.pin(cid);
  }

  /**
   * Unpin a context
   *
   * @param cid - The CID to unpin
   * @returns True if successfully unpinned
   */
  async unpin(cid: string): Promise<boolean> {
    return this.pinManager.unpin(cid);
  }

  /**
   * Check if a context is pinned
   *
   * @param cid - The CID to check
   * @returns True if pinned
   */
  async isPinned(cid: string): Promise<boolean> {
    return this.pinManager.isPinned(cid);
  }

  /**
   * Validate a CID and check if content exists
   *
   * @param cid - The CID to validate
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = await ipfs.validate(cid);
   * if (result.valid && result.exists) {
   *   console.log(`CID is valid and content exists (${result.size} bytes)`);
   * }
   * ```
   */
  async validate(cid: string): Promise<{ valid: boolean; exists: boolean; size?: number }> {
    return this.validator.validate(cid);
  }

  /**
   * Get the size of content
   *
   * @param cid - The CID to check
   * @returns Size in bytes
   */
  async getSize(cid: string): Promise<number> {
    return this.validator.getSize(cid);
  }

  /**
   * List all pinned CIDs
   *
   * @returns Array of pinned CIDs
   */
  async listPinned(): Promise<string[]> {
    return this.pinManager.listPinned();
  }

  /**
   * Get IPFS node ID and info
   *
   * @returns Node information
   */
  async getNodeInfo(): Promise<any> {
    return this.client.id();
  }

  /**
   * Close the IPFS client connection
   */
  async close(): Promise<void> {
    // IPFS HTTP client doesn't need explicit closing
    // but we provide this for consistency
  }
}

export default PsiNetIPFS;
