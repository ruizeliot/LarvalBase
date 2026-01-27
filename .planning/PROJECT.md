# Brainstorm Visual System

## What This Is

A collaborative visual brainstorming assistant that implements research-backed brainstorming techniques through an Excalidraw canvas interface. Multiple users connect to a shared session, contributing via voice (EN/FR auto-detected) or text, uploading documents to a shared gallery, and editing the canvas together. The AI acts as a "language extension" — a facilitator that externalizes user thinking into diagrams, wireframes, and visual artifacts they can react to and edit.

## Core Value

The AI proactively uses visual techniques to extract rich insights from users during brainstorming sessions — drawing first, adapting constantly, making the invisible visible.

## Current Milestone: v2.0 Collaborative Multi-User

**Goal:** Transform the single-user local tool into a multi-user collaborative session with voice input and document sharing.

**Target features:**
- Voice input via Whisper with auto-detect EN/FR
- Document gallery for shared images/docs
- Drag-drop documents into AI messages
- Multi-user hosting (starter becomes host, others connect via browser)
- Real-time sync of canvas, messages, and gallery across all users

## Requirements

### Validated

<!-- v1.0: Brainstorm Visual System Foundation -->
- Live Canvas MCP server with notes, diagrams, and canvas tools — v1.0
- Real-time WebSocket sync between MCP and viewer — v1.0
- Mermaid/ASCII/PlantUML diagram rendering — v1.0
- Excalidraw integration in React viewer — v1.0
- Notes persistence to filesystem — v1.0
- AI draws mind maps, matrices, affinity diagrams, flows proactively — v1.0
- Double Diamond session phases (diverge/converge cycles) — v1.0
- Engagement detection and adaptive technique switching — v1.0
- Human-first collaboration guardrails — v1.0
- User edit detection and incorporation — v1.0

### Active

- [ ] Voice input via Whisper with push-to-talk
- [ ] Auto-detect EN/FR language per utterance
- [ ] Document gallery for uploading images/docs
- [ ] Drag-drop from gallery to include document in AI message
- [ ] Multi-user hosting (host runs claude-brainstorm, others connect via browser)
- [ ] Real-time sync of canvas edits across all users
- [ ] Real-time sync of messages and gallery across all users
- [ ] AI sees unified conversation stream (unaware of multiple humans)

### Out of Scope

- Voice chat between users (voice is transcription only, not live audio)
- Cloud deployment (local network hosting only)
- User authentication/accounts (anonymous session joining)
- Changes to pipeline phases 2-5 — this focuses only on brainstorming (phase 1)

## Context

v1.0 shipped a complete single-user brainstorming system:
- Live Canvas MCP with drawing tools (mindmap, matrix, affinity, flow)
- Double Diamond session management with engagement detection
- Human-first collaboration guardrails
- Real-time canvas/notes sync via WebSocket

v2.0 extends this to multi-user collaborative sessions:
- Multiple users connect to same session via browser
- Voice input (Whisper) with EN/FR auto-detection
- Shared document gallery with drag-drop to AI messages
- All state (canvas, messages, gallery) synced in real-time

## Constraints

- **Hosting**: Local network only (host machine IP, no cloud deployment)
- **Voice**: Transcription via Whisper (not live audio streaming between users)
- **Auth**: Anonymous session joining (no user accounts)
- **Integration**: Must preserve existing v1.0 single-user functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on agent behavior, not new tools | Canvas infrastructure already works; gap is AI usage patterns | ✓ Good |
| Research brainstorming techniques first | User wants established methods, not invented approaches | ✓ Good |
| Measure success by brainstorm-notes.md richness | Concrete deliverable that captures session value | ✓ Good |
| Local network hosting, not cloud | Simplicity, user controls their data, no auth complexity | — Pending |
| AI unaware of multiple users | Simpler architecture, unified conversation stream | — Pending |
| Whisper auto-detect EN/FR | No manual language switching, natural flow | — Pending |

---
*Last updated: 2026-01-27 after v2.0 milestone start*
