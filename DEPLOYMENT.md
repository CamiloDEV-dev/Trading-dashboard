# Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the crypto portfolio backend to Vercel with Supabase integration.

## Prerequisites

- Node.js 18+ installed locally
- Vercel CLI installed (`npm i -g vercel`)
- Supabase project created
- Git repository connected to Vercel

## Environment Variables

### Required Environment Variables

The following environment variables must be configured in Vercel:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `ORIGIN` | Allowed CORS origin for your frontend | `https://your-frontend.vercel.app` |
| `TIMEZONE` | Timezone for daily rotation (optional) | `UTC` |

### Setting Environment Variables

#### Via Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable for Production, Preview, and Development environments

#### Via Vercel CLI
```bash
# Add environment variables
npm run env:add SUPABASE_URL
npm run env:add SUPABASE_SERVICE_ROLE_KEY
npm run env:add ORIGIN
npm run env:add TIMEZONE

# Pull environment variables to local
npm run env:pull
```

## Deployment Steps

### 1. Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd crypto-portfolio-backend

# Install dependencies
npm install

# Install Vercel CLI if not already installed
npm i -g vercel
```

### 2. Configure Supabase

Before deploying, ensure your Supabase database is set up:

```bash
# Run database migrations
npm run migrate
```

Make sure the following tables exist:
- `settings`
- `ticks`
- `aggregates`
- `user_actions`

### 3. Local Development

```bash
# Start local development server
npm run vercel:dev

# Or use the regular dev command
npm run dev
```

### 4. Deploy to Vercel

#### First-time Deployment
```bash
# Login to Vercel
vercel login

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy
```

#### Subsequent Deployments
```bash
# Deploy preview (automatic on PR)
git push origin feature-branch

# Deploy to production
git push origin main
```

## Vercel Configuration

### Function Timeouts

The `vercel.json` configuration sets appropriate timeouts for each endpoint:

- **Stream endpoint**: 300 seconds (5 minutes) for long-running SSE connections
- **Aggregation/Rotation jobs**: 60 seconds for background processing
- **Control endpoints**: 30 seconds for user actions
- **Data endpoints**: 10-30 seconds for API responses

### CORS Configuration

CORS is configured to:
- Allow requests from the `ORIGIN` environment variable
- Support GET, POST, and OPTIONS methods
- Include necessary headers for API communication
- Set appropriate cache headers for streaming endpoints

### Routing

All API endpoints are automatically routed under `/api/*` with proper headers and timeouts applied.

## Monitoring and Health Checks

### Health Endpoint

Monitor deployment health using:
```
GET /api/health
```

Response includes:
- Current run ID
- System uptime
- Simulation status
- Database connection status

### Logs

View deployment logs:
```bash
# View function logs
vercel logs

# View real-time logs
vercel logs --follow
```

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Set
**Error**: `Missing required environment variable`
**Solution**: Ensure all required environment variables are set in Vercel dashboard

#### 2. Database Connection Failed
**Error**: `Database connection error`
**Solution**: 
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project status
- Ensure service role key has proper permissions

#### 3. CORS Errors
**Error**: `Access to fetch blocked by CORS policy`
**Solution**:
- Verify `ORIGIN` environment variable matches your frontend domain
- Check that frontend is making requests to correct API URL

#### 4. Function Timeout
**Error**: `Function execution timed out`
**Solution**:
- Check function timeout configuration in `vercel.json`
- Optimize database queries for better performance
- Consider breaking down long-running operations

#### 5. Cold Start Issues
**Error**: Slow initial response times
**Solution**:
- Implement cache warming strategies
- Use Vercel Pro for reduced cold starts
- Consider keeping functions warm with periodic health checks

### Debug Commands

```bash
# Check deployment status
vercel ls

# View project info
vercel inspect

# Check environment variables
vercel env ls

# View build logs
vercel logs --since=1h
```

## Performance Optimization

### Database Optimization
- Use connection pooling in Supabase
- Implement proper indexing on timestamp columns
- Batch database writes for better performance

### Caching Strategy
- Leverage in-memory caching for latest values
- Set appropriate cache headers
- Use Vercel Edge Cache for static responses

### Function Optimization
- Minimize cold start time by reducing bundle size
- Use appropriate timeout values
- Implement graceful error handling

## Security Considerations

### API Security
- Service role key is only used on backend
- CORS properly configured for allowed origins
- Input validation on all POST endpoints
- Rate limiting implemented where necessary

### Environment Security
- Never commit environment variables to git
- Use Vercel's encrypted environment variable storage
- Rotate keys regularly
- Monitor access logs

## Scaling Considerations

### Vercel Limits
- Function execution time: 10s (Hobby), 60s (Pro), 900s (Enterprise)
- Memory: 1024MB (Hobby), 3008MB (Pro/Enterprise)
- Bandwidth: 100GB (Hobby), 1TB (Pro)

### Database Scaling
- Monitor Supabase usage and upgrade plan as needed
- Implement connection pooling for high traffic
- Consider read replicas for heavy read workloads

## Backup and Recovery

### Database Backups
- Supabase provides automatic daily backups
- Consider implementing custom backup scripts for critical data
- Test recovery procedures regularly

### Code Backups
- Use Git for version control
- Tag releases for easy rollback
- Maintain deployment history in Vercel

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Repository Issues](link-to-your-repo/issues)

For deployment issues, check the troubleshooting section above or create an issue in the project repository.