# Agent Crash Prevention Guide

## Incident Summary (Dec 28, 2025)

An agent testing user flows crashed when the working directory was deleted mid-session. Investigation found the agent never actually ran tests - it got stuck at a shell session failure.

## Root Causes Identified

1. **Shell Session Corruption**: Multiple Bash commands failed in rapid succession
2. **External Directory Deletion**: Something removed the folder during a 9-minute idle period
3. **No Graceful Recovery**: Claude Code couldn't recover from lost working directory

## Prevention Measures

### 1. Git Safety (CRITICAL)
Always ensure changes are committed and pushed before:
- Running comprehensive tests
- Starting long-running agent sessions
- Any operations that modify many files

```bash
# Before any major agent operation:
git status && git add -A && git commit -m "checkpoint before testing" && git push
```

### 2. Protect Against External Deletion
- **Exclude from iCloud**: If using iCloud Drive, exclude coding folders
- **Avoid cloud sync**: Use local-only directories for active development
- **Don't delete folders during sessions**: Wait for Claude to finish

### 3. Handle Shell Failures
If you see repeated Bash failures:
1. Use `/clear` to reset the session
2. Restart Claude Code: `claude --resume` or start fresh
3. Check if the project directory still exists: `ls -la /path/to/project`

### 4. Comprehensive Testing Safety
When asking Claude to "test all buttons" or similar:
```
# Safer prompt:
"Test the authentication flows. After each major section,
commit progress with a descriptive message. Stop if any
shell commands fail repeatedly."
```

### 5. Session Monitoring
Watch for these warning signs:
- Multiple consecutive `[TOOL FAILURE]` messages
- Agent stuck on "BLOCKER" items for >5 minutes
- No progress on pending items for extended periods

If these occur, interrupt with `Ctrl+C` and investigate.

## Recovery Steps

If a directory disappears:
1. Check git remote: `git log --oneline origin/main -5`
2. Clone fresh: `git clone <repo-url>`
3. Restore env files from backups or shell config

## Files to Backup Regularly

- `.env` files (store in password manager, NOT git)
- `~/.zshrc` or `~/.bashrc` (contains env exports)
- Any local configuration not in git

---

*Generated from investigation of session 930e3d7c-f52a-4696-aab9-2051919ec816*
