# MCP Workflow Patterns - 2025 Enterprise Configuration

## Standard Development Workflows

### 🏗️ Architecture Analysis Workflow
**Trigger**: Complex system design questions
**MCP Chain**: `sequential-thinking` → `memory` → `filesystem`

```yaml
Pattern: architecture-analysis
Steps:
  1. sequential-thinking server → Multi-step system analysis
  2. memory server → Store architectural decisions
  3. filesystem server → Review related code files
  4. sequential-thinking → Generate recommendations
  5. memory server → Persist patterns for future use

Example: "Analyze the unified backend architecture for performance bottlenecks"
```

### 🔧 Code Refactoring Workflow  
**Trigger**: Code improvement requests
**MCP Chain**: `filesystem` → `sequential-thinking` → `git` → `memory`

```yaml
Pattern: code-refactoring
Steps:
  1. filesystem server → Scan target files and dependencies
  2. sequential-thinking server → Analyze refactoring opportunities
  3. filesystem server → Implement changes
  4. git server → Create feature branch and commit changes
  5. memory server → Store refactoring patterns

Example: "Refactor the order management system for better maintainability"
```

### 📊 Knowledge Management Workflow
**Trigger**: Learning or decision documentation  
**MCP Chain**: `memory` → `sequential-thinking` → `filesystem`

```yaml
Pattern: knowledge-management
Steps:
  1. memory server → Store new insights or decisions
  2. sequential-thinking server → Analyze patterns and connections
  3. filesystem server → Update relevant documentation
  4. memory server → Build knowledge graph connections

Example: "Remember why we chose unified backend over microservices"
```

### 🚀 Feature Development Workflow
**Trigger**: New feature implementation
**MCP Chain**: `sequential-thinking` → `filesystem` → `git` → `memory`

```yaml
Pattern: feature-development
Steps:
  1. sequential-thinking server → Plan feature architecture
  2. memory server → Retrieve similar patterns
  3. filesystem server → Implement components
  4. git server → Version control workflow
  5. sequential-thinking server → Analyze integration points
  6. memory server → Store implementation patterns

Example: "Add real-time order status updates to the KDS"
```

## Advanced Multi-Server Patterns

### 🔄 Continuous Analysis Pattern
**Use Case**: Ongoing system monitoring and improvement
**Servers**: All MCP servers in rotation

```yaml
Pattern: continuous-analysis
Cycle:
  Daily: memory server → Retrieve recent patterns
  Weekly: sequential-thinking → System health analysis  
  Monthly: filesystem → Codebase quality review
  Quarterly: Full architectural review with all servers

Automation: Can be triggered by git hooks or CI/CD
```

### 🧠 Cross-Session Learning Pattern
**Use Case**: Building institutional knowledge
**Servers**: `memory` + `sequential-thinking`

```yaml
Pattern: cross-session-learning
Process:
  1. Every session → memory server stores key insights
  2. Pattern detection → sequential-thinking analyzes trends
  3. Knowledge synthesis → Build comprehensive understanding
  4. Future sessions → Leverage accumulated knowledge

Benefits: Reduces repetitive analysis, builds expertise over time
```

### 🔗 Integration Testing Pattern  
**Use Case**: Testing MCP server interactions
**Servers**: All project servers

```yaml
Pattern: integration-testing
Test_Sequence:
  1. filesystem server → Create test files
  2. sequential-thinking server → Generate test scenarios
  3. git server → Version control test artifacts
  4. memory server → Store test patterns and results
  
Validation: Each server confirms operations with others
```

## Workflow Triggers and Automation

### Natural Language Triggers
```yaml
Architecture: "design", "architect", "system", "scale" → sequential-thinking + memory
File_Operations: "update", "modify", "refactor", "scan" → filesystem first
Repository: "commit", "branch", "merge", "deploy" → git server
Knowledge: "remember", "learn", "pattern", "decision" → memory server
Complex_Analysis: "analyze", "debug", "troubleshoot" → sequential-thinking
```

### Command Patterns
```yaml
# Architecture workflow
/user:design --unified-backend --mcp sequential-thinking,memory

# Development workflow  
/user:build --feature order-status --mcp filesystem,git

# Analysis workflow
/user:analyze --performance --mcp sequential-thinking,filesystem

# Knowledge workflow
/user:document --decision architecture --mcp memory,filesystem
```

### Git Hook Integration
```yaml
Pre-commit: filesystem server → Code analysis
Post-commit: memory server → Store commit patterns  
Pre-push: sequential-thinking → Integration analysis
Post-merge: All servers → Update knowledge base
```

## Error Recovery Patterns

### Server Failure Cascade
```yaml
Primary_Failure: Try alternative MCP server
Secondary_Failure: Fallback to native tools
Tertiary_Failure: Manual intervention required

Example:
  filesystem fails → Use native file operations
  sequential-thinking fails → Break down to simple steps
  memory fails → Use session memory only
  git fails → Manual git operations
```

### Graceful Degradation
```yaml
Full_MCP: All servers available → Maximum capability
Partial_MCP: Some servers down → Reduced functionality  
No_MCP: All servers down → Native tools only
Recovery: Automatic retry with exponential backoff
```

## Performance Optimization

### Parallel Execution
```yaml
Independent_Operations: Run MCP servers in parallel
Dependent_Operations: Sequential execution required
Batch_Operations: Combine similar requests
Cache_Results: Reuse outputs within session
```

### Resource Management  
```yaml
Token_Budget: Monitor and limit per-server usage
Context_Sharing: Pass results between servers efficiently
Cleanup: Regular memory server optimization
Monitoring: Track server performance and health
```

---
*2025 MCP Workflow Patterns | Enterprise Configuration | Rebuild-6.0 Optimized*