# ERC-8004 Agent Demo

An example AgentKit agent demonstrating the ERC-8004 trust protocol with x402 paid endpoints. This demo shows the clear separation between agent on-chain actions (backend) and user wallet interactions (frontend).

## Features

- **ERC-8004 Identity** - Agent registration on the Identity Registry (NFT-based)
- **ERC-8004 Reputation** - User feedback system for agent reputation
- **x402 Payments** - Paid premium endpoint using @x402/next
- **AgentCard** - A2A-compatible agent discovery at `/.well-known/agent-card.json`
- **User Wallet** - wagmi integration for frontend wallet connectivity

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (User Wallet)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ wagmi Wallet │  │ Chat UI      │  │ Feedback Form        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────┬───────────────┬───────────────────┬────────────────┘
             │               │                   │
     Free requests     x402 payment      giveFeedback tx
             │               │                   │
             ▼               ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                    Backend (Agent Wallet)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ CDP Wallet   │  │ /api/agent   │  │ /api/agent/premium   │ │
│  │ (ERC-8004)   │  │ (Free)       │  │ (x402 Paid)          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│                    ERC-8004 Registries                         │
│  ┌────────────────────────┐  ┌────────────────────────┐       │
│  │ Identity Registry      │  │ Reputation Registry    │       │
│  │ (Agent NFTs)           │  │ (Feedback & Scores)    │       │
│  └────────────────────────┘  └────────────────────────┘       │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Required environment variables:
- `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` - CDP API credentials
- `OPENAI_API_KEY` - OpenAI API key
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID (optional)

### 3. Start the development server

```bash
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Endpoint | Method | Payment | Description |
|----------|--------|---------|-------------|
| `/api/agent` | GET | Free | Endpoint info |
| `/api/agent` | POST | Free | Agent chat interaction |
| `/api/agent/premium` | GET | Free | Premium endpoint info |
| `/api/agent/premium` | POST | x402 | Paid agent interaction |
| `/api/agent/identity` | GET | Free | Agent ERC-8004 identity |
| `/.well-known/agent-card.json` | GET | Free | A2A AgentCard |

## ERC-8004 Actions

The agent has the following ERC-8004 actions available:

- `register_agent` - Register agent on Identity Registry
- `update_agent_uri` - Update agent metadata URI
- `get_agent_identity` - Get agent identity info
- `append_feedback_response` - Respond to user feedback
- `get_reputation_summary` - Get agent reputation summary

Try chatting with the agent:
- "Get my agent identity"
- "Register agent with URI https://example.com/agent.json"
- "Get reputation summary for agent 123"

## Registry Addresses (Base Sepolia)

| Registry | Address |
|----------|---------|
| Identity | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Validation | `0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5` |

## File Structure

```
erc8004-agent/
├── app/
│   ├── api/
│   │   └── agent/
│   │       ├── route.ts              # Free endpoint
│   │       ├── premium/route.ts      # x402 paid endpoint
│   │       ├── identity/route.ts     # Agent identity info
│   │       ├── create-agent.ts       # Agent initialization
│   │       └── prepare-agentkit.ts   # AgentKit setup
│   ├── .well-known/
│   │   └── agent-card.json/route.ts  # AgentCard endpoint
│   ├── components/
│   │   ├── WalletConnect.tsx         # Wallet connector
│   │   └── FeedbackForm.tsx          # Feedback submission
│   ├── hooks/
│   │   ├── useAgent.ts               # Agent interaction hook
│   │   └── useUserWallet.ts          # User wallet hook
│   ├── lib/
│   │   └── wagmi-config.ts           # wagmi configuration
│   ├── providers/
│   │   └── WagmiProvider.tsx         # React context provider
│   └── page.tsx                      # Main UI
├── actions/
│   └── erc8004/                      # ERC-8004 action provider
│       ├── erc8004ActionProvider.ts  # Main provider class
│       ├── schemas.ts                # Zod schemas
│       ├── constants.ts              # Registry addresses
│       ├── abis.ts                   # Contract ABIs
│       └── index.ts                  # Exports
├── lib/
│   ├── x402-server.ts                # x402 server setup
│   └── erc8004/                      # ERC-8004 utilities
│       ├── identity.ts               # Identity registry client
│       ├── reputation.ts             # Reputation registry client
│       ├── bootstrap.ts              # Agent identity bootstrap
│       └── types.ts                  # TypeScript types
└── .env.example                      # Environment template
```

## User Feedback Flow

1. User interacts with the agent (free or paid endpoint)
2. For paid endpoints, x402 payment proof is captured
3. User rates the interaction (0-100 score) with optional tags
4. Feedback is submitted on-chain via the Reputation Registry
5. Agent can respond to feedback using `appendResponse`

## Learn More

- [ERC-8004 Specification](https://github.com/erc-8004/erc-8004-contracts)
- [AgentKit Documentation](https://docs.cdp.coinbase.com/agentkit)
- [x402 Protocol](https://x402.org)
- [CDP Portal](https://portal.cdp.coinbase.com)
