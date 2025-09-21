# Project Overview

## Purpose
This is a Next.js POC (Proof of Concept) application that demonstrates WebRTC-based voice communication with Azure OpenAI Realtime API. It implements a rental car reservation system with voice-based AI agent interaction.

## Tech Stack
- **Framework**: Next.js 14+ with TypeScript
- **Frontend**: React 18.2.0 with TypeScript
- **Backend**: Next.js API routes
- **Database**: Azure Cosmos DB (optional, falls back to sample data)
- **AI**: Azure OpenAI Realtime API (gpt-realtime model)
- **Communication**: WebRTC for real-time audio, WebSockets for data channels
- **Audio**: Web Audio API, RTCPeerConnection

## Key Features
1. **Voice-based AI Agent**: Real-time voice conversation with AI for rental car reservations
2. **Function Calling**: AI can call backend functions (list locations, check availability, create reservations, etc.)
3. **WebRTC Integration**: Direct browser-to-Azure audio connection
4. **Multilingual Support**: Japanese language support with transcription
5. **Fallback Data**: Works with sample data when Cosmos DB is not configured

## Application Flow
1. Client requests session from `/api/realtime/session`
2. Server creates Azure Realtime session with function tools
3. Client establishes WebRTC connection with Azure
4. AI agent guides customer through rental car reservation process
5. Functions are executed server-side when called by AI