# How to Change Admin PIN

## Quick Steps:

1. **Open `.env` file**
2. **Find line**: `ADMIN_PIN=1234`
3. **Change to your PIN**: `ADMIN_PIN=YOUR_NEW_PIN`
4. **Save the file**
5. **Restart server**: `npm run dev` or `npm start`

## Example:

```env
# Before
ADMIN_PIN=1234

# After
ADMIN_PIN=9876
```

## Important Notes:

- ⚠️ **Never commit `.env` to git** (already in `.gitignore`)
- 🔒 Use a strong PIN (4-6 digits recommended)
- 🔄 Restart server after changing
- 🌐 For Vercel: Update environment variable in Vercel Dashboard

## For Vercel Deployment:

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `ADMIN_PIN` or add new variable:
   - **Name**: `ADMIN_PIN`
   - **Value**: Your new PIN
5. **Save** and **Redeploy**

---

**Current Default PIN**: 1234 (⚠️ Change this for security!)
