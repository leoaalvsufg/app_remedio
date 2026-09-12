# Medication Scheduling App - Project Plan

## Overview
A mobile application designed to help users manage their medication schedules, providing reminders with visual aids (medicine photos) and future AI-powered health insights.

---

## Phase 1: Core Functionality (MVP)
The goal of Phase 1 is to establish a working system for user management and medication scheduling.

### 1. Features
- **User Authentication**: 
  - Sign-up and Login system.
  - Secure storage of user profiles.
- **Medicine Management**:
  - Registration of medicines (Name, dosage, frequency).
  - Upload/Association of a photo for each medicine.
  - User-specific lists (one user cannot see another's medicines).
- **Scheduling & Notifications**:
  - Set specific times for medication.
  - Push notifications to alert the user when it's time to take the medicine.
  - Alert screen displaying the medicine name and its photo.
- **Deployment**:
  - Development using **Expo** for cross-platform (iOS/Android) deployment.

### 2. Technical Stack (Recommended)
- **Frontend**: React Native with Expo.
- **Local Database (MVP)**: SQLite (for local data persistence in Phase 1).
- **Authentication**: Firebase Auth or local mock auth (for MVP).
- **Storage**: Expo FileSystem (local images) or Firebase Storage.
- **Notifications**: Expo Notifications.

---

## Phase 2: Intelligent Health Assistant (AI Integration)
Integrating the Gemma LLM via Ollama Cloud to provide expert-like guidance and migrating to a cloud backend.

### 1. Infrastructure Migration
- **Cloud Backend**: Migrate from local SQLite to **Supabase**.
- **Database**: PostgreSQL (via Supabase).
- **Authentication**: Supabase Auth.
- **Storage**: Supabase Storage (for medicine images).

### 2. AI Features
- **Smart Leaflets (Bulas)**:
  - AI-summarized leaflets tailored to the user's specific health conditions.
- **Drug Interaction Analysis**:
  - The LLM analyzes the user's registered medicine list to warn about potential dangerous interactions.
- **Optimal Timing**:
  - Suggestions on the best time to take medicine (e.g., "with food", "empty stomach") based on medical data.
- **Health Q&A**:
  - A chat interface where users can ask questions about their treatment.

### 3. AI Integration Details
- **Model**: Gemma (via Ollama Cloud).
- **Integration**: API calls from the backend to the Ollama endpoint.
- **Context Injection**: The system will provide the LLM with:
  - User's current health conditions.
  - List of currently taken medications.
  - Specific question or medicine being analyzed.

---

## Phase 3: Compliance, Security & Robustness
Refining the application for production-grade security and reliability.

### 1. Data Security & Privacy
- **Compliance**: Implementation of LGPD/HIPAA standards for health data.
- **Encryption**: End-to-end encryption for sensitive user health records.

### 2. AI Validation & Safety
- **Medical Validation**: Mechanisms to validate AI accuracy and source referencing.
- **Safety Disclaimers**: Clear warnings that the AI is an assistant and not a medical replacement.

### 3. Reliability
- **Offline First**: Ensuring notifications and medication lists are available without internet connectivity.

---

## Roadmap

### Milestone 1: Foundation (Phase 1)
- [ ] Setup Expo project.
- [ ] Implement Authentication flow.
- [ ] Develop Medicine registration screens.
- [ ] Implement Notification engine.
- [ ] Integration of image upload/display.

### Milestone 2: Intelligence (Phase 2)
- [ ] Setup Ollama Cloud connection.
- [ ] Develop prompt engineering for Gemma (Leaflets/Interactions).
- [ ] Implement the "AI Insight" screen.
- [ ] Beta testing for AI accuracy.

### Milestone 3: Robustness & Compliance (Phase 3)
- [ ] Implement LGPD/HIPAA data handling.
- [ ] Add AI safety guardrails and disclaimers.
- [ ] Develop offline caching and notification persistence.

### Milestone 4: Publication
- [ ] Final UI/UX polishing.
- [ ] App Store / Play Store submission via Expo Application Services (EAS).
