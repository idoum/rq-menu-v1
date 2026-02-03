# Testing Signup Flow

This document describes how to test the restaurant signup functionality.

## Prerequisites

1. **Database**: Ensure the database is running and migrated (`npx prisma db push`)
2. **Environment**: Check `.env` has proper settings for cookies:
   ```env
   COOKIE_SECURE=false  # For http://localhost in dev
   APP_BASE_DOMAIN=saasresto.localhost
   ```

---

## Test Scenarios

### 1. Access Signup Page

**Steps:**
1. Go to `http://localhost:3000/app/register`

**Expected Result:**
- ✅ Page loads without redirect loop
- ✅ Form displays: Restaurant name, slug, email, password, confirm password
- ✅ Link to login page visible

---

### 2. Auto-generate Slug from Restaurant Name

**Steps:**
1. Type "La Belle Assiette" in the restaurant name field

**Expected Result:**
- ✅ Slug field auto-populates with "la-belle-assiette"
- ✅ Preview shows: `https://la-belle-assiette.saasresto.localhost`

---

### 3. Slug Availability Check (Debounced)

**Steps:**
1. Type "resto1" in the slug field
2. Wait 500ms for debounce

**Expected Result:**
- ✅ Loading spinner appears briefly
- ✅ Green checkmark if available
- ✅ Red X if unavailable

**Test unavailable slug:**
1. If "demo" tenant exists in seed, type "demo"

**Expected Result:**
- ✅ Red X appears
- ✅ Message: "Ce nom n'est pas disponible"

---

### 4. Reserved Slug Validation

**Steps:**
1. Type "app" in the slug field

**Expected Result:**
- ✅ Red X appears
- ✅ Slug is marked unavailable (reserved)

**Other reserved slugs to test:**
- `www`, `api`, `admin`, `help`, `support`, `demo`, `localhost`

---

### 5. Password Validation

**Steps:**
1. Enter password "short1"

**Expected Result:**
- ✅ Error: "Le mot de passe doit contenir au moins 10 caractères"

**Steps:**
1. Enter password "aaaaaaaaaa" (10 chars, no number)

**Expected Result:**
- ✅ Error: "Le mot de passe doit contenir au moins un chiffre"

**Valid password:**
- "RestoParis2024" (10+ chars, letters, numbers)

---

### 6. Successful Registration

**Steps:**
1. Fill in:
   - Restaurant name: "Resto Test 1"
   - Slug: "resto1" (auto-generated or typed)
   - Email: "owner@resto1.com"
   - Password: "RestoParis2024"
   - Confirm password: "RestoParis2024"
2. Click "Créer mon restaurant"

**Expected Result:**
- ✅ Loading state on button
- ✅ Toast: "Votre restaurant a été créé avec succès"
- ✅ Redirected to `/app` (dashboard)
- ✅ Onboarding card visible: "Bienvenue sur RQ Menu !"
- ✅ CTA: "Créer mon premier menu"

---

### 7. Duplicate Slug Error

**Steps:**
1. After creating "resto1", try to register again with same slug

**Expected Result:**
- ✅ Slug check shows red X (unavailable)
- ✅ Submit button disabled
- ✅ If somehow submitted, API returns 409: "Ce nom de domaine est déjà utilisé"

---

### 8. Logout and Login Again

**Steps:**
1. After registration, click logout in the header
2. Go to `/app/login`
3. Enter credentials from registration

**Expected Result:**
- ✅ Login succeeds
- ✅ Redirected to `/app`
- ✅ Dashboard shows tenant data

---

### 9. Access Menu via Subdomain (if proxy configured)

**Steps:**
1. Access `http://resto1.saasresto.localhost:3000/`

**Expected Result:**
- ✅ Public menu page loads (may show empty if no menu created yet)

---

### 10. Rate Limiting

**Steps:**
1. Submit registration form 6 times rapidly with invalid data

**Expected Result:**
- ✅ After 5 attempts, receive HTTP 429 "Too Many Requests"

---

## API Testing (cURL)

### Check Slug Availability

```bash
# Available slug
curl "http://localhost:3000/api/auth/slug-availability?slug=newresto"
# Response: {"available":true}

# Taken slug
curl "http://localhost:3000/api/auth/slug-availability?slug=demo"
# Response: {"available":false}

# Reserved slug
curl "http://localhost:3000/api/auth/slug-availability?slug=app"
# Response: {"available":false}
```

### Register New Restaurant

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantName": "Test Resto",
    "slug": "testresto",
    "email": "owner@test.com",
    "password": "TestPassword123",
    "confirmPassword": "TestPassword123"
  }'
# Response: {"success":true,"message":"Restaurant créé avec succès","tenantSlug":"testresto"}
```

---

## Database Verification

After successful registration:

```sql
-- Check tenant was created
SELECT id, name, slug FROM "Tenant" WHERE slug = 'resto1';

-- Check owner user was created
SELECT id, email, role, "tenantId" FROM "User" WHERE email = 'owner@resto1.com';

-- Check session was created
SELECT id, "userId", "expiresAt" FROM "Session" WHERE "userId" = '<user-id>';
```

---

## Security Checklist

- [ ] Slug validated: 3-30 chars, lowercase alphanumeric + hyphens
- [ ] Slug cannot start/end with hyphen
- [ ] Reserved slugs blocked (app, www, api, admin, etc.)
- [ ] Password policy enforced (10 chars, 1 letter, 1 number)
- [ ] Email normalized (lowercase, trimmed)
- [ ] Rate limiting on register endpoint (5 per minute per IP)
- [ ] Session created with hashed token in DB
- [ ] Cookie set httpOnly, sameSite=lax
- [ ] No email enumeration (slug taken error is acceptable for UX)
- [ ] Transaction ensures tenant+user created atomically
