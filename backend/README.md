# Stellark Backend API

Backend service for automated Soroban contract deployment.

## Features

- ✅ Automated contract deployment
- ✅ Build and deploy in one request
- ✅ Returns contract ID automatically
- ✅ CORS enabled for frontend integration
- 🐳 Docker support with port 7042

## Setup

```bash
cd backend
npm install
```

## Run

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker

**Build and run with Docker:**
```bash
# Build the image
docker build -t stellark-backend .

# Run the container
docker run -p 7042:7042 stellark-backend
```

**Using Docker Compose:**
```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

## API Endpoints

### POST /api/deploy-contract

Deploys a new equity-token contract instance.

**Response:**
```json
{
  "success": true,
  "contractId": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "message": "Contract deployed successfully",
  "explorerUrl": "https://stellar.expert/explorer/testnet/contract/CXXX..."
}
```

### GET /health

Health check endpoint.

### GET /api/deployment-info

Returns network configuration info.

## Environment Variables

Create a `.env` file:

```
PORT=3001
NODE_ENV=development
```

## Prerequisites

- Node.js 18+
- Stellar CLI installed and configured
- `alice` identity configured in Stellar CLI
- Cargo/Rust (for contract compilation)

## Usage

1. Start the backend: `npm run dev`
2. Frontend calls `/api/deploy-contract`
3. Backend builds and deploys contract
4. Returns contract ID to frontend
5. Frontend uses contract ID to initialize company

## Security Notes

⚠️ **For Production:**
- Add authentication/authorization
- Rate limiting
- API keys
- Input validation
- Whitelist allowed origins in CORS

Currently configured for development/testnet only.
