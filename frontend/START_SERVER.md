# Restart Your Server

## Steps:

1. **Stop the current server**:
   - Press `Ctrl + C` in the terminal where the server is running

2. **Start the server again**:
   ```bash
   npm run dev
   ```

3. **Test the connection**:
   - Visit http://localhost:3003/api/test-env
   - You should see the environment variable status

4. **Check the terminal**:
   - Look for `[Supabase] Configuration status:` messages
   - This will show if your environment variables are loaded

5. **Try creating an activity**:
   - Go to http://localhost:3003/activities/new
   - The form should now work properly

## If you still see errors:

Make sure your `.env.local` file has the correct format:
- No spaces around the `=` sign
- No quotes around the values (unless they contain spaces)
- Each variable on its own line 