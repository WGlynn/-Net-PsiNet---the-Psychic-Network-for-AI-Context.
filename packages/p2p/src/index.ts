/**
 * @module @psinet/p2p
 * @description LibP2P-based P2P networking for ΨNet
 *
 * Features:
 * - Agent-to-agent direct communication
 * - Context graph synchronization
 * - Peer discovery (DHT, mDNS, Bootstrap)
 * - Pub/Sub messaging (Gossipsub)
 * - NAT traversal and relay
 * - Encrypted connections (Noise protocol)
 */

import { createLibp2p, Libp2p, Libp2pOptions } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { yamux } from '@chainsafe/libp2p-yamux';
import { kadDHT, KadDHT } from '@libp2p/kad-dht';
import { mdns } from '@libp2p/mdns';
import { bootstrap } from '@libp2p/bootstrap';
import { gossipsub } from '@libp2p/gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { pipe } from 'it-pipe';
import * as lp from 'it-length-prefixed';
import { fromString, toString } from 'uint8arrays';
import type { PeerId } from '@libp2p/interface-peer-id';
import type { Connection, Stream } from '@libp2p/interface-connection';
import type { Message } from '@libp2p/interface-pubsub';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * P2P Network Configuration
 */
export interface P2PConfig {
  /** Node's peer ID (optional, will be generated if not provided) */
  peerId?: PeerId;

  /** Listen addresses for the node */
  listenAddresses?: string[];

  /** Bootstrap peer multiaddrs */
  bootstrapPeers?: string[];

  /** Enable mDNS for local peer discovery */
  enableMDNS?: boolean;

  /** Enable DHT for distributed peer discovery */
  enableDHT?: boolean;

  /** Enable relay for NAT traversal */
  enableRelay?: boolean;

  /** Enable Gossipsub for pub/sub */
  enableGossipsub?: boolean;

  /** Custom protocol prefix */
  protocolPrefix?: string;

  /** Maximum number of connections */
  maxConnections?: number;

  /** Connection timeout (ms) */
  connectionTimeout?: number;
}

/**
 * Encrypted message between agents
 */
export interface EncryptedMessage {
  /** Sender's DID */
  from: string;

  /** Recipient's DID */
  to: string;

  /** Message type */
  type: 'direct' | 'sync' | 'notification';

  /** Encrypted payload */
  payload: Uint8Array;

  /** Timestamp */
  timestamp: number;

  /** Message signature */
  signature: Uint8Array;

  /** Nonce for encryption */
  nonce: Uint8Array;
}

/**
 * Context graph sync request/response
 */
export interface ContextGraphSyncMessage {
  /** Graph CID */
  graphCID: string;

  /** Sync operation type */
  operation: 'request' | 'response' | 'update';

  /** Graph data (if response/update) */
  data?: Uint8Array;

  /** Version number */
  version: number;

  /** CRDT changes (if update) */
  changes?: Uint8Array;
}

/**
 * Peer information
 */
export interface PeerInfo {
  /** Peer ID */
  peerId: string;

  /** Multiaddrs */
  addresses: string[];

  /** Protocols supported */
  protocols: string[];

  /** Agent DID (if known) */
  agentDID?: string;

  /** Last seen timestamp */
  lastSeen: number;

  /** Connection status */
  connected: boolean;
}

/**
 * Message handler function
 */
export type MessageHandler = (message: any, from: PeerId) => Promise<void> | void;

/**
 * Sync handler function
 */
export type SyncHandler = (
  syncMessage: ContextGraphSyncMessage,
  from: PeerId
) => Promise<void> | void;

// ============================================================================
// Protocol Names
// ============================================================================

const PROTOCOL_VERSION = '1.0.0';
const PROTOCOL_PREFIX = '/psinet';

// Custom protocols
const DIRECT_MESSAGE_PROTOCOL = `${PROTOCOL_PREFIX}/direct-message/${PROTOCOL_VERSION}`;
const CONTEXT_SYNC_PROTOCOL = `${PROTOCOL_PREFIX}/context-sync/${PROTOCOL_VERSION}`;
const AGENT_DISCOVERY_PROTOCOL = `${PROTOCOL_PREFIX}/agent-discovery/${PROTOCOL_VERSION}`;

// Gossipsub topics
const TOPIC_NETWORK_UPDATES = 'psinet:network-updates';
const TOPIC_AGENT_PRESENCE = 'psinet:agent-presence';

// ============================================================================
// ΨNet P2P Network Implementation
// ============================================================================

/**
 * Main P2P networking class for ΨNet
 */
export class PsiNetP2P {
  private node: Libp2p | null = null;
  private config: Required<P2PConfig>;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private syncHandlers: Set<SyncHandler> = new Set();
  private didToPeerMap: Map<string, PeerId> = new Map();
  private peerToDIDMap: Map<string, string> = new Map();

  constructor(config: P2PConfig = {}) {
    // Default configuration
    this.config = {
      peerId: config.peerId,
      listenAddresses: config.listenAddresses || [
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/0.0.0.0/tcp/0/ws',
      ],
      bootstrapPeers: config.bootstrapPeers || [],
      enableMDNS: config.enableMDNS !== false,
      enableDHT: config.enableDHT !== false,
      enableRelay: config.enableRelay !== false,
      enableGossipsub: config.enableGossipsub !== false,
      protocolPrefix: config.protocolPrefix || PROTOCOL_PREFIX,
      maxConnections: config.maxConnections || 50,
      connectionTimeout: config.connectionTimeout || 30000,
    } as Required<P2PConfig>;
  }

  // --------------------------------------------------------------------------
  // Lifecycle Methods
  // --------------------------------------------------------------------------

  /**
   * Start the P2P node
   */
  async start(): Promise<void> {
    if (this.node) {
      throw new Error('Node already started');
    }

    // Build LibP2P options
    const libp2pOptions: Libp2pOptions = {
      addresses: {
        listen: this.config.listenAddresses,
      },
      transports: [tcp(), webSockets()],
      connectionEncryption: [noise()],
      streamMuxers: [yamux(), mplex()],
      peerDiscovery: [],
      services: {},
    };

    // Add mDNS for local discovery
    if (this.config.enableMDNS) {
      libp2pOptions.peerDiscovery!.push(mdns());
    }

    // Add bootstrap for initial peers
    if (this.config.bootstrapPeers.length > 0) {
      libp2pOptions.peerDiscovery!.push(
        bootstrap({
          list: this.config.bootstrapPeers,
        })
      );
    }

    // Add DHT for distributed peer discovery
    if (this.config.enableDHT) {
      libp2pOptions.services!.dht = kadDHT({
        clientMode: false,
      });
    }

    // Add Gossipsub for pub/sub
    if (this.config.enableGossipsub) {
      libp2pOptions.services!.pubsub = gossipsub({
        emitSelf: false,
        allowPublishToZeroPeers: true,
      });

      // Add pubsub peer discovery
      libp2pOptions.peerDiscovery!.push(
        pubsubPeerDiscovery({
          interval: 10000,
        })
      );
    }

    // Connection manager settings
    libp2pOptions.connectionManager = {
      maxConnections: this.config.maxConnections,
      minConnections: 5,
    };

    // Create LibP2P node
    this.node = await createLibp2p(libp2pOptions);

    // Register protocol handlers
    await this.node.handle(DIRECT_MESSAGE_PROTOCOL, this.handleDirectMessage.bind(this));
    await this.node.handle(CONTEXT_SYNC_PROTOCOL, this.handleContextSync.bind(this));
    await this.node.handle(AGENT_DISCOVERY_PROTOCOL, this.handleAgentDiscovery.bind(this));

    // Subscribe to network topics
    if (this.config.enableGossipsub) {
      this.node.services.pubsub?.subscribe(TOPIC_NETWORK_UPDATES);
      this.node.services.pubsub?.addEventListener('message', this.handleGossipMessage.bind(this));
    }

    // Start the node
    await this.node.start();

    console.log(`ΨNet P2P node started`);
    console.log(`Peer ID: ${this.node.peerId.toString()}`);
    console.log(`Listening on:`);
    this.node.getMultiaddrs().forEach((addr) => {
      console.log(`  ${addr.toString()}`);
    });
  }

  /**
   * Stop the P2P node
   */
  async stop(): Promise<void> {
    if (!this.node) {
      return;
    }

    await this.node.stop();
    this.node = null;
    this.messageHandlers.clear();
    this.syncHandlers.clear();
    this.didToPeerMap.clear();
    this.peerToDIDMap.clear();

    console.log('ΨNet P2P node stopped');
  }

  /**
   * Get node status
   */
  isRunning(): boolean {
    return this.node !== null && this.node.status === 'started';
  }

  // --------------------------------------------------------------------------
  // Direct Messaging
  // --------------------------------------------------------------------------

  /**
   * Send encrypted message to another agent
   * @param recipientDID Target agent's DID
   * @param message Encrypted message
   */
  async sendMessage(recipientDID: string, message: EncryptedMessage): Promise<void> {
    if (!this.node) {
      throw new Error('Node not started');
    }

    // Find peer by DID
    const peerId = this.didToPeerMap.get(recipientDID);
    if (!peerId) {
      throw new Error(`Peer not found for DID: ${recipientDID}`);
    }

    // Serialize message
    const messageBytes = this.serializeMessage(message);

    // Open stream to peer
    const stream = await this.node.dialProtocol(peerId, DIRECT_MESSAGE_PROTOCOL);

    // Send message
    await pipe(
      [messageBytes],
      lp.encode,
      stream,
      lp.decode,
      async (source) => {
        // Read response (if any)
        for await (const msg of source) {
          console.log('Received response:', msg);
        }
      }
    );
  }

  /**
   * Handle incoming direct messages
   */
  private async handleDirectMessage({ stream }: { stream: Stream }): Promise<void> {
    try {
      await pipe(
        stream,
        lp.decode,
        async (source) => {
          for await (const msg of source) {
            const message = this.deserializeMessage(msg.subarray());

            // Get sender's peer ID from stream
            const from = stream.connection.remotePeer;

            // Dispatch to registered handlers
            for (const [type, handler] of this.messageHandlers) {
              if (type === message.type || type === '*') {
                await handler(message, from);
              }
            }
          }
        }
      );
    } catch (error) {
      console.error('Error handling direct message:', error);
    }
  }

  /**
   * Register message handler
   * @param messageType Type of message to handle ('*' for all)
   * @param handler Handler function
   */
  onMessage(messageType: string, handler: MessageHandler): void {
    this.messageHandlers.set(messageType, handler);
  }

  // --------------------------------------------------------------------------
  // Context Graph Synchronization
  // --------------------------------------------------------------------------

  /**
   * Synchronize context graph with peer
   * @param peerId Target peer
   * @param graphCID Graph CID to sync
   */
  async syncContextGraph(peerId: string, graphCID: string): Promise<void> {
    if (!this.node) {
      throw new Error('Node not started');
    }

    // Create sync request
    const syncRequest: ContextGraphSyncMessage = {
      graphCID,
      operation: 'request',
      version: 0,
    };

    // Serialize request
    const requestBytes = this.serializeSyncMessage(syncRequest);

    // Open stream
    const peerIdObj = await this.parsePeerId(peerId);
    const stream = await this.node.dialProtocol(peerIdObj, CONTEXT_SYNC_PROTOCOL);

    // Send request and receive response
    await pipe(
      [requestBytes],
      lp.encode,
      stream,
      lp.decode,
      async (source) => {
        for await (const msg of source) {
          const response = this.deserializeSyncMessage(msg.subarray());

          // Process sync response
          for (const handler of this.syncHandlers) {
            await handler(response, peerIdObj);
          }
        }
      }
    );
  }

  /**
   * Handle incoming context sync requests
   */
  private async handleContextSync({ stream }: { stream: Stream }): Promise<void> {
    try {
      await pipe(
        stream,
        lp.decode,
        async (source) => {
          for await (const msg of source) {
            const syncMessage = this.deserializeSyncMessage(msg.subarray());
            const from = stream.connection.remotePeer;

            // Dispatch to sync handlers
            for (const handler of this.syncHandlers) {
              await handler(syncMessage, from);
            }

            // TODO: Send response based on handler results
          }
        }
      );
    } catch (error) {
      console.error('Error handling context sync:', error);
    }
  }

  /**
   * Register sync handler
   * @param handler Sync handler function
   */
  onSync(handler: SyncHandler): void {
    this.syncHandlers.add(handler);
  }

  // --------------------------------------------------------------------------
  // Pub/Sub (Gossipsub)
  // --------------------------------------------------------------------------

  /**
   * Subscribe to a topic
   * @param topic Topic name
   * @param handler Message handler
   */
  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    if (!this.node || !this.node.services.pubsub) {
      throw new Error('Gossipsub not enabled');
    }

    this.node.services.pubsub.subscribe(topic);
    this.messageHandlers.set(`pubsub:${topic}`, handler);
  }

  /**
   * Publish message to topic
   * @param topic Topic name
   * @param message Message to publish
   */
  async publish(topic: string, message: any): Promise<void> {
    if (!this.node || !this.node.services.pubsub) {
      throw new Error('Gossipsub not enabled');
    }

    const messageBytes = fromString(JSON.stringify(message));
    await this.node.services.pubsub.publish(topic, messageBytes);
  }

  /**
   * Handle gossipsub messages
   */
  private handleGossipMessage(event: CustomEvent<Message>): void {
    const { topic, data } = event.detail;
    const message = JSON.parse(toString(data));

    // Dispatch to topic-specific handlers
    const handler = this.messageHandlers.get(`pubsub:${topic}`);
    if (handler) {
      handler(message, event.detail.from);
    }
  }

  // --------------------------------------------------------------------------
  // Peer Discovery
  // --------------------------------------------------------------------------

  /**
   * Find peers hosting a specific context graph
   * @param graphCID Graph CID to find
   * @returns List of peer information
   */
  async findPeersWithGraph(graphCID: string): Promise<PeerInfo[]> {
    if (!this.node || !this.node.services.dht) {
      throw new Error('DHT not enabled');
    }

    const peers: PeerInfo[] = [];
    const key = `/psinet/graph/${graphCID}`;

    // Query DHT for providers
    for await (const provider of this.node.services.dht.findProviders(fromString(key))) {
      const peerInfo = await this.getPeerInfo(provider.id);
      if (peerInfo) {
        peers.push(peerInfo);
      }
    }

    return peers;
  }

  /**
   * Find agent by DID
   * @param did Agent's DID
   * @returns Peer information or null
   */
  async findAgentByDID(did: string): Promise<PeerInfo | null> {
    // Check local cache first
    const peerId = this.didToPeerMap.get(did);
    if (peerId) {
      return this.getPeerInfo(peerId);
    }

    // Query DHT
    if (this.node?.services.dht) {
      const key = `/psinet/did/${did}`;

      for await (const provider of this.node.services.dht.findProviders(fromString(key))) {
        // Found the agent
        this.didToPeerMap.set(did, provider.id);
        this.peerToDIDMap.set(provider.id.toString(), did);
        return this.getPeerInfo(provider.id);
      }
    }

    return null;
  }

  /**
   * Announce that this node has a graph
   * @param graphCID Graph CID to announce
   */
  async announceGraph(graphCID: string): Promise<void> {
    if (!this.node || !this.node.services.dht) {
      throw new Error('DHT not enabled');
    }

    const key = fromString(`/psinet/graph/${graphCID}`);
    await this.node.services.dht.provide(key);
  }

  /**
   * Announce agent DID
   * @param did Agent's DID
   */
  async announceDID(did: string): Promise<void> {
    if (!this.node || !this.node.services.dht) {
      throw new Error('DHT not enabled');
    }

    const key = fromString(`/psinet/did/${did}`);
    await this.node.services.dht.provide(key);

    // Update local cache
    this.didToPeerMap.set(did, this.node.peerId);
    this.peerToDIDMap.set(this.node.peerId.toString(), did);
  }

  /**
   * Get information about a peer
   */
  private async getPeerInfo(peerId: PeerId): Promise<PeerInfo | null> {
    if (!this.node) return null;

    try {
      const connections = this.node.getConnections(peerId);
      const peerStore = this.node.peerStore;
      const peer = await peerStore.get(peerId);

      return {
        peerId: peerId.toString(),
        addresses: peer.addresses.map((addr) => addr.multiaddr.toString()),
        protocols: await peerStore.protoBook.get(peerId),
        agentDID: this.peerToDIDMap.get(peerId.toString()),
        lastSeen: Date.now(),
        connected: connections.length > 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle agent discovery requests
   */
  private async handleAgentDiscovery({ stream }: { stream: Stream }): Promise<void> {
    // Implementation for agent discovery protocol
    // This would allow agents to query for other agents' DIDs and capabilities
  }

  /**
   * Get list of connected peers
   */
  async getConnectedPeers(): Promise<PeerInfo[]> {
    if (!this.node) return [];

    const peers: PeerInfo[] = [];
    const connections = this.node.getConnections();

    for (const conn of connections) {
      const peerInfo = await this.getPeerInfo(conn.remotePeer);
      if (peerInfo) {
        peers.push(peerInfo);
      }
    }

    return peers;
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  private serializeMessage(message: EncryptedMessage): Uint8Array {
    return fromString(JSON.stringify(message));
  }

  private deserializeMessage(data: Uint8Array): EncryptedMessage {
    return JSON.parse(toString(data));
  }

  private serializeSyncMessage(message: ContextGraphSyncMessage): Uint8Array {
    return fromString(JSON.stringify(message));
  }

  private deserializeSyncMessage(data: Uint8Array): ContextGraphSyncMessage {
    return JSON.parse(toString(data));
  }

  private async parsePeerId(peerIdString: string): Promise<PeerId> {
    // This would use libp2p's PeerId parsing
    // Simplified for now
    return peerIdString as any as PeerId;
  }

  /**
   * Get node's peer ID
   */
  getPeerId(): string | null {
    return this.node?.peerId.toString() || null;
  }

  /**
   * Get node's multiaddrs
   */
  getMultiaddrs(): string[] {
    if (!this.node) return [];
    return this.node.getMultiaddrs().map((addr) => addr.toString());
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    peerId: string | null;
    connections: number;
    peers: number;
    protocols: string[];
    bandwidth: { in: number; out: number };
  }> {
    if (!this.node) {
      return {
        peerId: null,
        connections: 0,
        peers: 0,
        protocols: [],
        bandwidth: { in: 0, out: 0 },
      };
    }

    const connections = this.node.getConnections();
    const protocols = await this.node.peerStore.all();

    return {
      peerId: this.node.peerId.toString(),
      connections: connections.length,
      peers: protocols.length,
      protocols: Array.from(
        new Set(protocols.flatMap((p) => p.protocols))
      ),
      bandwidth: { in: 0, out: 0 }, // Would need metrics implementation
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default PsiNetP2P;

/**
 * Create and start a P2P node
 */
export async function createP2PNode(config?: P2PConfig): Promise<PsiNetP2P> {
  const node = new PsiNetP2P(config);
  await node.start();
  return node;
}
