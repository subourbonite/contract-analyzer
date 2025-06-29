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
- **Ensure tests pass** before considering work complete: `npm test`
- Run linting and type checking: `npm run lint`, `tsc --noEmit`
- Maintain or improve code coverage with new tests

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
- Use meaningful test data and edge cases
- Group related tests with `describe` blocks
- One assertion per test when possible

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
- Maintain domain model integrity in `src/domain/`
- Keep business rules in the domain layer
- Use value objects for important domain concepts
- Separate infrastructure concerns from business logic

### 13. AWS Integration
- Mock AWS services in tests using jest mocks
- Keep AWS-specific code in infrastructure adapters
- Use proper error handling for AWS service calls
- Follow AWS best practices for security and cost

## Workflow Guidelines

### 14. Change Implementation Process
1. Write/update failing tests first
2. Implement minimal code to make tests pass
3. Refactor while keeping tests green
4. Verify build succeeds and all tests pass
5. Update documentation if needed

### 15. Code Review Readiness
- Ensure changes are focused and atomic
- Include test coverage for new functionality
- Update relevant documentation
- Verify no breaking changes to existing functionality

## Exception Handling
When deviating from these guidelines:
- **Document the reason** in code comments or commit messages
- Explain the trade-offs considered
- Note any technical debt incurred
- Plan for future improvement if applicable

---

*These instructions help ensure consistent, high-quality code generation that follows modern software development best practices and maintains the integrity of the contract analysis application.*