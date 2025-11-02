#!/bin/bash
# Script to deploy a new contract instance for a new company

set -e

echo "🚀 Deploying new Equity Token contract..."

cd "$(dirname "$0")/contracts/equity-token"

# Build the contract
echo "📦 Building contract..."
cargo build --target wasm32-unknown-unknown --release

# Deploy the contract
echo "🌐 Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm ../../target/wasm32v1-none/release/equity_token.wasm \
  --source alice \
  --network testnet)

echo ""
echo "✅ Contract deployed successfully!"
echo "📋 Contract ID: $CONTRACT_ID"
echo ""
echo "Update your frontend with this contract ID to create the company listing."
echo ""
