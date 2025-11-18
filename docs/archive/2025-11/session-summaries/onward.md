# Onward: The Path to Production

**Created**: November 13, 2025
**Purpose**: Complete roadmap of what needs to be done, verified, and prioritized
**Current Status**: 60% Functional - Auth works, orders don't

---

## 🎯 Current State Summary

### ✅ What's Working
- Authentication with JWT scopes
- Demo users can log in
- Backend API responding
- Menu data loading
- Restaurant slug resolution
- Multi-tenant isolation

### ❌ What's Broken
- Order submission (400 Bad Request)
- Payment processing (untested)
- Voice ordering (untested)
- No monitoring or alerts
- No error tracking

### ⚠️ What's Unknown
- Exact order payload requirements
- Square payment integration status
- OpenAI API functionality
- WebSocket real-time features
- Kitchen display system
- Printer integration

---

## 🚨 PRIORITY 0: Critical Blockers (~~Fix TODAY~~ ✅ FIXED!)

### 1. Fix Order Submission ✅ SOLVED
**Status**: ~~Orders return 400 Bad Request~~ **NOW WORKING!**
**Solution Found**: OrderItem requires BOTH `id` AND `menu_item_id` fields

**Root Cause**: Per ADR-003, both fields are REQUIRED:
- `id`: Item UUID for the order line item
- `menu_item_id`: Reference to the menu item

**Working Payload**:
```javascript
// ✅ This works!
{
  "items": [{
    "id": "item-1",          // REQUIRED: Item UUID
    "menu_item_id": "menu-1", // REQUIRED: Menu item reference
    "name": "Test Item",
    "price": 10.00,
    "quantity": 1
  }],
  "type": "dine_in"  // Optional: order type
}
```

**Frontend Fix Required**:
```bash
□ Update cart items to include both id and menu_item_id
□ Generate unique UUID for each cart item
□ Keep menu_item_id reference from menu data
□ Test complete order flow
```

### 2. Verify Database Schema Alignment ❌
**Status**: Unknown if Prisma schema matches Supabase
**Impact**: Could cause runtime failures

```bash
□ Run: npx prisma db pull
□ Compare with existing schema
□ Run any pending migrations
□ Verify role_scopes table has data
□ Check user_restaurants entries
```

---

## 🔴 PRIORITY 1: Core Functionality (This Week)

### 1. Payment Processing Verification
**Status**: Completely untested
**Risk**: High - revenue impact

```bash
# Square Integration Checklist:
□ Verify SQUARE_APP_ID matches between frontend/backend
□ Test sandbox payment flow:
  □ Payment form loads
  □ Card tokenization works
  □ Payment processes
  □ Order completes
□ Verify webhook handling
□ Test refund flow
□ Document payment error handling
```

**Required Environment Variables**:
```bash
# Verify these match between Render and Vercel:
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_APP_ID=...
```

### 2. Order Flow End-to-End
**Status**: Partially broken
**Dependencies**: Fix order validation first

```bash
□ Customer can browse menu
□ Add items to cart
□ Apply modifiers
□ Calculate tax correctly
□ Submit order
□ Receive order confirmation
□ Order appears in kitchen display
□ Order status updates work
□ Order completion flow
```

### 3. Role-Based Access Testing
**Status**: Auth works but permissions untested

```bash
# Test each role:
□ Server: Can create/read orders, process payments
□ Kitchen: Can view/update order status only
□ Manager: Can access reports, modify menu
□ Expo: Can manage order flow
□ Cashier: Can process payments, handle refunds
```

---

## 🟡 PRIORITY 2: Production Requirements (Next Week)

### 1. Environment Variable Cleanup
```bash
□ Remove \n characters from Vercel env files
□ Verify all 23 Render variables set correctly
□ Verify all 14 Vercel variables set correctly
□ Rotate compromised secrets:
  □ OPENAI_API_KEY
  □ PIN_PEPPER
  □ DEVICE_FINGERPRINT_SALT
  □ KIOSK_JWT_SECRET
  □ STATION_TOKEN_SECRET
```

### 2. Error Handling & Monitoring
```bash
□ Set up Sentry or similar:
  □ Frontend error tracking
  □ Backend error tracking
  □ Source maps configured
□ Configure health check monitoring:
  □ Uptime monitoring (UptimeRobot, Pingdom)
  □ Response time alerts
  □ Error rate alerts
□ Set up logging aggregation:
  □ CloudWatch, LogDNA, or Datadog
  □ Structured logging
  □ Log retention policy
```

### 3. Database Optimization
```bash
□ Verify connection pooling (port 6543)
□ Add missing indexes:
  □ orders(restaurant_id, created_at)
  □ orders(status, restaurant_id)
  □ menu_items(restaurant_id, available)
□ Set up automated backups
□ Configure point-in-time recovery
□ Test restore procedure
```

### 4. Security Hardening
```bash
□ Enable STRICT_AUTH=true in production
□ Verify CORS configuration
□ Add rate limiting to all endpoints
□ Implement request validation
□ Add SQL injection protection
□ Enable security headers
□ Set up WAF if needed
```

---

## 🟠 PRIORITY 3: Feature Completion (Weeks 3-4)

### 1. Voice Ordering System
**Status**: Completely untested
**Complexity**: High

```bash
□ Verify OpenAI API key valid
□ Test WebRTC connection
□ Voice input capture
□ Speech-to-text accuracy
□ Order intent recognition
□ Modifier handling
□ Confirmation flow
□ Error handling
□ Fallback to manual entry
```

### 2. Kitchen Display System (KDS)
```bash
□ Real-time order updates
□ Order queue management
□ Prep time tracking
□ Order bumping
□ Station routing
□ Printer integration
```

### 3. Reporting & Analytics
```bash
□ Daily sales reports
□ Product mix analysis
□ Peak hour analysis
□ Staff performance
□ Payment method breakdown
□ Tax reports
```

### 4. Multi-Location Support
```bash
□ Restaurant switching
□ Location-specific menus
□ Centralized reporting
□ Cross-location inventory
```

---

## 🟢 PRIORITY 4: Performance & Scale (Month 2)

### 1. Performance Optimization
```bash
□ Implement Redis caching:
  □ Menu data
  □ Restaurant config
  □ Session data
□ Optimize bundle size:
  □ Code splitting
  □ Lazy loading
  □ Tree shaking
□ Database query optimization:
  □ Query analysis
  □ Slow query log
  □ Connection pool tuning
```

### 2. Load Testing
```bash
□ Create load test scenarios:
  □ 100 concurrent users
  □ 1000 orders/hour
  □ Payment processing load
□ Identify bottlenecks
□ Set up auto-scaling rules
□ Verify scale limits
```

### 3. Disaster Recovery
```bash
□ Document recovery procedures
□ Set up automated backups
□ Test restore process
□ Create runbooks for common issues
□ Set up staging environment
```

---

## 📋 Verification Checklist

### System Health Verification
```bash
# Run these commands to verify current state:

# 1. Backend Health
curl https://july25.onrender.com/api/v1/health

# 2. Authentication
curl -X POST https://july25.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"server@restaurant.com","password":"Demo123!","restaurantId":"11111111-1111-1111-1111-111111111111"}'

# 3. Menu Loading
curl https://july25.onrender.com/api/v1/menu \
  -H "x-restaurant-id: grow"

# 4. Order Submission (Currently Broken)
# Need to fix validation first

# 5. Database Connectivity
# Check Render logs for connection pool status
```

### Frontend Verification
```bash
□ Login page loads
□ Demo credentials work
□ Navigation works
□ Cart functionality
□ Payment form appears
□ Responsive design works
□ No console errors
```

### Integration Verification
```bash
□ Frontend → Backend API calls work
□ Backend → Database queries work
□ Backend → Square API (needs testing)
□ Backend → OpenAI API (needs testing)
□ WebSocket connections (needs testing)
```

---

## 📅 Suggested Timeline

### Week 1: Stop the Bleeding
- **Mon-Tue**: Fix order submission
- **Wed-Thu**: Verify payment processing
- **Fri**: End-to-end testing

### Week 2: Production Prep
- **Mon-Tue**: Set up monitoring & alerts
- **Wed-Thu**: Security hardening
- **Fri**: Load testing

### Week 3-4: Feature Completion
- Voice ordering
- Kitchen display
- Reporting

### Month 2: Scale & Optimize
- Performance tuning
- Disaster recovery
- Multi-location support

---

## 🚦 Go/No-Go Criteria for Production

### Minimum Viable Production (MVP)
✅ Required:
- [ ] Orders can be placed and completed
- [ ] Payments process successfully
- [ ] All user roles can log in
- [ ] Basic error tracking configured
- [ ] Health monitoring active
- [ ] Database backups configured
- [ ] Security headers enabled
- [ ] HTTPS enforced

⚠️ Nice to Have:
- [ ] Voice ordering
- [ ] Advanced reporting
- [ ] Multi-location support

❌ Can Wait:
- [ ] Advanced analytics
- [ ] Inventory management
- [ ] Customer loyalty program

---

## 🎬 Next Immediate Actions

1. **Right Now**: Test minimal order payload to understand validation
2. **Today**: Document exact order requirements
3. **Tomorrow**: Fix order submission
4. **This Week**: Complete payment integration
5. **Next Week**: Production hardening

---

## 📊 Success Metrics

Track these to measure progress:
- **Order Success Rate**: Target >95%
- **Payment Success Rate**: Target >98%
- **API Response Time**: Target <200ms p50, <1s p99
- **Error Rate**: Target <1%
- **Uptime**: Target 99.9%
- **Customer Checkout Time**: Target <2 minutes

---

## 🆘 Known Unknowns

Things we need to investigate:
1. Why exactly are orders failing validation?
2. Is the Square webhook configured?
3. Are WebSocket connections working?
4. Is the OpenAI API key valid and working?
5. What's the status of printer integration?
6. How does the kitchen display update?
7. Is there a staff scheduling system?
8. How does inventory tracking work?
9. What reports do managers actually need?
10. Is there a customer feedback system?

---

## 📝 Documentation Needed

Critical documentation still missing:
- [ ] API endpoint documentation
- [ ] Order payload schema
- [ ] Payment flow diagram
- [ ] Database schema documentation
- [ ] Deployment runbook
- [ ] Incident response procedures
- [ ] User training guides
- [ ] Admin configuration guide

---

## 💪 The Bottom Line

**We're 3-4 weeks from production-ready** if we focus and execute:
- Week 1: Core functionality (orders + payments)
- Week 2: Production hardening
- Week 3-4: Testing and polish

**The hard parts are done** (auth, deployment, multi-tenancy). What remains is mostly testing, validation, and hardening.

**Critical path**: Fix orders → Test payments → Add monitoring → Launch

**Remember**: Perfect is the enemy of done. Launch with MVP, iterate based on real usage.

---

**Last Updated**: November 13, 2025
**Next Review**: November 20, 2025
**Owner**: Development Team