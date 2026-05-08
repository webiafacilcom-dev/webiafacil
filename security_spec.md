# Security Specification - WebIA Fácil

## 1. Data Invariants
- A User profile must match the `request.auth.uid`.
- Timestamps (`createdAt`, `updatedAt`) must be set by the server (`request.time`).
- Users can only read and write their own data (Split Collection / Ownership).
- WhatsApp links and Website projects must belong to the user who created them.
- Plan transitions must be controlled (though currently simplified in app).

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoof**: `{ email: 'victim@gmail.com', userId: 'attacker_uid' }` sent to `/users/victim_uid`.
2. **Shadow Field**: `{ email: 'a@b.com', isAdmin: true }` sent to `/users/uid`.
3. **Orphan Write**: Writing to `/users/uid/websites/site1` without having a profile at `/users/uid`.
4. **Time Warp**: `{ createdAt: '2020-01-01' }` (past date) sent during creation.
5. **Junk ID**: Creating a project with ID `...../etc/passwd` (Resource Poisoning).
6. **Plan Escalation**: Updating user plan to `master` without valid business logic (if restricted).
7. **Cross-User Leak**: Attempting to list all users as a standard authenticated user.
8. **Resource Exhaustion**: Sending a 1MB `prompt` string in `WebsiteProject`.
9. **Mutation Gaps**: Updating `email` which should be immutable once registered.
10. **Terminal State Break**: Modifying a `completed` website project status.
11. **PII Blanket Read**: Attempting to `get` another user's profile info.
12. **Anonymous Write**: Attempting to create a profile without a valid Firebase Auth token.

## 3. Test Runner (Draft)
```ts
// firestore.rules.test.ts
// verified via rule logic
```
