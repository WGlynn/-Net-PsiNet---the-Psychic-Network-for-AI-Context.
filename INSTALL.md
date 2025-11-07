# Installation Guide

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git (for cloning the repository)

## Quick Install

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

This will:
- Check Python and pip installation
- Install required dependencies
- Create storage directories
- Make scripts executable

### Option 2: Manual Installation

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Create storage directory
mkdir -p .psinet

# Make scripts executable
chmod +x examples/demo.py
chmod +x setup.sh
```

### Option 3: Simplified Version (No Dependencies)

If you can't install the cryptography library or want a quick demo:

```bash
# No installation needed!
python3 examples/demo_simple.py
```

This uses a simplified version with no external dependencies (but without real cryptographic security).

## Verify Installation

```bash
# Test import
python3 -c "import sys; sys.path.insert(0, 'src/python'); from psinet_core import PsiNetNode; print('✓ Installation successful')"
```

If this fails with cryptography errors, use the simplified version:

```bash
# Test simplified version
python3 -c "import sys; sys.path.insert(0, 'src/python'); from psinet_simple import SimplePsiNetNode; print('✓ Simplified version works')"
```

## Running the Demo

### Full Demo (with cryptography)

```bash
python3 examples/demo.py
```

### Simplified Demo (no dependencies)

```bash
python3 examples/demo_simple.py
```

## Optional Dependencies

### IPFS Integration

To publish contexts to IPFS:

```bash
# macOS
brew install ipfs

# Linux
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Initialize and start IPFS
ipfs init
ipfs daemon
```

Then in Python:

```python
from src.python.psinet_core import PsiNetNode

node = PsiNetNode()
node.generate_identity()

context = node.create_context(...)
cid = node.publish_to_ipfs(context)
print(f"Published to IPFS: {cid}")
```

### Arweave Integration

Coming soon - requires Arweave wallet and AR tokens.

## Troubleshooting

### "ModuleNotFoundError: No module named 'cryptography'"

Install the cryptography package:

```bash
pip3 install cryptography
```

If this fails, use the simplified version:

```bash
python3 examples/demo_simple.py
```

### "Permission denied: ./setup.sh"

Make the script executable:

```bash
chmod +x setup.sh
./setup.sh
```

### "No module named 'psinet_core'"

Make sure you're running from the project root directory:

```bash
pwd  # Should show: .../PsiNet
python3 examples/demo.py  # Not just: python3 demo.py
```

### IPFS connection fails

Make sure IPFS daemon is running:

```bash
ipfs daemon &
```

Then verify:

```bash
curl http://127.0.0.1:5001/api/v0/id
```

### Cryptography library import errors

Some environments have issues with the cryptography library. Use the simplified version instead:

```bash
python3 examples/demo_simple.py
```

## Platform-Specific Instructions

### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3
brew install python3

# Install dependencies
pip3 install -r requirements.txt

# Run demo
python3 examples/demo.py
```

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Python 3 and pip
sudo apt install python3 python3-pip

# Install dependencies
pip3 install -r requirements.txt

# Run demo
python3 examples/demo.py
```

### Linux (Fedora/RHEL)

```bash
# Install Python 3 and pip
sudo dnf install python3 python3-pip

# Install dependencies
pip3 install -r requirements.txt

# Run demo
python3 examples/demo.py
```

### Windows

```powershell
# Install Python from python.org
# Then in PowerShell:

# Install dependencies
pip install -r requirements.txt

# Run demo
python examples/demo.py
```

## Development Setup

For development with hot-reloading:

```bash
# Install development dependencies
pip3 install -r requirements-dev.txt  # (coming soon)

# Run tests
pytest tests/  # (coming soon)

# Run linter
pylint src/python/psinet_core.py  # (coming soon)
```

## Virtual Environment (Recommended)

To avoid conflicts with system packages:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run demo
python examples/demo.py

# Deactivate when done
deactivate
```

## Docker (Coming Soon)

```bash
# Build image
docker build -t psinet .

# Run demo
docker run -it psinet python3 examples/demo.py
```

## Uninstall

```bash
# Remove installed packages
pip3 uninstall cryptography requests

# Remove storage directories
rm -rf .psinet .psinet_simple .psinet_other

# Remove exported files
rm -f exported_context.json
```

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Read the [documentation](docs/README.md)
3. Open an issue on GitHub
4. Check existing issues for solutions

---

**Next Steps:** See [QUICKSTART.md](QUICKSTART.md) for usage examples
