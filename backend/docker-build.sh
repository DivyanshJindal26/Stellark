#!/bin/bash

# Stellark Backend Docker Build Script

echo "🐳 Building Stellark Backend Docker Image..."
echo "=============================================="

# Build the Docker image
docker build -t stellark-backend:latest .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 7042:7042 stellark-backend:latest"
    echo ""
    echo "Or use Docker Compose:"
    echo "  docker-compose up -d"
else
    echo ""
    echo "❌ Docker build failed!"
    exit 1
fi
