/**
 * Type definitions for ΨNet IPFS integration
 */

import { CID } from 'multiformats/cid';

/**
 * Context graph structure for storage
 */
export interface ContextGraph {
  /** Unique identifier for this context */
  id: string;

  /** Agent DID that owns this context */
  owner: string;

  /** Timestamp of creation */
  createdAt: number;

  /** Timestamp of last update */
  updatedAt: number;

  /** Context nodes (conversations, documents, etc.) */
  nodes: ContextNode[];

  /** Edges connecting nodes */
  edges: ContextEdge[];

  /** Metadata about the context */
  metadata: ContextMetadata;

  /** Optional encryption info */
  encryption?: EncryptionInfo;
}

/**
 * Individual node in the context graph
 */
export interface ContextNode {
  id: string;
  type: 'conversation' | 'document' | 'skill' | 'reference' | 'summary';
  content: string | object;
  embedding?: number[];
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Edge connecting two nodes
 */
export interface ContextEdge {
  id: string;
  from: string;
  to: string;
  type: 'reference' | 'derives_from' | 'related_to' | 'summarizes';
  weight?: number;
  metadata?: Record<string, any>;
}

/**
 * Context metadata
 */
export interface ContextMetadata {
  name: string;
  description?: string;
  tags?: string[];
  version: string;
  compressionAlgorithm?: string;
  originalSize?: number;
  compressedSize?: number;
  qualityScore?: number;
}

/**
 * Encryption information
 */
export interface EncryptionInfo {
  algorithm: string;
  publicKey: string;
  encrypted: boolean;
}

/**
 * Upload options
 */
export interface UploadOptions {
  /** Whether to pin the uploaded content */
  pin?: boolean;

  /** Whether to compress before upload */
  compress?: boolean;

  /** Compression algorithm to use */
  compressionAlgorithm?: 'gzip' | 'brotli' | 'custom';

  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'pinning' | 'complete';
}

/**
 * Download options
 */
export interface DownloadOptions {
  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to verify content hash */
  verifyHash?: boolean;

  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;

  /** Whether to decompress after download */
  decompress?: boolean;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes?: number;
  percentage?: number;
  stage: 'fetching' | 'downloading' | 'verifying' | 'complete';
}

/**
 * Pin status
 */
export interface PinStatus {
  cid: string;
  isPinned: boolean;
  pinnedAt?: number;
  pinnedBy?: string;
}

/**
 * IPFS client configuration
 */
export interface IPFSConfig {
  /** IPFS API URL */
  apiUrl?: string;

  /** IPFS Gateway URL */
  gatewayUrl?: string;

  /** Default timeout */
  timeout?: number;

  /** Whether to pin by default */
  autoPinpin?: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  cid: string;
  size: number;
  exists: boolean;
  errors?: string[];
}
