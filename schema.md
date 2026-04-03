# PulseNote Database Schema (Firestore)

## Collections

### 1. `users`
- `uid`: string (Primary Key)
- `email`: string
- `displayName`: string
- `photoURL`: string
- `preferences`: map
  - `defaultReminderTime`: string
  - `theme`: string
- `createdAt`: timestamp

### 2. `notes`
- `id`: string (Primary Key)
- `userId`: string (Index)
- `content`: string (Original text or transcription)
- `mediaUrl`: string (Optional, link to voice/image/video)
- `type`: string ("text" | "voice" | "image" | "video")
- `summary`: string (AI generated)
- `tags`: array<string> (AI generated)
- `clusterId`: string (Optional, for grouping related notes)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### 3. `reminders`
- `id`: string (Primary Key)
- `noteId`: string (Reference to note)
- `userId`: string (Index)
- `taskName`: string
- `remindAt`: timestamp
- `status`: string ("pending" | "completed" | "snoozed" | "missed")
- `context`: string (Extracted context like people or location)
- `createdAt`: timestamp
