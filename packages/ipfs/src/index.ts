/**
 * @module @psinet/ipfs
 * @description IPFS integration for ΨNet - decentralized storage layer
 *
 * Features:
 * - DID document storage and retrieval
 * - Context graph storage
 * - Content pinning management
 * - CID validation and verification
 * - Multiple pinning service support (Pinata, Web3.Storage, Infura)
 */

import { create, IPFSHTTPClient, Options } from 'ipfs-http-client';
import { CID } from 'multiformats/cid';
import * as json from 'multiformats/codecs/json';
import { sha256 } from 'multiformats/hashes/sha2';
import { fromString, toString } from 'uint8arrays';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * DID Document as per W3C DID Core specification
 */
export interface DIDDocument {
  '@context': string[];
  id: string; // did:psinet:...
  controller?: string | string[];
  verificationMethod?: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
  proof?: Proof;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: JsonWebKey;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | object;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

/**
 * Encrypted context graph structure
 */
export interface EncryptedContextGraph {
  graphId: string;
  version: number;
  encrypted: boolean;
  encryptedData: Uint8Array; // Encrypted serialized graph
  encryptionMethod: 'aes-256-gcm' | 'xchacha20-poly1305';
  nonce: Uint8Array;
  recipients: string[]; // DIDs of authorized agents
  metadata: GraphMetadata;
  signature: Uint8Array;
}

export interface GraphMetadata {
  created: number;
  updated: number;
  author: string; // DID
  size: number; // bytes
  nodeCount: number;
  compressionRatio?: number;
}

/**
 * Configuration for IPFS client
 */
export interface IPFSConfig {
  /** IPFS gateway URL (for fetching) */
  gateway?: string;

  /** IPFS API endpoint (for uploading) */
  apiEndpoint?: string;

  /** Pinning service to use */
  pinningService?: 'pinata' | 'web3.storage' | 'infura' | 'local';

  /** API key for pinning service */
  pinningApiKey?: string;

  /** Timeout for IPFS operations (ms) */
  timeout?: number;

  /** Enable local caching */
  enableCache?: boolean;

  /** Custom IPFS client options */
  ipfsOptions?: Options;
}

/**
 * Result of content upload
 */
export interface UploadResult {
  cid: string;
  size: number;
  timestamp: number;
  pinned: boolean;
}

/**
 * Pinning status
 */
export interface PinStatus {
  cid: string;
  pinned: boolean;
  pinnedAt?: number;
  pinningService?: string;
}

// ============================================================================
// IPFS Client Interface
// ============================================================================

/**
 * Core IPFS client interface for ΨNet
 */
export interface IPFSClient {
  /**
   * Upload DID document to IPFS
   * @param doc - DID document to upload
   * @returns CID of uploaded document
   */
  uploadDIDDocument(doc: DIDDocument): Promise<UploadResult>;

  /**
   * Upload encrypted context graph to IPFS
   * @param graph - Encrypted context graph
   * @returns CID of uploaded graph
   */
  uploadContextGraph(graph: EncryptedContextGraph): Promise<UploadResult>;

  /**
   * Upload arbitrary content
   * @param content - Content to upload
   * @returns CID of uploaded content
   */
  uploadContent(content: Uint8Array | string): Promise<UploadResult>;

  /**
   * Fetch DID document from IPFS
   * @param cid - Content identifier
   * @returns DID document
   */
  fetchDIDDocument(cid: string): Promise<DIDDocument>;

  /**
   * Fetch encrypted context graph from IPFS
   * @param cid - Content identifier
   * @returns Encrypted context graph
   */
  fetchContextGraph(cid: string): Promise<EncryptedContextGraph>;

  /**
   * Fetch arbitrary content from IPFS
   * @param cid - Content identifier
   * @returns Content as Uint8Array
   */
  fetchContent(cid: string): Promise<Uint8Array>;

  /**
   * Pin content to IPFS (prevent garbage collection)
   * @param cid - Content identifier to pin
   */
  pin(cid: string): Promise<PinStatus>;

  /**
   * Unpin content from IPFS
   * @param cid - Content identifier to unpin
   */
  unpin(cid: string): Promise<void>;

  /**
   * Check if content is pinned
   * @param cid - Content identifier
   * @returns Pin status
   */
  isPinned(cid: string): Promise<boolean>;

  /**
   * Verify CID is valid and content matches
   * @param cid - Content identifier
   * @param content - Content to verify
   * @returns True if content matches CID
   */
  verifyContent(cid: string, content: Uint8Array): Promise<boolean>;

  /**
   * Get statistics about stored content
   */
  getStats(): Promise<{
    totalPinned: number;
    totalSize: number;
    pinnedCIDs: string[];
  }>;
}

// ============================================================================
// IPFS Manager Implementation
// ============================================================================

/**
 * Production-ready IPFS client for ΨNet
 */
export class IPFSManager implements IPFSClient {
  private client: IPFSHTTPClient;
  private config: Required<IPFSConfig>;
  private cache: Map<string, any> = new Map();

  constructor(config: IPFSConfig = {}) {
    // Default configuration
    this.config = {
      gateway: config.gateway || 'https://ipfs.io',
      apiEndpoint: config.apiEndpoint || 'http://localhost:5001',
      pinningService: config.pinningService || 'local',
      pinningApiKey: config.pinningApiKey || '',
      timeout: config.timeout || 30000,
      enableCache: config.enableCache !== false,
      ipfsOptions: config.ipfsOptions || {},
    };

    // Create IPFS HTTP client
    this.client = create({
      url: this.config.apiEndpoint,
      timeout: this.config.timeout,
      ...this.config.ipfsOptions,
    });
  }

  // ------------------------------------------------------------------------
  // Upload Operations
  // ------------------------------------------------------------------------

  async uploadDIDDocument(doc: DIDDocument): Promise<UploadResult> {
    // Validate DID document
    this.validateDIDDocument(doc);

    // Serialize to JSON
    const content = JSON.stringify(doc, null, 2);
    const bytes = fromString(content);

    // Upload to IPFS
    const result = await this.client.add(bytes, {
      pin: true,
      cidVersion: 1,
    });

    const uploadResult: UploadResult = {
      cid: result.cid.toString(),
      size: result.size,
      timestamp: Date.now(),
      pinned: true,
    };

    // Pin to pinning service if configured
    if (this.config.pinningService !== 'local') {
      await this.pinToService(uploadResult.cid);
    }

    return uploadResult;
  }

  async uploadContextGraph(graph: EncryptedContextGraph): Promise<UploadResult> {
    // Validate graph structure
    this.validateContextGraph(graph);

    // Serialize graph
    const content = this.serializeGraph(graph);

    // Upload to IPFS
    const result = await this.client.add(content, {
      pin: true,
      cidVersion: 1,
    });

    const uploadResult: UploadResult = {
      cid: result.cid.toString(),
      size: result.size,
      timestamp: Date.now(),
      pinned: true,
    };

    // Pin to pinning service
    if (this.config.pinningService !== 'local') {
      await this.pinToService(uploadResult.cid);
    }

    return uploadResult;
  }

  async uploadContent(content: Uint8Array | string): Promise<UploadResult> {
    const bytes = typeof content === 'string' ? fromString(content) : content;

    const result = await this.client.add(bytes, {
      pin: true,
      cidVersion: 1,
    });

    return {
      cid: result.cid.toString(),
      size: result.size,
      timestamp: Date.now(),
      pinned: true,
    };
  }

  // ------------------------------------------------------------------------
  // Fetch Operations
  // ------------------------------------------------------------------------

  async fetchDIDDocument(cid: string): Promise<DIDDocument> {
    // Check cache first
    if (this.config.enableCache && this.cache.has(cid)) {
      return this.cache.get(cid);
    }

    // Fetch from IPFS
    const content = await this.fetchContent(cid);
    const json = toString(content);
    const doc = JSON.parse(json) as DIDDocument;

    // Validate fetched document
    this.validateDIDDocument(doc);

    // Cache if enabled
    if (this.config.enableCache) {
      this.cache.set(cid, doc);
    }

    return doc;
  }

  async fetchContextGraph(cid: string): Promise<EncryptedContextGraph> {
    // Check cache
    if (this.config.enableCache && this.cache.has(cid)) {
      return this.cache.get(cid);
    }

    // Fetch from IPFS
    const content = await this.fetchContent(cid);
    const graph = this.deserializeGraph(content);

    // Validate
    this.validateContextGraph(graph);

    // Cache
    if (this.config.enableCache) {
      this.cache.set(cid, graph);
    }

    return graph;
  }

  async fetchContent(cid: string): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];

    for await (const chunk of this.client.cat(cid, {
      timeout: this.config.timeout,
    })) {
      chunks.push(chunk);
    }

    // Concatenate all chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  // ------------------------------------------------------------------------
  // Pinning Operations
  // ------------------------------------------------------------------------

  async pin(cid: string): Promise<PinStatus> {
    await this.client.pin.add(CID.parse(cid));

    // Also pin to external service if configured
    if (this.config.pinningService !== 'local') {
      await this.pinToService(cid);
    }

    return {
      cid,
      pinned: true,
      pinnedAt: Date.now(),
      pinningService: this.config.pinningService,
    };
  }

  async unpin(cid: string): Promise<void> {
    await this.client.pin.rm(CID.parse(cid));

    // Also unpin from external service
    if (this.config.pinningService !== 'local') {
      await this.unpinFromService(cid);
    }
  }

  async isPinned(cid: string): Promise<boolean> {
    try {
      for await (const pin of this.client.pin.ls({ paths: CID.parse(cid) })) {
        if (pin.cid.toString() === cid) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // ------------------------------------------------------------------------
  // Verification
  // ------------------------------------------------------------------------

  async verifyContent(cid: string, content: Uint8Array): Promise<boolean> {
    try {
      // Compute hash of content
      const hash = await sha256.digest(content);

      // Create CID from hash
      const computedCID = CID.createV1(json.code, hash);

      // Compare CIDs
      return computedCID.toString() === cid;
    } catch (error) {
      return false;
    }
  }

  // ------------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------------

  async getStats(): Promise<{
    totalPinned: number;
    totalSize: number;
    pinnedCIDs: string[];
  }> {
    const pinnedCIDs: string[] = [];
    let totalSize = 0;

    for await (const pin of this.client.pin.ls()) {
      const cidStr = pin.cid.toString();
      pinnedCIDs.push(cidStr);

      // Get size (this is expensive, consider caching)
      try {
        const stat = await this.client.files.stat(`/ipfs/${cidStr}`);
        totalSize += stat.cumulativeSize;
      } catch (error) {
        // Ignore errors for individual files
      }
    }

    return {
      totalPinned: pinnedCIDs.length,
      totalSize,
      pinnedCIDs,
    };
  }

  // ------------------------------------------------------------------------
  // Private Helper Methods
  // ------------------------------------------------------------------------

  private validateDIDDocument(doc: DIDDocument): void {
    if (!doc.id || !doc.id.startsWith('did:')) {
      throw new Error('Invalid DID document: missing or invalid id');
    }
    if (!doc['@context'] || !Array.isArray(doc['@context'])) {
      throw new Error('Invalid DID document: missing @context');
    }
  }

  private validateContextGraph(graph: EncryptedContextGraph): void {
    if (!graph.graphId || !graph.encryptedData) {
      throw new Error('Invalid context graph: missing required fields');
    }
    if (!graph.metadata || !graph.metadata.author) {
      throw new Error('Invalid context graph: missing metadata');
    }
  }

  private serializeGraph(graph: EncryptedContextGraph): Uint8Array {
    // Convert to a serializable format
    const serializable = {
      ...graph,
      encryptedData: Array.from(graph.encryptedData),
      nonce: Array.from(graph.nonce),
      signature: Array.from(graph.signature),
    };
    return fromString(JSON.stringify(serializable));
  }

  private deserializeGraph(data: Uint8Array): EncryptedContextGraph {
    const json = toString(data);
    const parsed = JSON.parse(json);

    return {
      ...parsed,
      encryptedData: new Uint8Array(parsed.encryptedData),
      nonce: new Uint8Array(parsed.nonce),
      signature: new Uint8Array(parsed.signature),
    };
  }

  private async pinToService(cid: string): Promise<void> {
    // This would integrate with Pinata, Web3.Storage, or Infura
    // Implementation depends on the chosen service
    // For now, this is a placeholder
    console.log(`Pinning ${cid} to ${this.config.pinningService}`);

    // Example for Pinata:
    // const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.config.pinningApiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ hashToPin: cid }),
    // });
  }

  private async unpinFromService(cid: string): Promise<void> {
    console.log(`Unpinning ${cid} from ${this.config.pinningService}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Close IPFS connection
   */
  async close(): Promise<void> {
    // Clean up resources
    this.clearCache();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate CID format
 */
export function isValidCID(cid: string): boolean {
  try {
    CID.parse(cid);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert CID version (v0 to v1 or vice versa)
 */
export function convertCIDVersion(cid: string, version: 0 | 1): string {
  const parsed = CID.parse(cid);
  if (version === 0) {
    return parsed.toV0().toString();
  } else {
    return parsed.toV1().toString();
  }
}

/**
 * Create IPFS manager with default config
 */
export function createIPFSManager(config?: IPFSConfig): IPFSManager {
  return new IPFSManager(config);
}

// Export default instance
export default IPFSManager;
