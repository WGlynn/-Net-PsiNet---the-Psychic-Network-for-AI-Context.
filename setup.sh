#!/bin/bash
# PsiNet Setup Script

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          ΨNet - Decentralized AI Context Protocol           ║"
echo "║                      Installation                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check Python version
echo "📋 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✓ Python $PYTHON_VERSION found"

# Check pip
echo ""
echo "📋 Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi
echo "✓ pip found"

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Python dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create storage directory
echo ""
echo "📁 Creating storage directory..."
mkdir -p .psinet
echo "✓ Storage directory created: .psinet/"

# Make demo executable
chmod +x examples/demo.py

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  ✓ Installation Complete!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Quick Start:"
echo ""
echo "  # Run the demo:"
echo "  python3 examples/demo.py"
echo ""
echo "  # Or use Python REPL:"
echo "  python3"
echo "  >>> from src.python.psinet_core import PsiNetNode"
echo "  >>> node = PsiNetNode()"
echo "  >>> node.generate_identity()"
echo ""
echo "📚 Documentation: docs/README.md"
echo ""
