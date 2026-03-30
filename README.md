# PROJECT SOUN — The Internet for AI (v1.9)

Project Soun is a universal execution protocol designed to transform the internet from a system of passive information retrieval into a decentralized web of active, machine-driven execution. It enables AI agents to discover, evaluate, and execute real-world tasks through a standardized, blockchain-backed interface.

## 🚀 Core Philosophy
- **Machine-Native**: Built for agents, not browsers.
- **Action-Based**: Every interaction is a transformation: `Intent → Action → Execution → Outcome`.
- **Decentralized**: No single point of control; a global mesh of execution nodes.
- **Economic**: A self-sustaining marketplace where agents pay for verified outcomes.

## 🛠 Key Layers

### 1. Identity Layer (DIDs)
Agents and nodes are identified via **Decentralized Identifiers** (`did:soun:uuid`). This ensures verifiable attribution and reputation tracking across the entire network.

### 2. Discovery Layer (Search & Tools)
- **Distributed Search**: Nodes query peers in parallel to find the best provider globally.
- **AI Tool Export**: Automatically serves all actions as **OpenAI/Claude Function** definitions.
- **Website Crawler**: Auto-onboards websites that host a `soun.json` configuration file.

### 3. Execution Layer (The Engine)
- **Smart Routing**: Automatically routes tasks to local handlers, external APIs, or peer nodes.
- **Self-Healing**: Built-in **Retries** with backoff and **Fallback** to alternative providers on failure.
- **Validation**: Strict **JSON Schema** enforcement for all inputs and outputs.

### 4. Economy Layer (Blockchain Ledger)
- **Immutable Ledger**: All execution payments are recorded on a Proof-of-Work blockchain.
- **Native Wallets**: Real-time balance tracking and verifiable transaction history for all participants.
- **Trust-Based Ranking**: Providers are ranked by their historical success rate and reputation.

## 🔄 System Workflow
1. **Agent Discovery**: Agent hits `GET /.soun` to understand node capabilities.
2. **Intent Search**: Agent searches `POST /api/search` for a task (e.g., "book a flight").
3. **Execution**: Agent calls `POST /api/execute/:action_id` with structured parameters.
4. **Settlement**: Payment is processed via the blockchain ledger.
5. **Learning**: Trust scores are updated based on the execution outcome.

## 📊 Observability
- **Real-time Dashboard**: Accessible at `http://localhost:3001` (Monitor metrics, logs, and peers).
- **Blockchain Explorer**: Live view of the chain, block height, and transactions.
- **Interactive API Docs**: Full Swagger/OpenAPI spec at `http://localhost:3001/docs`.

## 🏗 Setup & Run

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
git clone <repository-url>
cd SOUN
npm install
```

### Running the Node
```bash
# Start the production server
npm start

# Run the verification simulation
npx ts-node src/verify.ts

# Run the test suite
npm test
```

## 🔒 Security
- **API Key Auth**: All execution and registration endpoints require an `X-SOUN-API-KEY`.
- **Rate Limiting**: Protected against DDoS and API abuse.
- **Schema Guard**: Prevents malformed data from reaching service providers.

---
🚀 **PROJECT SOUN** — Building the foundational fabric for the autonomous AI internet.
