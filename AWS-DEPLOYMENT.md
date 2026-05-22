# GetNear — AWS Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           Route 53 (DNS)            │
                    │  getnear.in / admin.getnear.in      │
                    │  api.getnear.in                     │
                    └──────────┬──────────┬───────────────┘
                               │          │
              ┌────────────────┘          └────────────────┐
              ▼                                            ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│   AWS Amplify Hosting    │              │     AWS App Runner       │
│                          │              │                          │
│  • Web App (Next.js)     │              │  • Express API           │
│    → getnear.in          │              │    → api.getnear.in      │
│                          │              │  • Auto-scaling          │
│  • Admin App (Next.js)   │              │  • Health checks         │
│    → admin.getnear.in    │              │                          │
│                          │              │                          │
│  • Built-in CDN          │              └────────────┬─────────────┘
│  • Auto CI/CD from Git   │                           │
└──────────────────────────┘                           │
                                                       ▼
                                          ┌──────────────────────────┐
                                          │   External Services      │
                                          │  • Supabase (Postgres)   │
                                          │  • Firebase (Auth)       │
                                          │  • Twilio (SMS)          │
                                          │  • Sentry (Monitoring)   │
                                          └──────────────────────────┘
```

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured (`aws configure`)
- Docker installed (for API deployment)
- Your domain (getnear.in) managed in Route 53 or with DNS access

---

## Part 1: Deploy the API (AWS App Runner)

### 1.1 Push Docker image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name getnear-api --region ap-south-1

# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Build the image (run from project root)
docker build -t getnear-api -f api/Dockerfile .

# Tag and push
docker tag getnear-api:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/getnear-api:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/getnear-api:latest
```

### 1.2 Create App Runner service

**Via AWS Console:**
1. Go to AWS App Runner → Create service
2. Source: Container registry → Amazon ECR
3. Select the `getnear-api:latest` image
4. Configure:
   - Port: `4000`
   - CPU: 1 vCPU, Memory: 2 GB (start small, scale later)
   - Health check path: `/health`
   - Auto-scaling: Min 1, Max 5 instances
5. Add environment variables (see Section 4)
6. Create & deploy

**Via CLI:**
```bash
aws apprunner create-service \
  --service-name getnear-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/getnear-api:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "4000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "4000"
        }
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }'
```

### 1.3 Custom domain for API

```bash
aws apprunner associate-custom-domain \
  --service-arn <SERVICE_ARN> \
  --domain-name api.getnear.in
```

Follow the CNAME validation steps provided by App Runner.

---

## Part 2: Deploy Web App (AWS Amplify)

### 2.1 Connect repository

1. Go to AWS Amplify → Create new app → Host web app
2. Connect your Git provider (GitHub/GitLab/CodeCommit)
3. Select the repository and branch (`main`)
4. Amplify will detect the `amplify.yml` in `apps/web/`

### 2.2 Configure build settings

If Amplify doesn't auto-detect, set:
- **App root:** `/` (monorepo root)
- **Build command:** `npm run build --workspace=@getnear/web`
- **Output directory:** `apps/web/.next`
- **Framework:** Next.js - SSR

### 2.3 Environment variables

In Amplify Console → App settings → Environment variables, add:
```
NEXT_PUBLIC_APP_URL=https://getnear.in
NEXT_PUBLIC_ADMIN_URL=https://admin.getnear.in
NEXT_PUBLIC_API_URL=https://api.getnear.in/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
```

### 2.4 Custom domain

1. Amplify Console → Domain management → Add domain
2. Enter `getnear.in`
3. Configure subdomains:
   - `getnear.in` → main branch
   - `www.getnear.in` → redirect to `getnear.in`

---

## Part 3: Deploy Admin App (AWS Amplify)

Repeat the same process as Part 2, but:
- Create a **separate** Amplify app
- Build command: `npm run build --workspace=@getnear/admin`
- Output directory: `apps/admin/.next`
- Custom domain: `admin.getnear.in`

Environment variables:
```
NEXT_PUBLIC_APP_URL=https://getnear.in
NEXT_PUBLIC_ADMIN_URL=https://admin.getnear.in
NEXT_PUBLIC_API_URL=https://api.getnear.in/api/v1
```

---

## Part 4: Environment Variables & Secrets

### Store secrets in AWS Systems Manager Parameter Store

```bash
# Supabase
aws ssm put-parameter --name "/getnear/prod/SUPABASE_URL" --value "<value>" --type SecureString
aws ssm put-parameter --name "/getnear/prod/SUPABASE_ANON_KEY" --value "<value>" --type SecureString
aws ssm put-parameter --name "/getnear/prod/SUPABASE_SERVICE_ROLE_KEY" --value "<value>" --type SecureString

# Twilio
aws ssm put-parameter --name "/getnear/prod/TWILIO_ACCOUNT_SID" --value "<value>" --type SecureString
aws ssm put-parameter --name "/getnear/prod/TWILIO_AUTH_TOKEN" --value "<value>" --type SecureString
aws ssm put-parameter --name "/getnear/prod/TWILIO_VERIFY_SID" --value "<value>" --type SecureString

# Google
aws ssm put-parameter --name "/getnear/prod/GOOGLE_CLIENT_ID" --value "<value>" --type SecureString
aws ssm put-parameter --name "/getnear/prod/GOOGLE_CLIENT_SECRET" --value "<value>" --type SecureString

# Sentry
aws ssm put-parameter --name "/getnear/prod/SENTRY_DSN" --value "<value>" --type SecureString

# Resend
aws ssm put-parameter --name "/getnear/prod/RESEND_API_KEY" --value "<value>" --type SecureString
```

For App Runner, reference these in the service configuration or pass them directly as environment variables in the console.

---

## Part 5: CI/CD Pipeline (Optional — GitHub Actions)

If you want automated deployments beyond Amplify's built-in CI/CD:

### API deployment workflow

Create `.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'api/**'
      - 'packages/**'

env:
  AWS_REGION: ap-south-1
  ECR_REPOSITORY: getnear-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f api/Dockerfile .
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:latest -f api/Dockerfile .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
```

App Runner will auto-deploy when a new image is pushed to ECR (if auto-deployments are enabled).

---

## Part 6: DNS Setup (Route 53)

If your domain is in Route 53:

| Record | Type | Value |
|--------|------|-------|
| `getnear.in` | CNAME | Amplify-provided domain |
| `admin.getnear.in` | CNAME | Amplify-provided domain |
| `api.getnear.in` | CNAME | App Runner-provided domain |

Both Amplify and App Runner provide free SSL certificates automatically.

---

## Estimated Monthly Cost (Low Traffic)

| Service | Estimated Cost |
|---------|---------------|
| App Runner (1 instance, 1 vCPU / 2GB) | ~$30/month |
| Amplify Hosting (2 apps, SSR) | ~$15-25/month |
| Route 53 | ~$1/month |
| ECR (image storage) | ~$1/month |
| **Total** | **~$47-57/month** |

Scales automatically with traffic. You only pay for what you use.

---

## Quick Start Checklist

- [ ] Install AWS CLI and run `aws configure`
- [ ] Install Docker
- [ ] Create ECR repository
- [ ] Build and push API Docker image
- [ ] Create App Runner service with env vars
- [ ] Create Amplify app for Web (connect Git repo)
- [ ] Create Amplify app for Admin (connect Git repo)
- [ ] Configure custom domains in Route 53
- [ ] Update CORS origins in `api/src/index.ts` if using different domains
- [ ] Store secrets in Parameter Store
- [ ] Test health check: `curl https://api.getnear.in/health`
