# GitHub Copilot Instructions

## Core Development Principles

### 1. Behavior-Driven Development (BDD)
- **Always write specifications and tests first**, then implement code to make tests pass
- Follow the Red-Green-Refactor cycle: write failing test → make it pass → refactor
- **Document any deviation from TDD/BDD** with clear reasoning in commit messages or code comments
- Use descriptive test names that explain the behavior being tested

### 2. Functional Core, Imperative Shell Architecture
- Keep business logic pure and functional in the core
- Push side effects (I/O, mutations, external calls) to the shell/boundaries
- Core functions should be deterministic and easily testable
- Shell handles coordination, orchestration, and infrastructure concerns

### 3. Functional Programming Preferences
- **Prefer functional approaches**: use `map`, `reduce`, `filter`, `find`, etc. over loops
- Favor immutability and pure functions
- Use function composition and higher-order functions
- Avoid mutating state when possible

### 4. Quality Assurance
- **Always verify builds succeed** after changes: `npm run build`
- **Ensure tests pass** before considering work complete:
  - Unit tests (domain/application logic): `npm run test:unit`
  - Integration tests (use cases with mocks): `npm run test:integration`
  - All tests: `npm test`
  - Test coverage report: `npm run test:coverage`
  - Watch mode during development: `npm run test:watch`
- **Verify infrastructure builds**: `cd infrastructure && npm install && npm run cdk:synth`
- Run linting and type checking: `npm run lint`, `tsc --noEmit`
- Maintain or improve code coverage with new tests
- **Build verification must succeed** before any code review or deployment

## Code Architecture & Design

### 5. SOLID Principles
- **S**ingle Responsibility: Each class/function has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes must be substitutable for base classes
- **I**nterface Segregation: Many specific interfaces > one general interface
- **D**ependency Inversion: Depend on abstractions, not concretions

### 6. Testing Best Practices
- **Test interfaces, not implementations** - focus on behavior, not internals
- **Mock external dependencies** to ensure test isolation and speed
  - Use Jest mocks for AWS services (`aws-sdk` clients)
  - Mock infrastructure adapters (TextractExtractor, BedrockAnalyzer, S3FileStorage)
  - Create mock implementations of domain interfaces (ITextExtractor, IContractAnalyzer, ILogger)
- Use meaningful test data and edge cases
- Group related tests with `describe` blocks
- One assertion per test when possible
- **Test file naming convention**: `*.test.ts` for unit tests, `*.integration.test.ts` for integration tests
- Place tests in `__tests__` directories alongside the code they test

### 7. Dependency Injection & Testability
- Use constructor injection for dependencies
- Prefer interfaces/contracts over concrete implementations
- Make dependencies explicit rather than hidden
- Design for easy mocking and testing

## Technical Standards

### 8. Build & Development Tools
- Use **npm + Vite** for building and local development
- Follow existing package.json scripts and conventions
- Maintain compatibility with the current build pipeline
- Use TypeScript for type safety and better tooling

### 9. Code Quality & Style
- Follow existing ESLint and Prettier configurations  
- Use meaningful variable and function names
- Keep functions small and focused (prefer < 20 lines)
- Document complex business logic with comments
- Use TypeScript types effectively for self-documenting code

### 10. Error Handling & Resilience
- Use Result/Either patterns for error handling instead of throwing exceptions
- Validate inputs at boundaries
- Provide meaningful error messages
- Handle edge cases explicitly

### 11. Performance & Maintainability
- Avoid premature optimization - profile first
- Use appropriate data structures for the problem
- Keep cognitive complexity low
- Refactor regularly to prevent technical debt

## Project-Specific Guidelines

### 12. Contract Analysis Domain
- **Maintain domain model integrity in `src/domain/`**:
  - Pure business logic in `src/domain/services/` (ContractAnalysisService, ContractValidationService)
  - Domain entities in `src/domain/entities/` (Contract, ContractAnalysis)
  - Value objects in `src/domain/value-objects/` (FileMetadata)
- **Keep business rules in the domain layer**:
  - Royalty percentage extraction and validation
  - Contract size classification (small < 50 acres, medium < 500 acres, large >= 500 acres)
  - Risk scoring algorithms (0-100 scale, higher = more risky)
  - Quality scoring algorithms (0-100 scale, higher = better quality)
- **Use value objects for important domain concepts**:
  - FileMetadata for file validation rules
  - Contract terms validation
  - Analysis result validation
- **Separate infrastructure concerns from business logic**:
  - Never import AWS SDKs directly in domain layer
  - Use dependency injection for external services
  - Keep domain services pure and testable without mocks

### 13. AWS Integration
- **Mock AWS services in tests** using Jest mocks:
  - Mock `@aws-sdk/client-textract` for text extraction tests
  - Mock `@aws-sdk/client-bedrock-runtime` for contract analysis tests
  - Mock `@aws-sdk/client-s3` for file storage tests
- **Keep AWS-specific code in infrastructure adapters**:
  - `src/infrastructure/adapters/TextractExtractor.ts`
  - `src/infrastructure/adapters/BedrockAnalyzer.ts`
  - `src/infrastructure/adapters/S3FileStorage.ts`
- **Error handling patterns for AWS services**:
  - Use Result/Either patterns for AWS service calls
  - Handle specific AWS error types (ThrottlingException, ValidationException, etc.)
  - Implement exponential backoff for retryable errors
  - Log AWS errors with sufficient context for debugging
- **AWS service configuration**:
  - Use AWS regions: us-east-1 (primary), us-east-2 (fallback)
  - Bedrock models: Claude 3.5 Sonnet (primary), Claude 3 Haiku (fallback)
  - S3 bucket naming: `oil-gas-contracts-{account-id}-{region}`
- Follow AWS best practices for security and cost

## Workflow Guidelines

### 14. Change Implementation Process
1. **Write/update failing tests first** - follow TDD strictly
2. **Implement minimal code to make tests pass** - avoid over-engineering
3. **Refactor while keeping tests green** - improve design incrementally
4. **Verify build succeeds and all tests pass**:
   - Run `npm run build` to ensure TypeScript compilation
   - Run `npm test` to ensure all tests pass
   - Run `npm run lint` to ensure code style compliance
   - Run `cd infrastructure && npm run cdk:synth` to verify infrastructure
5. **Update documentation if needed** - keep README and comments current

### 15. Code Review Readiness
- **Ensure changes are focused and atomic** - one feature/fix per commit
- **Include test coverage for new functionality** - no untested code
- **Update relevant documentation** - inline comments and README updates
- **Verify no breaking changes to existing functionality** - run full test suite
- **Check for proper error handling** - use Result/Either patterns consistently

## Exception Handling
When deviating from these guidelines:
- **Document the reason** in code comments or commit messages
- Explain the trade-offs considered
- Note any technical debt incurred
- Plan for future improvement if applicable

## Project-Specific Command Reference

### Development Commands
```bash
# Development and building
npm run dev                    # Start development server
npm run build                  # Build application
npm run preview               # Preview built application

# Testing (always run before committing)
npm test                      # Run all tests
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests only
npm run test:coverage        # Generate coverage report
npm run test:watch           # Run tests in watch mode

# Code quality
npm run lint                 # Run ESLint
tsc --noEmit                # Type check without compilation

# Infrastructure
cd infrastructure && npm install && npm run cdk:synth  # Verify CDK
npm run cdk:deploy           # Deploy infrastructure
npm run cdk:destroy          # Destroy infrastructure
```

### File Structure Rules
- `src/domain/` - Pure business logic, no infrastructure dependencies
- `src/application/use-cases/` - Application orchestration and workflows
- `src/infrastructure/adapters/` - External service implementations
- `src/components/` - React UI components
- `src/types/` - TypeScript type definitions
- `src/utils/` - Pure utility functions
- `__tests__/` - Test files alongside source code

### Domain Business Rules (Contract Analysis)
- **Royalty Standards**: 12.5% (1/8th) is industry standard, >12.5% is above standard, <10% is below market
- **Contract Size Classification**: 
  - Small: < 50 acres
  - Medium: 50-500 acres  
  - Large: >= 500 acres
- **Risk Scoring**: 0-100 scale (higher = more risky)
- **Quality Scoring**: 0-100 scale (higher = better quality)
- **Complex Agreement**: >4 total parties (lessors + lessees)
- **Standard Term**: 3-5 years is typical primary term

---

*These instructions help ensure consistent, high-quality code generation that follows modern software development best practices and maintains the integrity of the contract analysis application.*