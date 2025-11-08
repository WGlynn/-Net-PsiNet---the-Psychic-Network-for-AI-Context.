# @psinet/ipfs

IPFS integration library for ΨNet context storage.

## Installation

```bash
npm install @psinet/ipfs
```

## Quick Start

```typescript
import { PsiNetIPFS } from '@psinet/ipfs';

// Initialize client
const ipfs = new PsiNetIPFS({
  apiUrl: 'http://localhost:5001',
  gatewayUrl: 'http://localhost:8080'
});

// Upload a context graph
const context = {
  id: 'context-1',
  owner: 'did:psinet:alice',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  nodes: [
    {
      id: 'node-1',
      type: 'conversation',
      content: 'Hello, world!',
      timestamp: Date.now()
    }
  ],
  edges: [],
  metadata: {
    name: 'My First Context',
    version: '1.0.0'
  }
};

const cid = await ipfs.upload(context, { pin: true });
console.log('Uploaded to:', cid);

// Download context
const downloaded = await ipfs.download(cid);
console.log('Downloaded:', downloaded);

// Check if pinned
const pinned = await ipfs.isPinned(cid);
console.log('Is pinned:', pinned);
```

## API Reference

### PsiNetIPFS

Main client class.

#### Constructor

```typescript
new PsiNetIPFS(config?: IPFSConfig)
```

**Config options:**
- `apiUrl` (string): IPFS API URL (default: `http://localhost:5001`)
- `gatewayUrl` (string): IPFS Gateway URL (default: `http://localhost:8080`)
- `timeout` (number): Request timeout in ms (default: `30000`)
- `autoPinpin` (boolean): Auto-pin uploads (default: `true`)

#### Methods

##### `upload(context, options?)`

Upload a context graph to IPFS.

**Parameters:**
- `context` (ContextGraph): The context to upload
- `options` (UploadOptions): Optional upload settings
  - `pin` (boolean): Pin the content
  - `compress` (boolean): Compress before upload
  - `onProgress` (callback): Progress callback

**Returns:** Promise<string> - The CID

##### `download(cid, options?)`

Download a context graph from IPFS.

**Parameters:**
- `cid` (string): The CID to download
- `options` (DownloadOptions): Optional download settings
  - `verifyHash` (boolean): Verify content hash
  - `decompress` (boolean): Decompress after download
  - `onProgress` (callback): Progress callback

**Returns:** Promise<ContextGraph> - The context

##### `pin(cid)`

Pin content for persistence.

**Returns:** Promise<boolean>

##### `unpin(cid)`

Unpin content.

**Returns:** Promise<boolean>

##### `isPinned(cid)`

Check if content is pinned.

**Returns:** Promise<boolean>

##### `validate(cid)`

Validate a CID and check if content exists.

**Returns:** Promise<ValidationResult>

##### `getSize(cid)`

Get the size of content in bytes.

**Returns:** Promise<number>

##### `listPinned()`

List all pinned CIDs.

**Returns:** Promise<string[]>

## Types

### ContextGraph

```typescript
interface ContextGraph {
  id: string;
  owner: string;
  createdAt: number;
  updatedAt: number;
  nodes: ContextNode[];
  edges: ContextEdge[];
  metadata: ContextMetadata;
  encryption?: EncryptionInfo;
}
```

### ContextNode

```typescript
interface ContextNode {
  id: string;
  type: 'conversation' | 'document' | 'skill' | 'reference' | 'summary';
  content: string | object;
  embedding?: number[];
  timestamp: number;
  metadata?: Record<string, any>;
}
```

### ContextEdge

```typescript
interface ContextEdge {
  id: string;
  from: string;
  to: string;
  type: 'reference' | 'derives_from' | 'related_to' | 'summarizes';
  weight?: number;
  metadata?: Record<string, any>;
}
```

## Examples

### Upload with Progress

```typescript
const cid = await ipfs.upload(context, {
  pin: true,
  compress: true,
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.stage}`);
  }
});
```

### Download with Verification

```typescript
const context = await ipfs.download(cid, {
  verifyHash: true,
  decompress: true,
  onProgress: (progress) => {
    console.log(`Downloading: ${progress.bytesDownloaded} bytes`);
  }
});
```

### Validate CID

```typescript
const result = await ipfs.validate(cid);

if (result.valid && result.exists) {
  console.log(`Valid CID, content exists (${result.size} bytes)`);
} else if (result.valid) {
  console.log('Valid CID format, but content not found');
} else {
  console.log('Invalid CID format');
}
```

## Testing

```bash
# Run tests
npm test

# With Docker (requires IPFS running)
docker-compose up -d ipfs
npm test
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Related

- [@psinet/sdk](../sdk) - Full ΨNet SDK
- [ΨNet Roadmap](../../ROADMAP.md)
- [Network Layout](../../NETWORK_LAYOUT.md)
