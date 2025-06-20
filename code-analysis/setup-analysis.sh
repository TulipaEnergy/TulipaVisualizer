#!/bin/bash

echo "🔧 Setting up static code analysis tools..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_error "npm not found. Please install npm first."
    exit 1
fi

# Check Rust
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    print_status "Cargo found: $CARGO_VERSION"
else
    print_warning "Cargo not found. Rust analysis will be limited."
fi

echo ""
echo "📦 Installing npm dependencies..."

# Install npm dependencies
if npm install; then
    print_status "npm dependencies installed successfully"
else
    print_error "Failed to install npm dependencies"
    exit 1
fi

echo ""
echo "🦀 Installing optional Rust tools..."

# Install Rust tools (optional)
RUST_TOOLS=("tokei" "cargo-geiger" "cargo-bloat")

for tool in "${RUST_TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        print_status "$tool already installed"
    else
        echo "Installing $tool..."
        if cargo install "$tool"; then
            print_status "$tool installed successfully"
        else
            print_warning "Failed to install $tool (optional)"
        fi
    fi
done

echo ""
echo "🧪 Testing basic setup..."

# Test ESLint
echo "Testing ESLint..."
if npx eslint --version &> /dev/null; then
    print_status "ESLint working"
else
    print_error "ESLint not working properly"
fi

# Test TypeScript
echo "Testing TypeScript..."
if npx tsc --version &> /dev/null; then
    print_status "TypeScript working"
else
    print_error "TypeScript not working properly"
fi

# Test analysis tools
echo "Testing analysis tools..."
if command -v npx &> /dev/null; then
    print_status "npx available"
else
    print_error "npx not found"
fi

# Fix line endings for shell scripts (important for cross-platform compatibility)
echo "🔧 Fixing line endings and making scripts executable..."
if command -v dos2unix &> /dev/null; then
    dos2unix code-analysis/*.sh 2>/dev/null || true
    print_status "Line endings fixed"
fi

# Make scripts executable
if [ -f "code-analysis/analyze.js" ]; then
    chmod +x code-analysis/analyze.js
    print_status "Analysis script made executable"
fi

# Create analysis reports directory
mkdir -p analysis-reports
print_status "Analysis reports directory created"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Now, you can run 'npm run analyze'"
