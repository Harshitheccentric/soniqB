# Frontend Debugging Guide

## Issue: Only seeing gradient background

The frontend is running but you're only seeing the gradient background. This means the React app isn't rendering properly.

## Quick Diagnosis Steps

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab for errors.

**Common errors to look for:**
- CORS errors (Cross-Origin Request Blocked)
- Module import errors
- Network errors when fetching `/users`

### 2. Check Network Tab
In Developer Tools, go to the Network tab and refresh the page.

**Look for:**
- Is `main.jsx` loading successfully?
- Is the request to `http://localhost:8000/users` succeeding or failing?
- Any 404 or 500 errors?

### 3. Check React DevTools
If you have React DevTools installed, check if the components are mounting.

## Most Likely Issues

### Issue 1: Backend Not Running
**Symptom:** Network error when fetching users

**Solution:**
```bash
cd /home/fate/prj/soniqB
./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### Issue 2: CORS Error
**Symptom:** Console shows "CORS policy" error

**Solution:** Backend already has CORS enabled, but check that it's running on port 8000

### Issue 3: Port Changed
**Symptom:** Frontend is on port 5174 instead of 5173

**Current Status:**
- Frontend: http://localhost:5174 (port changed automatically)
- Backend: http://localhost:8000

**No action needed** - this is fine, just use port 5174

## Manual Testing

### Test 1: Check if React is loading
Open browser console and type:
```javascript
document.getElementById('root').innerHTML
```

If it returns empty string `""`, React isn't mounting.

### Test 2: Check if backend is accessible
Open a new tab and go to:
```
http://localhost:8000/users
```

You should see JSON with user data.

### Test 3: Test API from console
In the browser console on http://localhost:5174, type:
```javascript
fetch('http://localhost:8000/users')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

This will show if the API call is working.

## Expected Behavior

When working correctly, you should see:
1. **User Selection Screen** with:
   - "SoniqB Music Player" heading
   - Dropdown with users (alice, bob, charlie)
   - "Start Listening" button

## Quick Fix: Restart Everything

If nothing else works:

```bash
# Terminal 1: Stop and restart backend
cd /home/fate/prj/soniqB
# Press Ctrl+C to stop if running
./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Stop and restart frontend
cd /home/fate/prj/soniqB/frontend
# Press Ctrl+C to stop if running
npm run dev
```

Then open: http://localhost:5173 (or whatever port Vite shows)

## Check Vite Output

Look at the terminal where you ran `npm run dev`. It should show:
```
VITE v7.3.0  ready in XXX ms

➜  Local:   http://localhost:5174/
```

**Use the exact URL shown in the terminal.**

## Still Not Working?

If you still only see the gradient background, please share:
1. Browser console errors (screenshot or copy/paste)
2. Network tab showing the failed requests
3. The exact URL you're visiting

This will help diagnose the specific issue.
