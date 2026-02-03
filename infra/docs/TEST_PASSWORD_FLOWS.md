# Testing Password Flows

This document describes how to test the password reset and change password functionality.

## Prerequisites

1. **SMTP Configuration**: Ensure `.env` has proper SMTP credentials for Gmail:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM="RQ Menu <noreply@yourdomain.com>"
   PASSWORD_RESET_TTL_MIN=15
   ```

2. **Gmail App Password**: For Gmail, create an App Password at https://myaccount.google.com/apppasswords (requires 2FA enabled).

3. **Database**: Run `npx prisma db push` to ensure the `PasswordResetToken` model is applied.

---

## Test Scenarios

### 1. Forgot Password - Existing Email

**Steps:**
1. Go to `/app/login`
2. Click "Mot de passe oublié ?"
3. Enter an email that exists in the database
4. Click "Envoyer"

**Expected Result:**
- ✅ Generic success message: "Si un compte existe avec cet email..."
- ✅ An email is sent with a reset link
- ✅ Token is stored hashed (SHA-256) in `PasswordResetToken` table
- ✅ Token expires in 15 minutes (configurable via `PASSWORD_RESET_TTL_MIN`)

**Verification:**
```sql
SELECT * FROM "PasswordResetToken" ORDER BY "createdAt" DESC LIMIT 1;
```
- `tokenHash` should be a 64-character hex string (SHA-256)
- `usedAt` should be NULL

---

### 2. Forgot Password - Non-existing Email

**Steps:**
1. Go to `/app/forgot-password`
2. Enter an email that does NOT exist: `nonexistent@example.com`
3. Click "Envoyer"

**Expected Result:**
- ✅ Same generic success message (no email enumeration!)
- ✅ No email is sent
- ✅ No token created in database

**Security Note:** Response timing should be similar for both cases to prevent timing attacks.

---

### 3. Reset Password - Valid Token

**Steps:**
1. Complete "Forgot Password" flow for an existing user
2. Open the reset link from email: `/app/reset-password?token=xxx`
3. Enter a new password (minimum 10 chars, 1 letter, 1 number)
4. Confirm the password
5. Click "Réinitialiser le mot de passe"

**Expected Result:**
- ✅ Success message displayed
- ✅ Redirected to login page after 2 seconds
- ✅ Can login with new password
- ✅ Token marked as used (`usedAt` set in database)
- ✅ All existing sessions revoked

**Verification:**
```sql
SELECT "usedAt" FROM "PasswordResetToken" WHERE id = '<token-id>';
-- Should show a timestamp
```

---

### 4. Reset Password - Token Reuse Attempt

**Steps:**
1. Complete reset password flow once
2. Copy the reset link
3. Try to use the same link again

**Expected Result:**
- ✅ Error: "Lien invalide ou expiré"
- ✅ Password NOT changed

---

### 5. Reset Password - Expired Token

**Steps:**
1. Set `PASSWORD_RESET_TTL_MIN=1` (1 minute) in `.env`
2. Request a password reset
3. Wait more than 1 minute
4. Try to use the reset link

**Expected Result:**
- ✅ Error: "Lien invalide ou expiré"
- ✅ Password NOT changed

**Alternatively**, manually expire a token:
```sql
UPDATE "PasswordResetToken" 
SET "expiresAt" = NOW() - INTERVAL '1 hour' 
WHERE id = '<token-id>';
```

---

### 6. Reset Password - Invalid Token

**Steps:**
1. Go to `/app/reset-password?token=invalid-token-123`

**Expected Result:**
- ✅ Error: "Lien invalide ou expiré"

---

### 7. Reset Password - No Token

**Steps:**
1. Go to `/app/reset-password` (without `?token=` parameter)

**Expected Result:**
- ✅ Message: "Le lien de réinitialisation est invalide ou a expiré."
- ✅ Button to request a new link

---

### 8. Change Password - Authenticated User

**Steps:**
1. Login to the app
2. Go to `/app/settings`
3. Click on "Sécurité"
4. Enter current password
5. Enter new password (10+ chars, 1 letter, 1 number)
6. Confirm new password
7. Click "Changer le mot de passe"

**Expected Result:**
- ✅ Success message
- ✅ Can logout and login with new password
- ✅ Other sessions (if any) are revoked

---

### 9. Change Password - Wrong Current Password

**Steps:**
1. Login to the app
2. Go to `/app/settings/security`
3. Enter WRONG current password
4. Enter new password
5. Click "Changer le mot de passe"

**Expected Result:**
- ✅ Error: "Mot de passe actuel incorrect"
- ✅ Password NOT changed

---

### 10. Rate Limiting - Forgot Password

**Steps:**
1. Go to `/app/forgot-password`
2. Submit the form 6 times rapidly (limit is 5 per 15 minutes)

**Expected Result:**
- ✅ First 5 requests: success message
- ✅ 6th request: HTTP 429 "Too Many Requests"

---

## Password Policy Validation

Test that the following passwords are REJECTED:

| Password | Reason |
|----------|--------|
| `short1` | Less than 10 characters |
| `aaaaaaaaaa` | No number |
| `1234567890` | No letter |
| `password` | Less than 10 chars, no number |

Test that the following passwords are ACCEPTED:

| Password | Reason |
|----------|--------|
| `Secure2024!` | 11 chars, has letters and numbers |
| `MyNewPass123` | 12 chars, has letters and numbers |
| `a1b2c3d4e5` | 10 chars, has letters and numbers |

---

## Session Revocation

When a password is changed (via reset or change-password):

1. **Reset Password**: ALL sessions for the user are revoked
2. **Change Password**: All OTHER sessions are revoked (current session kept)

**Verification:**
```sql
SELECT COUNT(*) FROM "Session" WHERE "userId" = '<user-id>';
-- After reset: should be 0
-- After change: should be 1 (current session)
```

---

## Security Checklist

- [ ] Token stored as SHA-256 hash, never plain text
- [ ] Generic response for forgot-password (no email enumeration)
- [ ] Token is single-use (marked with `usedAt` after use)
- [ ] Token expires after configurable time
- [ ] Rate limiting on forgot-password endpoint
- [ ] Password policy enforced (10 chars, 1 letter, 1 number)
- [ ] Sessions revoked on password change
- [ ] No timing attacks (consistent response time)

---

## Development Testing (No SMTP)

When `SMTP_HOST` is not configured, emails are logged to console instead of sent:

```
[DEV EMAIL] Would send to: user@example.com
Subject: Réinitialisez votre mot de passe
---
(HTML content logged)
```

Extract the reset token from the logged URL for testing.
