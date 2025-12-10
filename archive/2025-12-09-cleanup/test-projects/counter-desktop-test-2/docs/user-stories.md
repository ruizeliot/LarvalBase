# User Stories

**Project:** Counter Desktop App
**Date:** 2025-12-04
**Total Stories:** 6
**Epics:** 2

---

## Epic 1: Login

### US-001: App Window Launches with Login

**As a** user
**I want to** see the login screen when I launch the application
**So that** I can authenticate before using the counter

**Acceptance Criteria:**
- [ ] Application window opens on launch
- [ ] Window displays "Counter App" title
- [ ] Login form is visible with username and password fields
- [ ] Login button is visible

---

### US-002: User Login

**As a** user
**I want to** enter my credentials and log in
**So that** I can access the counter functionality

**Acceptance Criteria:**
- [ ] Can enter username in text field
- [ ] Can enter password in password field
- [ ] Clicking Login with valid credentials (user/pass) shows counter view
- [ ] Clicking Login with invalid credentials shows error message
- [ ] Error message disappears when user starts typing again

---

## Epic 2: Counter

### US-003: Counter Display

**As a** logged-in user
**I want to** see the counter display
**So that** I can view the current count value

**Acceptance Criteria:**
- [ ] Counter value is visible and shows 0 initially
- [ ] Counter display is large and centered
- [ ] All control buttons are visible below the counter

---

### US-004: Increment Counter

**As a** logged-in user
**I want to** click an increment button
**So that** I can increase the counter value by 1

**Acceptance Criteria:**
- [ ] Plus button (+) is visible
- [ ] Clicking + increases counter by 1
- [ ] Counter display updates immediately

---

### US-005: Decrement Counter

**As a** logged-in user
**I want to** click a decrement button
**So that** I can decrease the counter value by 1

**Acceptance Criteria:**
- [ ] Minus button (-) is visible
- [ ] Clicking - decreases counter by 1
- [ ] Counter can go negative

---

### US-006: Reset Counter

**As a** logged-in user
**I want to** click a reset button
**So that** I can return the counter to zero

**Acceptance Criteria:**
- [ ] Reset button is visible
- [ ] Clicking Reset sets counter to 0
- [ ] Works regardless of current counter value

---

## Story Index

| ID | Title | Epic |
|----|-------|------|
| US-001 | App Window Launches with Login | 1 |
| US-002 | User Login | 1 |
| US-003 | Counter Display | 2 |
| US-004 | Increment Counter | 2 |
| US-005 | Decrement Counter | 2 |
| US-006 | Reset Counter | 2 |
