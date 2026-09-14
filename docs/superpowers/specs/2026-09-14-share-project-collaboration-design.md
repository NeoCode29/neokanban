# Specification: Share Project & Multi-User Collaboration

## 1. Overview
This feature introduces project sharing and real-time team collaboration to NeoKanban. Board owners can invite other registered users via their email addresses to become project collaborators. Collaborators gain full access to view, create, edit, and move cards and checklists, as well as read and update Living Context documents. Destructive actions (deleting the board or modifying board membership) remain exclusively reserved for the board Owner.

---

## 2. Architecture & Data Model

### 2.1 Prisma Schema Changes
A new explicit pivot relation model `BoardMember` is added to `prisma/schema.prisma`:

```prisma
model BoardMember {
  id        String   @id @default(cuid())
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String   @default("COLLABORATOR") // "COLLABORATOR"
  createdAt DateTime @default(now())

  @@unique([boardId, userId])
  @@index([boardId])
  @@index([userId])
}
```

On model `User`:
```prisma
  memberBoards BoardMember[]
```

On model `Board`:
```prisma
  members BoardMember[]
```

---

## 3. Authorization Helper

A unified helper `hasBoardAccess(boardId: string, userId: string)` is introduced in `src/lib/board-auth.ts`:
- Checks if `board.ownerId === userId` (Owner) OR `board.members.some(m => m.userId === userId)` (Collaborator).
- Returns `{ hasAccess: boolean, isOwner: boolean, board: Board }`.

This replaces repetitive owner checks across card, column, and context endpoints to grant seamless collaborative access.

---

## 4. API Endpoints

### 4.1 New Endpoints
1. `GET /api/boards/[id]/members`
   - **Access**: Owner or Collaborator.
   - **Response**:
     ```json
     {
       "owner": { "id": "...", "name": "...", "email": "...", "avatarUrl": "..." },
       "members": [
         {
           "id": "member_cuid",
           "userId": "user_cuid",
           "role": "COLLABORATOR",
           "createdAt": "...",
           "user": { "id": "...", "name": "...", "email": "...", "avatarUrl": "..." }
         }
       ],
       "isOwner": true
     }
     ```

2. `POST /api/boards/[id]/members`
   - **Access**: Strictly Board Owner.
   - **Payload**: `{ "email": "user@example.com" }`
   - **Validation**:
     - Email must exist in `User` table.
     - Target user cannot be the board owner (`ownerId === targetUser.id` -> 400 Bad Request: "User is already the owner").
     - Target user cannot already be a member (400 Bad Request: "User is already a collaborator").
   - **Response**: 201 Created with created `BoardMember` details.

3. `DELETE /api/boards/[id]/members/[memberId]`
   - **Access**:
     - Board Owner (can remove any collaborator).
     - OR the Collaborator themselves (can voluntarily leave the board).
   - **Response**: 200 OK `{ "message": "Member removed successfully" }`.

### 4.2 Updated Existing Endpoints
1. `GET /api/boards`
   - **Query**:
     ```ts
     where: {
       OR: [
         { ownerId: user.id },
         { members: { some: { userId: user.id } } }
       ]
     }
     ```
   - **Response**: Each board object includes `isOwner: boolean` and `membersCount: number`.

2. `GET /api/boards/[id]`
   - Allows access if `ownerId === user.id` OR user is in `members`.
   - Returns `isOwner` boolean flag to the client.

3. Card, Column, and Context Endpoints (`/api/cards`, `/api/cards/[id]`, `/api/boards/[id]/columns`, `/api/boards/[id]/context`):
   - Access verified via `hasBoardAccess`.

---

## 5. User Interface (UI) Components

### 5.1 "Share" Button in Board Header (`src/app/(dashboard)/boards/[id]/page.tsx`)
- Located next to the `+ New task` button.
- Clean Counsel Minimalist style:
  - Button with `Users` icon and label `"Share"`.
  - Displays small counter badge when project has members.

### 5.2 Share Project Modal (`src/components/kanban/ShareBoardModal.tsx`)
- **Header**: "Share Project" with description "Invite teammates to collaborate on this board."
- **Invitation Form (Owner only)**:
  - Email input field: `collaborator@company.com`.
  - "Invite" button with loading spinner state.
  - Inline error/success messages (e.g. "User not found with this email", "User is already a member").
- **Member Roster**:
  - Displays Owner card with badge `Owner` and avatar.
  - Displays list of Collaborators with avatar, name, email, and joined timestamp.
  - For each collaborator:
    - If current viewer is Owner: displays "Remove" button with confirmation.
    - If current viewer is the collaborator: displays "Leave Board" button.

### 5.3 Board Card Badge on Dashboard (`src/app/(dashboard)/page.tsx`)
- Displays `Shared` pill badge (with `Users` icon) if the board has collaborators or if the current user is a collaborator.

---

## 6. Testing & Verification
1. **Prisma Migration**: Run `npx prisma db push` to synchronize PostgreSQL schema with new `BoardMember` model.
2. **API Verification Script**: Automated script to test:
   - Creating a second demo user.
   - Inviting user by email to a board.
   - Verifying the board appears on the invited user's dashboard.
   - Verifying the invited user can create cards and update context.
   - Verifying non-owners cannot delete the board or invite others.
   - Verifying member removal revokes access.
3. **TypeScript & Build Check**: Run `npx tsc --noEmit` and verify Next.js build.
