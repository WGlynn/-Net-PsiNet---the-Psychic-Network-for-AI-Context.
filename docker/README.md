# ΨNet Docker Development Environment

One-command setup for complete ΨNet local development.

## 🚀 Quick Start

```bash
# Setup everything (first time)
./docker/setup.sh

# Or manually
docker-compose up -d
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

## 📦 What's Included

| Service | Port | Purpose |
|---------|------|---------|
| **Hardhat** | 8545 | Local Ethereum node for contract development |
| **IPFS** | 5001, 8080 | Decentralized storage for contexts |
| **PostgreSQL** | 5432 | Off-chain data indexing |
| **Redis** | 6379 | Caching and task queues |
| **The Graph** | 8000 | GraphQL API for blockchain data |
| **Grafana** | 3000 | Monitoring dashboards |
| **Prometheus** | 9090 | Metrics collection |

## 🔧 Common Commands

### Start Environment
```bash
docker-compose up -d
```

### Stop Environment
```bash
docker-compose down
```

### Reset Everything (including data)
```bash
docker-compose down -v
./docker/setup.sh
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hardhat
docker-compose logs -f ipfs
```

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Specific test file
npx hardhat test test/integration/full-lifecycle.test.js
```

### Deploy Contracts
```bash
# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy specific contract
npx hardhat run scripts/deploy-storage-registry.js --network localhost
```

### IPFS Operations
```bash
# Upload file
curl -F file=@./context.json http://localhost:5001/api/v0/add

# Get file
curl http://localhost:8080/ipfs/<CID>

# Pin file
curl -X POST http://localhost:5001/api/v0/pin/add?arg=<CID>
```

### Database Operations
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U psinet psinet_dev

# Connect to Redis
docker-compose exec redis redis-cli
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Development Machine                 │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Hardhat   │  │    IPFS     │  │  PostgreSQL │         │
│  │   :8545     │  │   :5001     │  │    :5432    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                 ┌────────▼────────┐                          │
│                 │   The Graph     │                          │
│                 │     :8000       │                          │
│                 └────────┬────────┘                          │
│                          │                                   │
│                 ┌────────▼────────┐                          │
│                 │   Prometheus    │                          │
│                 │     :9090       │                          │
│                 └────────┬────────┘                          │
│                          │                                   │
│                 ┌────────▼────────┐                          │
│                 │    Grafana      │                          │
│                 │     :3000       │                          │
│                 └─────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Monitoring

### Grafana Dashboards

Access: http://localhost:3000
Login: `admin` / `psinet_dev`

Pre-configured dashboards:
- **ΨNet Overview**: Network statistics, TVL, active agents
- **Storage Metrics**: Total locked PSI, contexts stored, compression ratios
- **Economics**: Rent collected, tokens burned, efficiency rewards
- **Performance**: Gas usage, transaction throughput, IPFS stats

### Prometheus Metrics

Access: http://localhost:9090

Available metrics:
- `psinet_total_locked_psi` - Total PSI locked in storage
- `psinet_contexts_stored` - Number of active contexts
- `psinet_rent_collected` - Total rent collected (PSI)
- `psinet_tokens_burned` - Total tokens burned
- `psinet_efficiency_rewards` - Total efficiency rewards paid

## 🧪 Testing Workflow

1. **Start environment**
   ```bash
   docker-compose up -d
   ```

2. **Deploy contracts**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Run integration tests**
   ```bash
   npm run test:integration
   ```

4. **Monitor results**
   - Check Grafana: http://localhost:3000
   - View logs: `docker-compose logs -f hardhat`

## 🐛 Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker ps

# View error logs
docker-compose logs [service]

# Restart specific service
docker-compose restart [service]
```

### Hardhat connection refused
```bash
# Restart Hardhat
docker-compose restart hardhat

# Check it's listening
docker-compose exec hardhat nc -z localhost 8545
```

### IPFS not responding
```bash
# Restart IPFS
docker-compose restart ipfs

# Check IPFS status
docker-compose exec ipfs ipfs id
```

### Contracts not deploying
```bash
# Compile first
npx hardhat compile

# Clear cache
npx hardhat clean

# Recompile and deploy
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### Database connection issues
```bash
# Check PostgreSQL
docker-compose exec postgres pg_isready -U psinet

# Recreate database
docker-compose down postgres
docker-compose up -d postgres
```

## 🔒 Security Notes

**This is a DEVELOPMENT environment only!**

- Default passwords are INSECURE
- All ports are exposed on localhost
- No SSL/TLS encryption
- No authentication on most services
- Data is NOT backed up

**NEVER use this configuration in production!**

## 🚢 Moving to Production

For production deployment:

1. Use secure passwords (environment variables)
2. Enable TLS/SSL on all services
3. Configure proper authentication
4. Set up backups and redundancy
5. Use managed services (Infura, Pinata, etc.)
6. Deploy to real networks (testnets first)
7. Configure firewall rules
8. Set up monitoring and alerts

See `ROADMAP.md` for full production deployment plan.

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ΨNet Roadmap](../ROADMAP.md)
- [ΨNet Architecture](../NETWORK_LAYOUT.md)

## 💡 Tips

1. **Use named volumes** for persistent data between restarts
2. **Watch logs** with `docker-compose logs -f` to debug issues
3. **Clean up regularly** with `docker-compose down -v` to free space
4. **Profile gas usage** with Hardhat gas reporter
5. **Test on testnets** before mainnet (Sepolia recommended)

## 🆘 Getting Help

- GitHub Issues: https://github.com/psinet/psinet/issues
- Discord: [Coming soon]
- Documentation: `../docs/`

---

**Happy Building! 🚀**

*Economic Density = Context Density*
