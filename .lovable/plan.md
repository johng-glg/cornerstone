

# Fix Forth API Token Extraction

## Issue Identified
The Forth CRM API returns `api_key` instead of `access_token` in the OAuth response. The credentials are valid and authentication is successful - we just need to extract the token from the correct field.

**Actual API Response:**
```json
{
  "response": {
    "api_key": "62af0c55-b4c7-c578-2acc-ac54566f02dd",
    "expires_in": 864000
  },
  "status": {
    "code": 200
  }
}
```

**Current Code (line 62-65):**
```typescript
const accessToken = tokenData.response?.access_token || 
                    tokenData.access_token || 
                    tokenData.data?.access_token ||
                    tokenData.token;
```

## Solution
Update the token extraction in all edge functions to include `api_key` as a fallback.

## Files to Update

### 1. supabase/functions/forth-auth/index.ts
Change line 62-65 to:
```typescript
const accessToken = tokenData.response?.access_token || 
                    tokenData.response?.api_key ||  // Add this line
                    tokenData.access_token || 
                    tokenData.api_key ||            // Add this line
                    tokenData.data?.access_token ||
                    tokenData.token;
```

### 2. supabase/functions/forth-create-draft/index.ts
Same token extraction fix in the `getAccessToken()` function.

### 3. supabase/functions/forth-poll-transactions/index.ts
Same token extraction fix.

### 4. supabase/functions/forth-cancel-draft/index.ts
Same token extraction fix.

### 5. supabase/functions/forth-update-draft/index.ts
Same token extraction fix.

### 6. supabase/functions/forth-sync-client/index.ts
Same token extraction fix.

### 7. supabase/functions/forth-pause-resume/index.ts
Same token extraction fix.

## Verification
After deployment, call the `forth-auth` endpoint to confirm:
- Returns `success: true`
- Shows token preview (e.g., `"tokenPreview": "62af0c55-b..."`)

