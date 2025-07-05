# Custom Claude Commands

This directory contains custom command definitions for automating common development tasks in the rebuild-6.0 project.

## Available Commands

### `/new-feature <feature-name>`
Scaffolds a complete feature module following the Janus Module Architecture.

**Usage:**
```bash
/new-feature order-tracking
/new-feature "Customer Analytics"  # Spaces will be converted to hyphens
```

**Creates:**
- Feature directory with proper structure
- TypeScript component with props interface
- Custom hook for state management
- Type definitions
- Mock data file
- Basic test file
- Feature-specific claude.md context file

## How Custom Commands Work

1. **Definition**: Each `.md` file in this directory defines a command
2. **Execution**: Commands are bash scripts that automate repetitive tasks
3. **Integration**: Commands respect the project's architecture and conventions

## Creating New Commands

To create a new custom command:

1. Create a new `.md` file in this directory
2. Follow the format:
   ```markdown
   # Command: /command-name
   # Usage: /command-name [arguments]
   # Description: What the command does
   
   ## Script Definition
   ```bash
   #!/bin/bash
   # Your bash script here
   ```
   ```

3. Test the command thoroughly
4. Document integration with Multi-Agent workflow

## Best Practices

1. **Validate Input**: Always check for required arguments
2. **Idempotency**: Commands should be safe to run multiple times
3. **Error Handling**: Provide clear error messages
4. **Documentation**: Update claude.md files automatically
5. **Architecture**: Follow the Janus Module Architecture

## Integration with AI Workflow

Custom commands integrate with our Multi-Agent system:
- **Architect**: Uses commands to scaffold consistent structures
- **Builder**: Implements within the scaffolded framework
- **Validator**: Has pre-configured test files to expand
- **Optimizer**: Can focus on performance within established patterns
- **Documenter**: Has context files ready for documentation

## Future Commands

Planned commands for automation:
- `/add-test` - Add test file for existing component
- `/add-hook` - Create a new custom hook
- `/add-service` - Scaffold a new service integration
- `/add-context` - Create a new React context provider