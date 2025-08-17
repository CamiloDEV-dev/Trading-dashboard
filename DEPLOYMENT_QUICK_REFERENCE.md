# Deployment Quick Reference

## 🚀 Quick Commands

```bash
# Preview deployment
npm run deploy:preview

# Production deployment  
npm run deploy

# Full deployment with checks (recommended)
npm run deploy:script:prod
```

## 🔧 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
ORIGIN=https://your-frontend.vercel.app
TIMEZONE=UTC
```

## 📋 Pre-deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables configured in Vercel
- [ ] Supabase database migrations applied
- [ ] Git changes committed

## 🏥 Health Check

```bash
# After deployment
npm run health-check https://your-app.vercel.app
```

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `ORIGIN` environment variable |
| Database connection failed | Verify Supabase credentials |
| Function timeout | Check `vercel.json` timeout settings |
| Cold start issues | Consider Vercel Pro plan |

## 📊 Monitoring

- **Vercel Dashboard**: Monitor function executions and errors
- **Health Endpoint**: `GET /api/health` for system status
- **Logs**: `vercel logs --follow` for real-time monitoring

## 🔄 Rollback

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```