# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js TypeScript POC application that demonstrates WebRTC-based voice communication with Azure OpenAI Realtime API. It implements a rental car reservation system where users can interact with an AI agent through voice to manage reservations.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

The application follows Next.js 13+ app router patterns:

- `app/api/realtime/session/` - Creates Azure OpenAI Realtime sessions with configured AI tools
- `app/api/functions/` - RESTful endpoints callable by the AI agent (locations, availability, reservations)
- `app/realtime/` - Frontend voice interface using WebRTC for real-time audio
- `lib/cosmosClient.ts` - Azure Cosmos DB client with fallback to sample data

### Key Data Flow
1. Client requests session → Server creates Azure Realtime session
2. WebRTC connection established between browser and Azure
3. AI agent processes voice → Calls function endpoints → Returns responses
4. Function endpoints query Cosmos DB (or use sample data)

## Environment Variables

Required (set in `.env.local`):
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI resource endpoint
- `AZURE_OPENAI_API_KEY` - API key

Optional:
- `AZURE_OPENAI_DEPLOYMENT` - Model deployment name (defaults to 'gpt-realtime')
- `COSMOS_ENDPOINT`, `COSMOS_KEY` - Cosmos DB configuration
- `NEXT_PUBLIC_AZURE_OPENAI_REGION` - Azure region for client-side WebRTC

## Technology Stack

- **Frontend**: React 18.2 with TypeScript, WebRTC APIs
- **Backend**: Next.js API routes
- **Database**: Azure Cosmos DB (optional, falls back to sample data)
- **AI**: Azure OpenAI Realtime API with function calling
- **Audio**: WebRTC peer connections, data channels for events

## Code Conventions

- Strict TypeScript mode, no JavaScript files
- Functional React components with hooks
- Environment-based configuration with graceful fallbacks
- Error handling with user-friendly messages and appropriate HTTP status codes

## Testing and Quality

When completing tasks:
1. Run `npm run lint` to check for issues
2. Test both development (`npm run dev`) and production builds (`npm run build`)
3. Manually test voice functionality at `/realtime`
4. Verify API endpoints work with and without Cosmos DB configuration
5. Ensure WebRTC features work in supported browsers

## Key URLs

- Main application: http://localhost:3000
- Voice demo: http://localhost:3000/realtime  
- Session API: http://localhost:3000/api/realtime/session