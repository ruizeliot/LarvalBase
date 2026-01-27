# Requirements: Brainstorm Visual System

**Defined:** 2026-01-27
**Core Value:** The AI proactively uses visual techniques to extract rich insights from users during brainstorming sessions

## v1.0 Requirements (COMPLETE)

All v1.0 requirements shipped. See PROJECT.md Validated section.

## v2.0 Requirements

Requirements for milestone v2.0: Collaborative Multi-User.

### Multi-User Sessions

- [ ] **SESS-01**: Host starts session and sees shareable URL with session code
- [ ] **SESS-02**: Guest joins session via URL and sees same canvas state
- [ ] **SESS-03**: Host sees list of connected participants (name/identifier)
- [ ] **SESS-04**: Guest sees list of connected participants
- [ ] **SESS-05**: User sees other users' cursor positions on canvas in real-time
- [ ] **SESS-06**: Canvas edits by any user sync to all users within 500ms
- [ ] **SESS-07**: Messages sent by any user appear to all users
- [ ] **SESS-08**: Session ends when host disconnects (guests notified)

### Voice Input

- [ ] **VOICE-01**: User can press-and-hold button to record voice
- [ ] **VOICE-02**: User sees visual recording indicator while button held
- [ ] **VOICE-03**: User sees audio level feedback during recording
- [ ] **VOICE-04**: Recorded audio is transcribed via Whisper on release
- [ ] **VOICE-05**: Transcribed text appears in message input field
- [ ] **VOICE-06**: Whisper auto-detects EN or FR per utterance
- [ ] **VOICE-07**: User sees indicator of detected language after transcription

### Document Gallery

- [ ] **DOC-01**: User can upload images to shared gallery via drag-drop or file picker
- [ ] **DOC-02**: User can upload documents (PDF, etc.) to shared gallery
- [ ] **DOC-03**: Gallery displays thumbnails of all uploaded files
- [ ] **DOC-04**: All users see same gallery contents (synced)
- [ ] **DOC-05**: User can drag file from gallery into message compose area
- [ ] **DOC-06**: Dragged file is included as context when message sent to AI
- [ ] **DOC-07**: AI can read and reference content from attached documents
- [ ] **DOC-08**: User can preview image/document before sending

## Future Requirements

Deferred to later milestones.

### Enhanced Collaboration

- **SESS-09**: Typing indicators when someone is composing a message
- **SESS-10**: Session persistence across host restart
- **SESS-11**: User authentication/named accounts

### Advanced Voice

- **VOICE-08**: Voice activity detection (auto-stop recording on silence)
- **VOICE-09**: Support additional languages beyond EN/FR

### Advanced Documents

- **DOC-09**: Folder organization in gallery
- **DOC-10**: Document annotation tools

## Out of Scope

Explicitly excluded for v2.0.

| Feature | Reason |
|---------|--------|
| Voice chat between users | Complexity; voice is transcription only |
| Cloud deployment | Local network hosting per user request |
| User authentication | Anonymous session joining for simplicity |
| Always-listening voice | Privacy concerns; push-to-talk only |
| Document co-editing | Canvas is shared, docs are reference only |
| Video streaming | Out of scope for brainstorming tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESS-01 | Phase 4 | Pending |
| SESS-02 | Phase 4 | Pending |
| SESS-03 | Phase 6 | Pending |
| SESS-04 | Phase 6 | Pending |
| SESS-05 | Phase 6 | Pending |
| SESS-06 | Phase 5 | Pending |
| SESS-07 | Phase 5 | Pending |
| SESS-08 | Phase 4 | Pending |
| VOICE-01 | Phase 7 | Pending |
| VOICE-02 | Phase 7 | Pending |
| VOICE-03 | Phase 7 | Pending |
| VOICE-04 | Phase 7 | Pending |
| VOICE-05 | Phase 7 | Pending |
| VOICE-06 | Phase 7 | Pending |
| VOICE-07 | Phase 7 | Pending |
| DOC-01 | Phase 8 | Pending |
| DOC-02 | Phase 8 | Pending |
| DOC-03 | Phase 8 | Pending |
| DOC-04 | Phase 8 | Pending |
| DOC-05 | Phase 8 | Pending |
| DOC-06 | Phase 8 | Pending |
| DOC-07 | Phase 8 | Pending |
| DOC-08 | Phase 8 | Pending |

**Coverage:**
- v2.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after v2.0 roadmap creation*
