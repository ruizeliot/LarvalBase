# Feature Landscape: Collaborative Brainstorming v2.0

**Domain:** Multi-User Collaborative Brainstorming with Voice Input and Document Sharing
**Researched:** 2026-01-27
**Milestone:** v2.0 - Collaborative Multi-User
**Confidence:** HIGH (core patterns), MEDIUM (voice accuracy specifics)

---

## Scope

This document covers features for v2.0 milestone additions:
1. **Multi-user collaboration** (local network hosting, real-time sync)
2. **Voice input** (Whisper transcription, EN/FR auto-detect)
3. **Document gallery** (shared uploads, drag-drop to AI)

For brainstorming technique features (mind maps, matrices, Double Diamond, etc.), see the v1.0 FEATURES.md in this directory.

---

## Table Stakes

Features users expect from any competent collaborative brainstorming tool. Missing = feels incomplete.

### Multi-User Collaboration

| Feature | Why Expected | Complexity | Dependency | Source |
|---------|--------------|------------|------------|--------|
| **Real-time cursor presence** | Users need to know where others are working | Medium | WebSocket infrastructure (v1.0) | [Miro](https://miro.com/), [FigJam](https://www.figma.com/figjam/) |
| **Simultaneous editing** | Multiple users must edit canvas without conflicts | High | Existing Excalidraw collab (v1.0) | [Excalidraw Collab](https://excalidraw.com/) |
| **Join via URL/code** | No software install for guests; browser-only access | Low | Host serves viewer | [Lucidspark](https://lucid.co/lucidspark) |
| **Instant sync (<500ms perceived)** | Edits must feel real-time, not delayed | High | WebSocket, optimistic updates | [Miro](https://miro.com/), [Convex real-time](https://stack.convex.dev/keeping-real-time-users-in-sync-convex) |
| **Participant list** | Know who's in the session | Low | Session state | [All collaborative tools] |
| **Host controls** | Host can end session, manage gallery | Low | Role distinction | [Mural](https://www.mural.co/) |

### Voice Input

| Feature | Why Expected | Complexity | Dependency | Source |
|---------|--------------|------------|------------|--------|
| **Push-to-talk activation** | Prevents accidental recording; user controls when mic is live | Low | Keyboard shortcut | [Discord PTT](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated) |
| **Visual recording indicator** | User must know when mic is active (red dot/pulse) | Low | UI state | [Apple PTT Guidelines](https://developer.apple.com/videos/play/wwdc2022/10117/) |
| **Transcription display** | User sees their speech as text before sending | Low | Whisper output | [Otter.ai](https://otter.ai/), [Grain](https://grain.com/) |
| **Edit before send** | Allow correction of transcription errors | Low | Text input integration | [Voice-to-notes apps](https://voicetonotes.ai/blog/speech-to-text-apps/) |
| **Noise tolerance** | Should work in typical home/office environments | Medium | Whisper model selection | [Whisper accuracy](https://openai.com/index/whisper/) |

### Document Gallery

| Feature | Why Expected | Complexity | Dependency | Source |
|---------|--------------|------------|------------|--------|
| **Drag-drop upload** | Standard file upload pattern | Low | File API | [Dropbox Paper](https://www.dropbox.com/paper), [Notion](https://www.notion.so/) |
| **Image preview thumbnails** | Visual gallery, not just file names | Low | Image processing | [All gallery tools] |
| **Gallery visible to all users** | Shared resources for collaboration | Low | Sync infrastructure | [Miro](https://miro.com/) |
| **Drag from gallery to chat** | Natural way to reference documents in AI conversation | Medium | Drag-drop coordination | [ChatGPT drag-drop](https://www.pageon.ai/blog/chatgpt-drag-and-drop), [VS Code Copilot](https://code.visualstudio.com/docs/copilot/chat/copilot-chat-context) |
| **Supported formats: images, PDF** | Common document types for brainstorming | Medium | File parsing | [Document chat tools](https://myjotbot.com/blog/chat-with-documents) |

---

## Differentiators

Features that set this tool apart. Not expected by users, but highly valued.

### Multi-User Collaboration

| Feature | Value Proposition | Complexity | Notes | Source |
|---------|-------------------|------------|-------|--------|
| **AI sees unified stream** | AI treats all participants as one "user" - simpler, more natural | Low | Architectural decision | PROJECT.md design choice |
| **Anonymous participation** | No accounts required - instant join | Low | Reduces friction | [FigJam](https://www.figma.com/figjam/) free tier |
| **Local-only hosting** | Data stays on host machine, no cloud dependency | Medium | Privacy advantage | PROJECT.md constraint |
| **Automatic reconnection** | Handles brief network drops gracefully | Medium | Resilience | [Best practices](https://blog.pixelfreestudio.com/best-practices-for-real-time-data-synchronization-across-devices/) |

### Voice Input

| Feature | Value Proposition | Complexity | Notes | Source |
|---------|-------------------|------------|-------|--------|
| **Auto-detect EN/FR per utterance** | No manual language switching; natural bilingual flow | High | See Whisper limitations | [Whisper multilingual](https://github.com/openai/whisper) |
| **Speaker attribution in transcript** | Know who said what in session notes | High | Requires diarization | [Whisper diarization discussion](https://github.com/openai/whisper/discussions/264) |
| **Local Whisper processing** | No audio sent to cloud; privacy-first | Medium | Requires GPU for speed | [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) |
| **Segment-by-segment language detection** | Handle EN/FR switching within same session | High | See research below | [Whisper language detection](https://github.com/openai/whisper/discussions/1456) |

### Document Gallery

| Feature | Value Proposition | Complexity | Notes | Source |
|---------|-------------------|------------|-------|--------|
| **AI reads document content** | Claude can answer questions about uploaded PDFs/images | High | Requires document parsing + context | [JotBot](https://myjotbot.com/), [Chatize](https://www.chatize.com/) |
| **Pin documents to canvas** | Place reference images directly on Excalidraw | Medium | Canvas integration | [Miro image embedding](https://miro.com/) |
| **Auto-categorization** | AI suggests folder/tags for uploads | Medium | Document analysis | [Venngage document tools](https://venngage.com/blog/best-ai-document-generator/) |
| **Version history for gallery** | See what was uploaded when | Low | Audit trail | [Confluence](https://www.atlassian.com/software/confluence) |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

### Multi-User Collaboration

| Anti-Feature | Why Avoid | What to Do Instead | Source |
|--------------|-----------|-------------------|--------|
| **Live voice chat between users** | Complex, already solved by Discord/Teams; scope creep | Users use separate voice app if needed; focus on transcription | PROJECT.md explicit out-of-scope |
| **User accounts/authentication** | Adds friction, complexity, data storage requirements | Anonymous join via URL; session-scoped identity | PROJECT.md decision |
| **Cloud deployment** | Hosting complexity, data privacy concerns, cost | Local network only; host controls everything | PROJECT.md constraint |
| **Complex permission systems** | Over-engineering for brainstorming context | Host/guest distinction only; all guests can edit | [Lucid anti-patterns](https://lucid.co/blog/collaboration-anti-patterns) |
| **Chat between users (separate from AI)** | Feature creep; use existing tools | Single unified AI conversation stream | Simplicity |
| **Activity logging/surveillance** | Privacy concerns, not needed for brainstorming | Session-scoped, no persistent user tracking | Privacy-first |

### Voice Input

| Anti-Feature | Why Avoid | What to Do Instead | Source |
|--------------|-----------|-------------------|--------|
| **Voice-activated (always listening)** | Privacy nightmare; accidental recordings | Push-to-talk ONLY; explicit user control | [Apple PTT guidelines](https://developer.apple.com/videos/play/wwdc2022/10117/) |
| **Real-time streaming transcription** | Latency issues, partial results confusing | Wait for complete utterance, then transcribe | UX simplicity |
| **Auto-send after transcription** | User cannot review/correct before sending | Always show preview, require explicit send | User control |
| **Voice commands for UI** | Scope creep; voice is for content, not navigation | Voice = text input to AI only | Focus |
| **Cross-user audio mixing** | Not a voice chat tool | Each user's voice transcribed separately | PROJECT.md |

### Document Gallery

| Anti-Feature | Why Avoid | What to Do Instead | Source |
|--------------|-----------|-------------------|--------|
| **File editing in gallery** | Not a document editor; use dedicated tools | View-only; edit externally, re-upload | Focus |
| **Massive file support (>50MB)** | Performance issues, not needed for brainstorming | Reasonable size limits; optimize for images/PDFs | Performance |
| **Complex folder hierarchies** | Over-engineering for session-scoped tool | Flat gallery or single-level folders max | [Over-engineering anti-pattern](https://www.geeksforgeeks.org/blogs/types-of-anti-patterns-to-avoid-in-software-development/) |
| **Sync to cloud storage** | Scope creep; integration complexity | Local upload only; export at session end | Simplicity |
| **Document co-editing** | Google Docs already exists | Reference documents in brainstorm, don't edit them | Focus |

---

## Feature Dependencies

```
Existing v1.0 Infrastructure
    |
    +-- WebSocket sync (canvas, notes)
    |       |
    |       v
    +-- Multi-User Sync Layer
            |
            +-- Participant list
            +-- Real-time cursor presence
            +-- Unified AI conversation stream
            |
            v
        Voice Input Module
            |
            +-- Push-to-talk UI
            +-- Whisper transcription
            +-- Language detection (EN/FR)
            +-- Transcription preview + edit
            |
            v
        Document Gallery Module
            |
            +-- Upload/drag-drop
            +-- Thumbnail generation
            +-- Gallery sync to all users
            +-- Drag to AI chat context
            |
            v
        AI Context Enhancement
            |
            +-- Document content parsing
            +-- Multi-modal input (text + images + docs)
```

### Dependency Notes

1. **Multi-user sync BEFORE voice/docs** - Need infrastructure for sharing voice transcripts and gallery items
2. **Voice can be parallel with gallery** - Independent features, both depend on sync layer
3. **AI document reading is enhancement** - Can ship gallery without AI reading content initially
4. **Language detection complexity** - May need segment-based approach for mixed EN/FR

---

## Implementation Complexity Matrix

| Feature | Frontend | Backend | AI Integration | Testing | Overall |
|---------|----------|---------|----------------|---------|---------|
| Participant list | Low | Low | None | Low | **Low** |
| Join via URL | Low | Medium | None | Low | **Low** |
| Push-to-talk UI | Medium | Low | None | Medium | **Medium** |
| Gallery upload | Low | Low | None | Low | **Low** |
| Gallery sync | Medium | Medium | None | Medium | **Medium** |
| Real-time cursor presence | Medium | Medium | None | High | **Medium** |
| Whisper transcription | Low | High | High | High | **High** |
| EN/FR auto-detect | Low | High | High | High | **High** |
| Drag doc to AI context | Medium | Medium | High | High | **High** |
| AI reads doc content | Low | High | High | High | **High** |

---

## Whisper Language Detection Research

**Critical finding for EN/FR auto-detection:**

| Aspect | Finding | Implication | Source |
|--------|---------|-------------|--------|
| Initial detection | Whisper uses first 30 seconds to guess language | Long audio before speech may confuse | [Whisper GitHub](https://github.com/openai/whisper/discussions/1456) |
| Accuracy for common languages | ~100% for EN, FR, DE, ES individually | Good when single language | [User reports](https://github.com/openai/whisper/discussions/2167) |
| Code-switching | Not well supported; assumes single language | Mixed EN/FR in same utterance problematic | [Whisper limitations](https://github.com/openai/whisper/discussions/2009) |
| Model size matters | medium/large models detect better | Use at least medium model | [LabEx tutorial](https://labex.io/tutorials/linux-how-to-set-language-in-whisper-437912) |
| Workaround | Segment audio, detect language per segment | More processing but better accuracy | [Superwhisper docs](https://superwhisper.com/docs/common-issues/language-detection) |

**Recommendation:** For push-to-talk (short utterances), detect language per utterance. Don't rely on session-level detection. If utterance is mixed EN/FR, bias toward majority language or user's preference.

---

## Multi-User Sync Architecture Considerations

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **CRDT (Conflict-free Replicated Data)** | No central authority, offline-capable, peer-to-peer possible | Complex implementation, overhead for simple data | Consider for canvas sync |
| **OT (Operational Transform)** | Battle-tested (Google Docs), efficient for text | Central server required, complex transforms | Consider for shared text/notes |
| **Last-write-wins** | Simple, fast | Data loss on conflicts | OK for gallery metadata |
| **Optimistic updates + reconciliation** | Great UX (instant feel), handles latency | Need rollback logic | **Use for most features** |

**Recommendation:** Excalidraw already has collaboration built-in (CRDT-based). Leverage this for canvas. Use optimistic updates for chat/gallery. Don't over-engineer sync for MVP.

Sources: [TinyMCE OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/), [Convex real-time](https://stack.convex.dev/keeping-real-time-users-in-sync-convex)

---

## MVP Recommendation for v2.0

### Must Have (Phase 1)

1. **Multi-user session joining** - Host starts, guests join via URL
2. **Participant list** - Know who's in the session
3. **Real-time canvas sync** - Leverage Excalidraw collaboration
4. **Push-to-talk voice** - Basic Whisper transcription to chat
5. **Document gallery upload** - Shared image/PDF storage
6. **Drag to AI context** - Reference docs in conversation

### Should Have (Phase 2)

1. **EN/FR auto-detection** - Per-utterance language detection
2. **Cursor presence** - See where others are on canvas
3. **AI reads document content** - Deeper document integration
4. **Transcription edit before send** - Polish voice input

### Nice to Have (Post-MVP)

1. **Speaker attribution** - Who said what in transcript
2. **Pin docs to canvas** - Visual document placement
3. **Auto-reconnection** - Handle network drops gracefully
4. **Gallery search/filter** - Find uploaded docs quickly

---

## Success Metrics for v2.0 Features

| Feature Area | Metric | Target | How to Measure |
|--------------|--------|--------|----------------|
| Multi-user | Session join success rate | >95% | Test across browsers/networks |
| Multi-user | Sync latency perceived | <500ms | User perception testing |
| Voice | Transcription accuracy (EN) | >95% WER | Compare to ground truth |
| Voice | Transcription accuracy (FR) | >90% WER | Compare to ground truth |
| Voice | Language detection accuracy | >90% per utterance | Labeled test set |
| Gallery | Upload success rate | >99% | Error logging |
| Gallery | AI context inclusion success | >95% | Test document parsing |

---

## Sources

### Multi-User Collaboration
- [Miro - Visual Collaboration](https://miro.com/)
- [FigJam - Collaborative Whiteboard](https://www.figma.com/figjam/)
- [Lucidspark - Online Brainstorming](https://lucid.co/lucidspark)
- [Mural - Group Brainstorming](https://www.mural.co/)
- [TinyMCE - OT vs CRDT](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)
- [Convex - Real-time Sync](https://stack.convex.dev/keeping-real-time-users-in-sync-convex)
- [Lucid - Collaboration Anti-Patterns](https://lucid.co/blog/collaboration-anti-patterns)

### Voice Input
- [OpenAI Whisper](https://openai.com/index/whisper/)
- [Whisper GitHub - Language Detection](https://github.com/openai/whisper/discussions/1456)
- [Whisper GitHub - Multilingual Issues](https://github.com/openai/whisper/discussions/2009)
- [Discord - Voice Input Modes](https://support.discord.com/hc/en-us/articles/211376518-Voice-Input-Modes-101-Push-to-Talk-Voice-Activated)
- [Apple WWDC - Push to Talk Framework](https://developer.apple.com/videos/play/wwdc2022/10117/)
- [Superwhisper - Language Detection](https://superwhisper.com/docs/common-issues/language-detection)
- [VoiceToNotes - Speech to Text Apps](https://voicetonotes.ai/blog/speech-to-text-apps/)

### Document Gallery
- [Dropbox Paper - Document Collaboration](https://www.dropbox.com/paper)
- [Notion - Workspace Features](https://www.notion.so/)
- [ChatGPT Drag and Drop](https://www.pageon.ai/blog/chatgpt-drag-and-drop)
- [VS Code Copilot - Context Management](https://code.visualstudio.com/docs/copilot/chat/copilot-chat-context)
- [JotBot - Document Chat](https://myjotbot.com/blog/chat-with-documents)
- [Chatize - Document AI](https://www.chatize.com/)

### Anti-Patterns and Best Practices
- [GeeksforGeeks - Software Anti-Patterns](https://www.geeksforgeeks.org/blogs/types-of-anti-patterns-to-avoid-in-software-development/)
- [Over-Engineering Anti-Pattern](https://www.bairesdev.com/blog/software-anti-patterns/)
- [Resilio - Remote Collaboration Challenges](https://www.resilio.com/blog/remote-collaboration)
