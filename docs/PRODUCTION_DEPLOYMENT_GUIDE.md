# Restaurant OS v6.0.3 - Production Deployment Guide

**Last Updated**: September 2, 2025  
**Production Readiness**: 9.5/10  
**Estimated Deployment Time**: 2-4 hours

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Hardening](#security-hardening)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Rollback Procedures](#rollback-procedures)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFlare CDN                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Load Balancer                │
│                         (AWS ALB)                           │
└─────────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
        ┌──────────────────┐      ┌──────────────────┐
        │   EC2 Instance   │      │   EC2 Instance   │
        │   Node.js App    │      │   Node.js App    │
        │    Port 3001     │      │    Port 3001     │
        └──────────────────┘      └──────────────────┘
                    │                        │
                    └────────┬───────────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis       │
                    │  (WebSocket)    │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Supabase     │
                    │   PostgreSQL    │
                    └─────────────────┘
```

## Prerequisites

### Required Services
- AWS Account with appropriate permissions
- Supabase production project
- Square production account
- OpenAI API access
- Sentry account
- CloudFlare account
- Domain name with DNS access

### Local Tools
```bash
# Install required tools
npm install -g pm2
npm install -g @aws-amplify/cli
brew install postgresql
brew install redis
brew install nginx
```

## Infrastructure Setup

### 1. AWS EC2 Instances

```bash
# Launch EC2 instances (t3.large recommended)
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.large \
  --key-name restaurant-os-prod \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --count 2 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=restaurant-os-prod}]'
```

### 2. Security Groups

```bash
# Create security group
aws ec2 create-security-group \
  --group-name restaurant-os-prod \
  --description "Restaurant OS Production Security Group"

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name restaurant-os-prod \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name restaurant-os-prod \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow Node.js app port (from ALB only)
aws ec2 authorize-security-group-ingress \
  --group-name restaurant-os-prod \
  --protocol tcp \
  --port 3001 \
  --source-group sg-alb-xxxxxxxxx
```

### 3. Load Balancer Setup

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name restaurant-os-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxxxxxxxx \
  --scheme internet-facing \
  --type application

# Create target group
aws elbv2 create-target-group \
  --name restaurant-os-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxxxxxxxx \
  --health-check-path /health \
  --health-check-interval-seconds 30
```

### 4. Auto Scaling

```bash
# Create launch template
aws ec2 create-launch-template \
  --launch-template-name restaurant-os-template \
  --launch-template-data file://launch-template.json

# Create auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name restaurant-os-asg \
  --launch-template LaunchTemplateName=restaurant-os-template \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account:targetgroup/xxx
```

## Database Configuration

### 1. Supabase Production Setup

```sql
-- Connect to Supabase production
psql postgresql://user:password@db.supabase.co:5432/postgres

-- Run optimization script
\i scripts/database-optimization.sql

-- Verify indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 2. Connection Pooling

```javascript
// supabase.config.js
export const poolConfig = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### 3. Backup Configuration

```bash
# Set up automated backups
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup_*.sql.gz s3://restaurant-os-backups/
```

## Application Deployment

### 1. Server Setup (on each EC2 instance)

```bash
# SSH into instance
ssh -i restaurant-os-prod.pem ec2-user@instance-ip

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo amazon-linux-extras install nginx1

# Clone repository
git clone https://github.com/your-org/restaurant-os.git
cd restaurant-os

# Install dependencies
npm ci --production

# Copy production environment
cp .env.production.template .env.production
# Edit .env.production with actual values
nano .env.production

# Build application
npm run build:production
```

### 2. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'restaurant-os',
    script: './server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/restaurant-os/error.log',
    out_file: '/var/log/restaurant-os/out.log',
    log_file: '/var/log/restaurant-os/combined.log',
    time: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
  }]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/conf.d/restaurant-os.conf
upstream app {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Static files
    location /assets {
        alias /var/www/restaurant-os/client/dist/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API and WebSocket
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Redis Setup (for WebSocket scaling)

```bash
# Install Redis
sudo yum install redis

# Configure Redis
sudo nano /etc/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

## Monitoring & Logging

### 1. Sentry Configuration

```javascript
// server/src/config/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
});
```

### 2. CloudWatch Setup

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 3. Application Metrics

```javascript
// Custom metrics
const metrics = {
  orderCount: new CloudWatch.Metric({
    namespace: 'RestaurantOS',
    metricName: 'OrderCount',
    unit: 'Count'
  }),
  paymentSuccess: new CloudWatch.Metric({
    namespace: 'RestaurantOS',
    metricName: 'PaymentSuccess',
    unit: 'Count'
  }),
  apiLatency: new CloudWatch.Metric({
    namespace: 'RestaurantOS',
    metricName: 'APILatency',
    unit: 'Milliseconds'
  })
};
```

## Security Hardening

### 1. SSL Certificate

```bash
# Install Certbot
sudo yum install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 0,12 * * * certbot renew --quiet
```

### 2. Firewall Rules

```bash
# Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --remove-service=ssh # Remove after setup
sudo firewall-cmd --reload
```

### 3. Security Scanning

```bash
# Run security audit
npm audit --production
npm audit fix

# Check for vulnerabilities
npx snyk test
```

## Performance Optimization

### 1. Build Optimization

```bash
# Production build with analysis
ANALYZE=true npm run build:production

# Check bundle sizes
node scripts/check-bundle-size.js
```

### 2. CDN Configuration (CloudFlare)

```bash
# CloudFlare settings
- Cache Level: Standard
- Browser Cache TTL: 1 year
- Always Use HTTPS: On
- Auto Minify: JavaScript, CSS, HTML
- Brotli: On
- HTTP/2: On
- HTTP/3 (with QUIC): On
```

### 3. Database Query Optimization

```sql
-- Monitor slow queries
SELECT query, calls, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Update statistics
ANALYZE;
```

## Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart if needed
pm2 restart restaurant-os

# Increase memory limit
pm2 set restaurant-os:max_memory_restart 2G
```

#### WebSocket Connection Issues
```javascript
// Check Redis connection
redis-cli ping

// Monitor WebSocket connections
pm2 logs restaurant-os | grep WebSocket
```

#### Database Connection Pool Exhausted
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < current_timestamp - INTERVAL '10 minutes';
```

## Rollback Procedures

### Quick Rollback (Blue-Green)

```bash
# Switch load balancer target group
aws elbv2 modify-rule \
  --rule-arn arn:aws:elasticloadbalancing:xxx \
  --actions Type=forward,TargetGroupArn=arn:aws:blue-target-group

# Verify
curl -I https://your-domain.com/health
```

### Database Rollback

```bash
# Restore from backup
gunzip < backup_20250902_120000.sql.gz | psql $DATABASE_URL

# Run rollback migration
npm run db:rollback
```

### Application Rollback

```bash
# Revert to previous version
git checkout v6.0.2
npm ci --production
npm run build:production
pm2 restart restaurant-os
```

## Post-Deployment Verification

```bash
# Health check
curl https://your-domain.com/health

# API test
curl -X POST https://your-domain.com/api/v1/auth/demo \
  -H "Content-Type: application/json"

# WebSocket test
wscat -c wss://your-domain.com/ws

# Load test
npm run test:load -- --url=https://your-domain.com
```

## Maintenance

### Daily Tasks
- Monitor error logs
- Check disk space
- Review performance metrics
- Verify backup completion

### Weekly Tasks
- Update dependencies
- Run security scans
- Review slow query logs
- Test disaster recovery

### Monthly Tasks
- Rotate secrets
- Update SSL certificates
- Capacity planning review
- Cost optimization review

## Support

### Emergency Contacts
- DevOps Team: devops@restaurant-os.com
- On-Call: +1-xxx-xxx-xxxx
- Escalation: management@restaurant-os.com

### Resources
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [API Documentation](./api/README.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Security Policies](./SECURITY.md)

---

**Next Steps**:
1. Complete deployment checklist
2. Run acceptance tests
3. Monitor for 24 hours
4. Schedule post-deployment review

**Success Metrics**:
- ✅ 99.9% uptime
- ✅ <200ms response time
- ✅ <1% error rate
- ✅ 100% payment success
- ✅ Zero security incidents