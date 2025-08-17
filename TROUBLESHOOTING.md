# Troubleshooting Guide

This guide covers common issues you might encounter when setting up, developing, or deploying the crypto portfolio backend.

## Table of Contents

- [Environment Setup Issues](#environment-setup-issues)
- [Database Connection Problems](#database-connection-problems)
- [Development Server Issues](#development-server-issues)
- [Build and Type Errors](#build-and-type-errors)
- [Deployment Issues](#deployment-issues)
- [API and Runtime Errors](#api-and-runtime-errors)
- [Performance Issues](#performance-issues)
- [Testing Problems](#testing-problems)

## Environment Setup Issues

### Missing Environment Variables

**Problem**: `Missing required environment variable` error

**Solutions**:
```bash
# Check if .env file exists
ls -la .env

# Verify environment variables are loaded
node -e "console.log(process.env.SUPABASE_URL)"

# Copy from example if missing
cp .env.example .env

# Run setup script for interactive configuration
node scripts/setup.js
```

### Invalid Supabase URL Format

**Problem**: `Invalid SUPABASE_URL format` error

**Solution**: Ensure your Supabase URL follows the correct format:
```env
# Correct format
SUPABASE_URL=https://your-project-id.supabase.co

# Incorrect formats
SUPABASE_URL=your-project-id.supabase.co  # Missing https://
SUPABASE_URL=https://supabase.co/project/your-id  # Wrong structure
```

### Service Role Key Issues

**Problem**: Database operations fail with permission errors

**Solutions**:
1. **Verify you're using the service role key, not the anon key**:
   - Service role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (longer)
   - Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (shorter)

2. **Find the correct key in Supabase dashboard**:
   - Go to Settings → API
   - Copy the `service_role` key (not `anon` key)

3. **Check key permissions**:
   ```bash
   # Test database connection
   npm run migrate -- --test
   ```

## Database Connection Problems

### Connection Timeout

**Problem**: Database operations timeout or fail to connect

**Solutions**:
```bash
# Test connection manually
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('information_schema.tables').select('*').limit(1).then(console.log);
"

# Check Supabase project status
# Visit your Supabase dashboard to ensure project is active

# Verify network connectivity
ping your-project-id.supabase.co
```

### Migration Failures

**Problem**: Database migrations fail to run

**Solutions**:
```bash
# Run migrations with verbose output
npm run migrate

# Run individual migration files
node scripts/run-migrations.js --verify

# Manual migration via Supabase dashboard
# 1. Go to SQL Editor in Supabase dashboard
# 2. Copy contents of scripts/migrate.sql
# 3. Run the SQL directly
```

### Table Already Exists Errors

**Problem**: `relation "table_name" already exists` during migration

**Solution**: This is usually harmless. The migrations use `CREATE TABLE IF NOT EXISTS` to handle this gracefully.

```bash
# Verify existing tables
npm run migrate -- --verify

# Check table structure in Supabase dashboard
# Go to Table Editor to see existing tables
```

## Development Server Issues

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000
# or on Windows
netstat -ano | findstr :3000

# Kill the process
kill -9 <PID>
# or on Windows
taskkill /PID <PID> /F

# Use different port
PORT=3001 npm run dev
```

### Module Not Found Errors

**Problem**: `Cannot find module` errors during development

**Solutions**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force

# Check for TypeScript path mapping issues
npm run type-check
```

### Hot Reload Not Working

**Problem**: Changes not reflected in development server

**Solutions**:
```bash
# Restart development server
# Ctrl+C to stop, then npm run dev

# Use Vercel dev for better hot reload
npm run vercel:dev

# Check file watchers (Linux/macOS)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Build and Type Errors

### TypeScript Compilation Errors

**Problem**: Type errors during build or development

**Solutions**:
```bash
# Run type checking
npm run type-check

# Check specific file
npx tsc --noEmit src/path/to/file.ts

# Update TypeScript and type definitions
npm update typescript @types/node

# Check tsconfig.json configuration
cat tsconfig.json
```

### ESLint Errors

**Problem**: Linting errors preventing build

**Solutions**:
```bash
# Run linting
npm run lint

# Auto-fix issues
npm run lint:fix

# Check ESLint configuration
cat .eslintrc.json

# Disable specific rules temporarily
// eslint-disable-next-line @typescript-eslint/no-unused-vars
```

### Import/Export Issues

**Problem**: Module import/export errors

**Common fixes**:
```typescript
// Use proper TypeScript imports
import { createClient } from '@supabase/supabase-js';

// Check file extensions in imports
import './file.js';  // Not needed in TypeScript

// Verify module exists in package.json
npm list @supabase/supabase-js
```

## Deployment Issues

### Vercel CLI Not Found

**Problem**: `vercel: command not found`

**Solutions**:
```bash
# Install Vercel CLI globally
npm install -g vercel

# Or use npx
npx vercel

# Check installation
which vercel
vercel --version
```

### Environment Variables Not Set in Vercel

**Problem**: API returns environment variable errors in production

**Solutions**:
```bash
# List current environment variables
vercel env ls

# Add missing variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ORIGIN

# Pull environment variables locally
vercel env pull .env.local
```

### Function Timeout Errors

**Problem**: `Function execution timed out` in Vercel

**Solutions**:
1. **Check vercel.json configuration**:
   ```json
   {
     "functions": {
       "api/stream.ts": { "maxDuration": 300 },
       "api/control.ts": { "maxDuration": 30 }
     }
   }
   ```

2. **Optimize database queries**:
   ```typescript
   // Use indexes and limit results
   .select('*')
   .order('timestamp', { ascending: false })
   .limit(100)
   ```

3. **Consider upgrading Vercel plan** for longer timeouts

### CORS Errors in Production

**Problem**: `Access to fetch blocked by CORS policy`

**Solutions**:
```bash
# Verify ORIGIN environment variable
vercel env ls

# Check frontend URL matches exactly
# https://your-frontend.vercel.app (no trailing slash)

# Update CORS configuration in vercel.json
```

## API and Runtime Errors

### 500 Internal Server Error

**Problem**: API endpoints return 500 errors

**Solutions**:
```bash
# Check Vercel function logs
vercel logs

# Check for uncaught exceptions
vercel logs --follow

# Test locally first
npm run vercel:dev
curl http://localhost:3000/api/health
```

### Database Query Errors

**Problem**: SQL errors or query failures

**Solutions**:
```typescript
// Add error handling
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
} catch (err) {
  console.error('Database error:', err);
}

// Check table structure
// Verify column names and types in Supabase dashboard
```

### Cache Issues

**Problem**: Stale data or cache not updating

**Solutions**:
```typescript
// Clear cache manually
cache.clear();

// Check cache invalidation logic
// Ensure cache is cleared on updates

// Verify cache TTL settings
```

## Performance Issues

### Slow API Response Times

**Problem**: API endpoints taking too long to respond

**Solutions**:
1. **Check database performance**:
   ```sql
   -- Add indexes for common queries
   CREATE INDEX IF NOT EXISTS idx_ticks_timestamp ON ticks(timestamp);
   ```

2. **Implement caching**:
   ```typescript
   // Use in-memory cache for frequently accessed data
   const cached = cache.get('latest');
   if (cached) return cached;
   ```

3. **Optimize queries**:
   ```typescript
   // Limit results and use specific columns
   .select('timestamp, total_value')
   .limit(1000)
   .order('timestamp', { ascending: false })
   ```

### Memory Issues

**Problem**: High memory usage or out-of-memory errors

**Solutions**:
```bash
# Monitor memory usage
node --max-old-space-size=512 src/index.js

# Check for memory leaks
# Use Node.js profiling tools

# Optimize data structures
# Avoid keeping large objects in memory
```

### Cold Start Issues

**Problem**: First request after inactivity is slow

**Solutions**:
1. **Implement keepalive**:
   ```bash
   # Use external monitoring service
   # Ping health endpoint every 5 minutes
   ```

2. **Optimize bundle size**:
   ```typescript
   // Use dynamic imports for large dependencies
   const { heavyLibrary } = await import('heavy-library');
   ```

3. **Consider Vercel Pro** for reduced cold starts

## Testing Problems

### Tests Failing Locally

**Problem**: Test suite fails during development

**Solutions**:
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- src/api/endpoints.test.ts

# Check test environment
# Ensure test database is separate from development
```

### Database Tests Failing

**Problem**: Database-related tests fail

**Solutions**:
```bash
# Ensure test database is set up
TEST_SUPABASE_URL=... npm run test

# Use test-specific environment
cp .env .env.test
# Edit .env.test with test database credentials

# Clean test data between runs
# Implement proper test cleanup
```

### Timeout Issues in Tests

**Problem**: Tests timeout or run too slowly

**Solutions**:
```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // test code
}, { timeout: 10000 });

// Mock external dependencies
vi.mock('@supabase/supabase-js');

// Use test doubles for database operations
```

## Getting Help

If you're still experiencing issues after trying these solutions:

1. **Check the logs**:
   ```bash
   # Local development
   npm run dev
   
   # Vercel deployment
   vercel logs --follow
   ```

2. **Enable debug mode**:
   ```bash
   DEBUG=* npm run dev
   ```

3. **Create a minimal reproduction**:
   - Isolate the issue to the smallest possible code
   - Include environment details
   - Share error messages and logs

4. **Check project documentation**:
   - [README.md](./README.md) - Main documentation
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
   - [API_IMPLEMENTATION_SUMMARY.md](./API_IMPLEMENTATION_SUMMARY.md) - API details

5. **Community resources**:
   - Supabase documentation and community
   - Vercel documentation and support
   - TypeScript and Node.js communities

## Common Error Messages

### `ENOTFOUND` or DNS errors
- Check internet connection
- Verify Supabase URL is correct
- Try different DNS servers

### `ECONNREFUSED`
- Service is not running
- Port is blocked by firewall
- Wrong host/port configuration

### `ETIMEDOUT`
- Network connectivity issues
- Service is overloaded
- Increase timeout values

### `EACCES` or permission errors
- File permissions issues
- Service role key problems
- Database access restrictions

### `MODULE_NOT_FOUND`
- Missing dependencies
- Incorrect import paths
- Node.js version compatibility

Remember: Most issues can be resolved by carefully reading error messages and checking the basics (environment variables, network connectivity, permissions).