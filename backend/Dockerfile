# Use official Node.js LTS image
FROM node:20-alpine

# Install Rust and Cargo (needed for building Soroban contracts)
RUN apk add --no-cache \
    curl \
    build-base \
    git \
    bash

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Add wasm32 target for Soroban
RUN rustup target add wasm32-unknown-unknown

# Install Stellar CLI (without features flag)
RUN cargo install --locked stellar-cli

# Set working directory
WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy backend source code
COPY . .

# Copy the entire stellark contracts directory (needed for deployment)
COPY ../stellark /app/stellark

# Expose port 7042
EXPOSE 7042

# Set environment variable
ENV PORT=7042

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7042/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["npm", "start"]
