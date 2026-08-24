# Troubleshooting: Webpack Cache Error

## The Error
```
[webpack.cache.PackFileCacheStrategy] Restoring pack from 
D:\projects\dsa-tutor\.next\cache\webpack\server-development.pack.gz 
failed: TypeError: Cannot read properties of undefined (reading 'hasStartTim
```

## What Happened
The Next.js webpack cache became corrupted. This is common when:
- Adding new files/components to the project
- Changing dependencies
- Switching Node versions
- Interrupted builds

## Solution: Clear Cache and Rebuild

### Quick Fix (Already Done)
```bash
# Remove corrupted cache
rm -rf .next
rm -rf node_modules/.cache

# Then run dev again
npm run dev
```

### On Windows PowerShell
```powershell
# Commands already executed:
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Then:
npm run dev
```

## Verification Steps

### 1. Verify Cache Cleared
```bash
# Check .next doesn't exist
ls -la .next  # Should not exist

# Check build starts fresh
npm run dev  # Should rebuild from scratch
```

### 2. What to Expect
```
Compiling /cheat-sheet...
Compiled /cheat-sheet in 1234ms (1234 modules)
```

### 3. Check in Browser
- Navigate to `http://localhost:3000`
- Open DevTools (F12)
- Check Console tab for no red errors
- Click "View Cheat Sheet" button
- Should load `/cheat-sheet` page with viewer

## Prevention

### After Code Changes
- If you see cache errors, clear .next immediately
- Don't try to rebuild multiple times
- One clean cache clear usually fixes it

### Before Production Build
```bash
# Clean build for production
rm -rf .next
npm run build
```

### Git Ignore (Already Set)
`.next/` and `node_modules/` are in `.gitignore` - don't commit cache

## Rebuilding After Cache Clear

```bash
# 1. Clear the cache
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules\.cache" -Recurse -Force

# 2. Reinstall dependencies (optional but recommended)
npm install

# 3. Run dev server
npm run dev

# 4. Verify compilation
# Wait for: "ready - started server on 0.0.0.0:3000"
```

## If Problem Persists

### Option 1: Deep Clean
```bash
# Remove everything
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules\.cache" -Recurse -Force
Remove-Item -Path "node_modules" -Recurse -Force

# Reinstall
npm install

# Build
npm run build

# Dev
npm run dev
```

### Option 2: Clear Browser Cache
```bash
# Browser cache can also cause issues
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Edge: Ctrl+Shift+Delete
# Safari: Cmd+Shift+Delete

# Or in DevTools:
# F12 → Application → Clear storage → Clear all
```

### Option 3: Check Node Version
```bash
# Verify Node version
node --version  # Should be 18+
npm --version   # Should be 9+

# If old version, consider upgrading
# Download from nodejs.org
```

## Expected Build Output

```
✓ Compiled client successfully
ready - started server on 0.0.0.0:3000, url: http://localhost:3000

GET /cheat-sheet 200 in 250ms
```

## Files That Shouldn't Be Committed

Add to `.gitignore` (usually already there):
```
# .gitignore
.next/
.env.local
.env.development.local
.env.test.local
.env.production.local
node_modules/
.cache/
```

## Verification Checklist

After cache clear and rebuild:
- [ ] No TypeScript errors in build output
- [ ] Dev server starts successfully
- [ ] Home page loads (`http://localhost:3000`)
- [ ] Cheat sheet link visible on home page
- [ ] Can navigate to `/cheat-sheet`
- [ ] Viewer displays problems
- [ ] Category filter works
- [ ] Click problem shows details
- [ ] Switch tabs in viewer
- [ ] No red console errors
- [ ] Build completes: "ready"

## Success Indicators

✅ You're good when:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

And browser shows:
- Home page renders without errors
- Cheat sheet link is clickable
- Cheat sheet page loads with viewer
- All interactive features work

## Next Steps

Once running successfully:
1. Test the cheat sheet functionality
2. Browse different problem categories
3. Click problems to see details
4. View code templates
5. Check reference tab

## Related Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Check for lint errors
npm run lint

# Type check without building
npx tsc --noEmit

# Clean install (nuclear option)
npm ci  # Uses package-lock.json for exact versions
```

## When to Clear Cache

Clear `.next/` after:
- ✓ Adding new files or components
- ✓ Changing environment variables
- ✓ Upgrading Next.js/dependencies
- ✓ Seeing mysterious build errors
- ✓ Cache error messages
- ✓ After git merge/pull with changes

Don't need to clear after:
- ✗ Just changing content in files
- ✗ CSS/styling changes
- ✗ Simple edits to existing code

## Support

If issue persists after cache clear:
1. Check Node version is 18+
2. Verify npm install completed
3. Try clean install: `npm ci`
4. Check TypeScript: `npx tsc --noEmit`
5. Review CHEAT_SHEET_VERIFICATION.md

---

**Summary**: Webpack cache errors are solved by deleting `.next/` and rebuilding. Already done! Just run `npm run dev` to restart the development server.
