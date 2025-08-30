# Authentication & User Management Roadmap

## Executive Summary
This document outlines the comprehensive plan to transition Restaurant OS from demo mode to a production-ready, role-based access control system supporting 10+ distinct user types across multiple access methods.

**Timeline:** 8-10 weeks  
**Priority:** High  
**Risk Level:** Medium (must maintain backward compatibility)  
**Breaking Changes:** None (graceful migration)

---

## Current State Assessment

### What We Have
- ✅ Basic RoleContext (non-enforcing)
- ✅ Demo authentication via JWT tokens
- ✅ Restaurant context isolation
- ✅ Supabase infrastructure (unused for auth)
- ✅ WebSocket connections for real-time updates
- ✅ Audit-ready logging infrastructure

### What We Need
- ❌ User database schema
- ❌ Staff management system
- ❌ Role enforcement mechanisms
- ❌ Physical access tokens (NFC/QR)
- ❌ Offline authentication
- ❌ Session management per terminal
- ❌ Manager override capabilities
- ❌ Audit trail with user attribution
- ❌ Multi-factor authentication for admins
- ❌ Staff scheduling integration

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Database Schema Creation
```sql
-- Core user tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT,
  pin_hash TEXT, -- For quick staff access
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  status TEXT DEFAULT 'active' -- active, suspended, terminated
);

CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  restaurant_id UUID NOT NULL,
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  hire_date DATE,
  birth_date DATE, -- For age verification (alcohol)
  emergency_contact JSONB,
  certifications JSONB[], -- Food handler, alcohol service
  preferred_language TEXT DEFAULT 'en',
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Physical access tokens
CREATE TABLE access_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number TEXT UNIQUE NOT NULL, -- NFC UID, QR data, or mag stripe
  card_type TEXT NOT NULL, -- nfc, qr, magnetic, biometric
  user_id UUID REFERENCES users(id),
  restaurant_id UUID NOT NULL,
  issued_date TIMESTAMP DEFAULT NOW(),
  expires_date TIMESTAMP,
  status TEXT DEFAULT 'active' -- active, lost, stolen, expired
);

-- Role definitions
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0, -- For hierarchy
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User-Role assignments
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  restaurant_id UUID NOT NULL,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, role_id, restaurant_id)
);

-- Terminal sessions
CREATE TABLE terminal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id TEXT NOT NULL,
  restaurant_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  role_override UUID REFERENCES roles(id),
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

-- Comprehensive audit log
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID NOT NULL,
  terminal_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_restaurant_id ON audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_terminal_sessions_terminal_id ON terminal_sessions(terminal_id);
CREATE INDEX idx_user_roles_restaurant_id ON user_roles(restaurant_id);
```

### 1.2 Role Permission Matrix
```javascript
const ROLE_PERMISSIONS = {
  CUSTOMER: {
    menu: ['read'],
    orders: ['create:own', 'read:own'],
    payments: ['create:own'],
    profile: ['read:own', 'update:own']
  },
  
  RUNNER: {
    orders: ['read', 'update:delivery_status'],
    tables: ['update:status']
  },
  
  SERVER: {
    menu: ['read'],
    orders: ['create', 'read:assigned', 'update:assigned'],
    tables: ['read', 'update:assigned'],
    payments: ['create', 'read:assigned'],
    tips: ['read:own']
  },
  
  BARTENDER: {
    menu: ['read:beverages'],
    orders: ['read:bar', 'update:bar'],
    inventory: ['read:bar', 'update:bar'],
    tabs: ['create', 'read', 'update', 'transfer']
  },
  
  COOK: {
    orders: ['read:station', 'update:status'],
    recipes: ['read'],
    inventory: ['read:kitchen']
  },
  
  EXPO: {
    orders: ['read', 'update:quality', 'update:ready'],
    stations: ['read', 'coordinate'],
    quality: ['check', 'report']
  },
  
  HOST: {
    tables: ['read', 'assign'],
    waitlist: ['create', 'read', 'update', 'delete'],
    reservations: ['create', 'read', 'update', 'cancel']
  },
  
  MANAGER: {
    ...SERVER, // Inherits all server permissions
    orders: ['create', 'read', 'update', 'void', 'comp'],
    staff: ['read', 'assign', 'schedule'],
    reports: ['read:daily'],
    discounts: ['apply'],
    overrides: ['price', 'policy']
  },
  
  OWNER: {
    '*': ['*'] // Full access
  },
  
  DELIVERY: {
    orders: ['read:assigned', 'update:delivery'],
    customers: ['contact:delivery'],
    routes: ['read:assigned']
  }
};
```

### 1.3 Migration Scripts
```javascript
// migrations/001_add_auth_tables.js
export async function up(db) {
  // Run SQL schema creation
  await db.exec(SCHEMA_SQL);
  
  // Seed initial roles
  await seedRoles(db);
  
  // Migrate existing demo users
  await migrateDemoUsers(db);
}

export async function down(db) {
  // Rollback strategy
  await db.exec('DROP TABLE IF EXISTS audit_logs CASCADE');
  // ... other drops
}
```

---

## Phase 2: Authentication Layer (Week 3-4)

### 2.1 Supabase Auth Integration
```typescript
// services/auth/SupabaseAuthService.ts
export class SupabaseAuthService {
  async signUp(email: string, password: string, role: string) {
    // Create Supabase auth user
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, restaurant_id: currentRestaurant }
      }
    });
    
    // Create staff profile
    await this.createStaffProfile(user.id, role);
    
    return user;
  }
  
  async signInWithPin(employeeId: string, pin: string) {
    // Quick staff authentication
    const staff = await this.verifyPin(employeeId, pin);
    const token = await this.generateStaffToken(staff);
    return { staff, token };
  }
  
  async signInWithCard(cardNumber: string) {
    // NFC/QR card authentication
    const card = await this.validateCard(cardNumber);
    const user = await this.getUserByCard(card);
    return this.createSession(user);
  }
}
```

### 2.2 Session Management
```typescript
// services/auth/SessionManager.ts
export class SessionManager {
  private activeSessions = new Map<string, Session>();
  
  async createTerminalSession(
    terminalId: string,
    userId: string,
    role: string
  ) {
    const session = {
      id: uuid(),
      terminalId,
      userId,
      role,
      startedAt: new Date(),
      expiresAt: this.calculateExpiry(role)
    };
    
    await this.persistSession(session);
    this.activeSessions.set(terminalId, session);
    
    return session;
  }
  
  async switchUser(terminalId: string, newUserId: string) {
    // Quick user switching without logout
    const session = this.activeSessions.get(terminalId);
    if (!session) throw new Error('No active session');
    
    // Log the switch
    await this.auditLog('user_switch', {
      from: session.userId,
      to: newUserId,
      terminal: terminalId
    });
    
    session.userId = newUserId;
    await this.updateSession(session);
  }
  
  enableRushMode(terminalId: string) {
    // Disable auto-logout during peak hours
    const session = this.activeSessions.get(terminalId);
    if (session) {
      session.rushMode = true;
      session.expiresAt = null;
    }
  }
}
```

### 2.3 Physical Access Token Support
```typescript
// services/auth/CardReader.ts
export class CardReaderService {
  async initialize() {
    // Web NFC API for modern browsers
    if ('NDEFReader' in window) {
      this.nfcReader = new NDEFReader();
      await this.nfcReader.scan();
      this.nfcReader.onreading = this.handleNFCRead;
    }
    
    // QR scanner fallback
    this.qrScanner = new QRScanner();
    
    // Magnetic stripe reader (keyboard emulation)
    this.setupMagStripeListener();
  }
  
  private handleNFCRead = async (event) => {
    const cardId = event.serialNumber;
    await this.authenticateCard(cardId, 'nfc');
  };
  
  private async authenticateCard(cardId: string, type: string) {
    try {
      const user = await authService.signInWithCard(cardId);
      this.onAuthenticated(user);
    } catch (error) {
      this.onAuthError(error);
    }
  }
}
```

---

## Phase 3: Authorization & Enforcement (Week 5-6)

### 3.1 Backend Middleware
```typescript
// middleware/roleAuth.ts
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from token
      const user = await extractUser(req);
      
      // Check role permissions
      const hasPermission = await checkPermission(
        user,
        req.method,
        req.path,
        allowedRoles
      );
      
      if (!hasPermission) {
        // Log unauthorized attempt
        await auditLog({
          user_id: user?.id,
          action: 'unauthorized_access',
          resource: req.path,
          details: { method: req.method, roles: allowedRoles }
        });
        
        return res.status(403).json({ 
          error: 'Insufficient permissions' 
        });
      }
      
      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication required' });
    }
  };
}

// Usage in routes
router.post('/orders/:id/void', 
  requireRole('MANAGER', 'OWNER'),
  async (req, res) => {
    // Only managers and owners can void orders
  }
);
```

### 3.2 Frontend Route Guards
```typescript
// components/auth/ProtectedRoute.tsx
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  fallback = <AccessDenied />
}: ProtectedRouteProps) {
  const { user, role } = useAuth();
  const { addToast } = useToast();
  
  useEffect(() => {
    if (user && !allowedRoles.includes(role)) {
      addToast({
        type: 'error',
        message: `This page requires ${allowedRoles.join(' or ')} access`
      });
      
      // Log attempted access
      logAccess({
        attempted_route: location.pathname,
        user_role: role,
        required_roles: allowedRoles
      });
    }
  }, [user, role, allowedRoles]);
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!allowedRoles.includes(role)) {
    return fallback;
  }
  
  return children;
}

// Usage
<ProtectedRoute allowedRoles={['MANAGER', 'OWNER']}>
  <AdminDashboard />
</ProtectedRoute>
```

### 3.3 Manager Override System
```typescript
// components/auth/ManagerOverride.tsx
export function ManagerOverride({ 
  action,
  onAuthorized,
  children 
}: ManagerOverrideProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [pin, setPin] = useState('');
  
  const handleOverride = async () => {
    try {
      const manager = await authService.verifyManagerPin(pin);
      
      // Log the override
      await auditLog({
        action: 'manager_override',
        details: {
          action,
          manager_id: manager.id,
          original_user: currentUser.id
        }
      });
      
      onAuthorized(manager);
      setShowOverride(false);
    } catch (error) {
      showError('Invalid manager PIN');
    }
  };
  
  return (
    <>
      {children(() => setShowOverride(true))}
      
      <Modal open={showOverride}>
        <h2>Manager Authorization Required</h2>
        <p>Action: {action}</p>
        <PinInput 
          value={pin}
          onChange={setPin}
          onComplete={handleOverride}
        />
      </Modal>
    </>
  );
}
```

---

## Phase 4: User Management Interface (Week 7-8)

### 4.1 Staff Management Dashboard
```typescript
// pages/admin/StaffManagement.tsx
export function StaffManagement() {
  const { staff, loading } = useStaff();
  
  return (
    <AdminLayout>
      <Tabs>
        <TabPanel label="Active Staff">
          <StaffGrid staff={staff.filter(s => s.status === 'active')} />
        </TabPanel>
        
        <TabPanel label="Schedule">
          <ShiftScheduler staff={staff} />
        </TabPanel>
        
        <TabPanel label="Permissions">
          <RoleAssignment staff={staff} />
        </TabPanel>
        
        <TabPanel label="Access Cards">
          <CardManagement staff={staff} />
        </TabPanel>
        
        <TabPanel label="Activity Log">
          <StaffActivityLog />
        </TabPanel>
      </Tabs>
    </AdminLayout>
  );
}
```

### 4.2 Quick Staff Onboarding
```typescript
// components/staff/QuickOnboarding.tsx
export function QuickOnboarding() {
  const [step, setStep] = useState(1);
  const [staffData, setStaffData] = useState({});
  
  const steps = [
    { component: BasicInfo, title: 'Basic Information' },
    { component: RoleSelection, title: 'Assign Role' },
    { component: CardSetup, title: 'Setup Access Card' },
    { component: PinCreation, title: 'Create PIN' },
    { component: TrainingMode, title: 'Start Training' }
  ];
  
  const handleComplete = async () => {
    // Create staff member
    const staff = await createStaff(staffData);
    
    // Issue access card
    await issueCard(staff.id, staffData.cardNumber);
    
    // Start training session
    await startTraining(staff.id);
    
    showSuccess(`${staff.name} is ready to start!`);
  };
  
  return (
    <Wizard 
      steps={steps}
      currentStep={step}
      onComplete={handleComplete}
    />
  );
}
```

---

## Phase 5: Offline & Resilience (Week 9-10)

### 5.1 Offline Authentication Cache
```typescript
// services/auth/OfflineAuth.ts
export class OfflineAuthService {
  private cache: LocalForage;
  
  async initialize() {
    this.cache = localforage.createInstance({
      name: 'auth_cache'
    });
    
    // Sync permissions when online
    if (navigator.onLine) {
      await this.syncPermissions();
    }
    
    // Listen for connection changes
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  async authenticateOffline(cardNumber: string) {
    // Check cached card data
    const cachedCard = await this.cache.getItem(`card_${cardNumber}`);
    
    if (!cachedCard) {
      throw new Error('Card not found in offline cache');
    }
    
    if (cachedCard.expires < Date.now()) {
      throw new Error('Card expired');
    }
    
    // Create offline session
    const session = {
      id: uuid(),
      userId: cachedCard.userId,
      role: cachedCard.role,
      offline: true,
      created: Date.now()
    };
    
    // Queue for sync when online
    await this.queueForSync('session', session);
    
    return session;
  }
  
  private async syncPermissions() {
    const permissions = await fetch('/api/auth/permissions');
    await this.cache.setItem('permissions', permissions);
    
    // Cache staff cards
    const cards = await fetch('/api/auth/cards');
    for (const card of cards) {
      await this.cache.setItem(`card_${card.number}`, card);
    }
  }
}
```

### 5.2 Conflict Resolution
```typescript
// services/sync/ConflictResolver.ts
export class ConflictResolver {
  async resolveAuthConflicts(
    offline: OfflineData[],
    online: OnlineData[]
  ) {
    const conflicts = [];
    
    for (const offlineItem of offline) {
      const onlineItem = online.find(o => o.id === offlineItem.id);
      
      if (onlineItem && this.hasConflict(offlineItem, onlineItem)) {
        conflicts.push({
          offline: offlineItem,
          online: onlineItem,
          resolution: this.suggestResolution(offlineItem, onlineItem)
        });
      }
    }
    
    return conflicts;
  }
  
  private suggestResolution(offline: any, online: any) {
    // Timestamps win for audit logs
    if (offline.type === 'audit_log') {
      return 'keep_both';
    }
    
    // Manager overrides win
    if (offline.isManagerOverride) {
      return 'use_offline';
    }
    
    // Default to online (source of truth)
    return 'use_online';
  }
}
```

---

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Create database schema
- [ ] Set up migration scripts
- [ ] Define role permission matrix
- [ ] Create audit logging infrastructure

### Week 3-4: Authentication
- [ ] Integrate Supabase Auth
- [ ] Implement PIN authentication
- [ ] Add card reader support
- [ ] Build session management

### Week 5-6: Authorization
- [ ] Create backend middleware
- [ ] Add frontend route guards
- [ ] Implement manager override
- [ ] Add role enforcement

### Week 7-8: User Interface
- [ ] Build staff management dashboard
- [ ] Create onboarding flow
- [ ] Add activity monitoring
- [ ] Implement shift scheduling

### Week 9-10: Polish & Testing
- [ ] Add offline support
- [ ] Implement conflict resolution
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Staff training materials

---

## Risk Mitigation

### Technical Risks
1. **Database Migration Failure**
   - Mitigation: Comprehensive rollback strategy
   - Backup before migration

2. **Performance Degradation**
   - Mitigation: Caching layer
   - Database indexing
   - Connection pooling

3. **Offline Sync Conflicts**
   - Mitigation: Clear conflict resolution rules
   - Manager approval for conflicts

### Operational Risks
1. **Staff Training Burden**
   - Mitigation: Gradual rollout
   - Video tutorials
   - In-app guidance

2. **Card Loss/Theft**
   - Mitigation: Instant deactivation
   - PIN requirement for sensitive ops
   - Audit trail

3. **System Downtime**
   - Mitigation: Offline mode
   - Cached permissions
   - Emergency override codes

---

## Success Metrics

### Performance KPIs
- Authentication time: <1 second
- Page load with auth: <2 seconds
- Offline operation: 100% core features
- Session management overhead: <50ms

### Business KPIs
- Staff onboarding time: <10 minutes
- Training completion rate: >95%
- Security incidents: 0 critical
- Audit compliance: 100%

### User Experience KPIs
- Login success rate: >99%
- Card read success: >95%
- Manager override time: <30 seconds
- Support tickets: <5% of staff

---

## Testing Strategy

### Unit Tests
```typescript
describe('Authentication', () => {
  test('PIN authentication succeeds with valid PIN', async () => {
    const result = await auth.signInWithPin('EMP001', '1234');
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
  });
  
  test('Card authentication works offline', async () => {
    mockOffline();
    const result = await auth.signInWithCard('NFC123');
    expect(result.offline).toBe(true);
  });
});
```

### Integration Tests
- Full authentication flow
- Role switching scenarios
- Manager override workflows
- Offline/online transitions

### Load Tests
- 100 concurrent authentications
- 1000 active sessions
- 10000 audit logs/hour
- Card reader stress test

### Security Tests
- Penetration testing
- SQL injection attempts
- Token forgery
- Session hijacking
- Card cloning prevention

---

## Documentation Requirements

### For Developers
- API documentation
- Database schema docs
- Authentication flow diagrams
- Integration guides

### For Managers
- Staff management guide
- Permission configuration
- Report generation
- Troubleshooting guide

### For Staff
- Quick start cards
- Video tutorials
- FAQ document
- Emergency procedures

---

## Rollback Strategy

If critical issues arise:

1. **Immediate Rollback** (< 5 minutes)
   - Revert to demo mode
   - Disable auth middleware
   - Clear session cache

2. **Database Rollback**
   - Restore from backup
   - Run down migrations
   - Verify data integrity

3. **Communication Plan**
   - Notify all restaurants
   - Provide workaround
   - Timeline for fix

---

## Maintenance & Support

### Regular Maintenance
- Weekly permission audits
- Monthly security patches
- Quarterly pen testing
- Annual compliance review

### Support Structure
- 24/7 emergency hotline
- Slack channel for managers
- In-app help system
- Remote assistance capability

---

## Conclusion

This roadmap provides a pragmatic, restaurant-focused approach to authentication that prioritizes:
- **Speed** over complex security for routine operations
- **Reliability** through offline capabilities
- **Simplicity** in staff interactions
- **Accountability** through comprehensive auditing

The phased approach ensures we can:
- Maintain backward compatibility
- Roll back if needed
- Learn and adjust as we go
- Minimize disruption to operations

Next steps:
1. Review and approve roadmap
2. Allocate development resources
3. Begin Phase 1 implementation
4. Set up testing environments
5. Create training materials

---

*Document Version: 1.0*  
*Last Updated: 2025-01-29*  
*Author: Restaurant OS Team*  
*Status: DRAFT - Pending Approval*