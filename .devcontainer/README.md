# Dev Container Setup

This project is configured to use VS Code Dev Containers for a consistent development environment across all developers.

## Prerequisites

1. **VS Code** with the **Remote - Containers** extension installed
2. **Docker** installed and running on your machine

## Getting Started

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd contract-analyzer
   ```

2. **Open in VS Code**:
   ```bash
   code .
   ```

3. **Reopen in Container**:
   - When VS Code opens, you should see a notification asking if you want to reopen in a container
   - Click "Reopen in Container"
   - Or use the Command Palette (`Cmd+Shift+P`) and select "Dev Containers: Reopen in Container"

4. **Wait for setup**:
   - The container will build and install all dependencies automatically
   - This may take a few minutes on the first run

## What's Included

The dev container includes:

### Tools & Runtimes
- **Node.js 20** (LTS)
- **npm** (latest)
- **TypeScript 5.0.2**
- **AWS CLI v2**
- **AWS CDK 2.87.0**
- **AWS Amplify CLI**

### VS Code Extensions
- Prettier (code formatting)
- ESLint (code linting)
- TypeScript support
- Tailwind CSS IntelliSense
- AWS Toolkit
- Docker support
- Auto Rename Tag
- Path IntelliSense

### Development Features
- **Automatic port forwarding** for dev servers (3000, 5173, 8080)
- **AWS credentials mounting** (your local ~/.aws directory)
- **Consistent formatting** with Prettier
- **Pre-configured debugging** for Chrome
- **Shell aliases** for common tasks

## Useful Commands

The container includes several helpful aliases:

```bash
# Development
dev                 # Start the Vite dev server (npm run dev)

# CDK operations
cdk-deploy         # Deploy infrastructure (cd infrastructure && npm run cdk:deploy)
cdk-destroy        # Destroy infrastructure (cd infrastructure && npm run cdk:destroy)
cdk-diff          # Show infrastructure diff

# Navigation
ll                # ls -la (detailed file list)
..                # cd .. (go up one directory)
...               # cd ../.. (go up two directories)
```

## AWS Configuration

Your local AWS credentials are automatically mounted into the container. If you need to configure AWS for the first time:

```bash
aws configure
```

For Amplify:
```bash
amplify configure
```

## Project Structure

- `/src` - React/TypeScript source code
- `/infrastructure` - AWS CDK infrastructure code
- `/amplify` - AWS Amplify configuration
- `/.devcontainer` - Dev container configuration
- `/.vscode` - VS Code workspace settings

## Debugging

The container is configured with Chrome debugging support:

1. Start the dev server: `npm run dev`
2. Open the Debug panel in VS Code (`Cmd+Shift+D`)
3. Select "Launch Chrome" configuration
4. Set breakpoints in your TypeScript/React code

## Troubleshooting

### Container won't start
- Ensure Docker is running
- Check Docker has enough memory allocated (4GB+ recommended)

### AWS CLI not working
- Verify your AWS credentials are properly configured
- Check that `~/.aws` directory exists on your local machine

### Ports not accessible
- The container forwards ports 3000, 5173, and 8080 automatically
- If you need additional ports, add them to `devcontainer.json`

### Extensions not loading
- Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"

## Customization

To customize the dev container:

1. **Add extensions**: Edit `.devcontainer/devcontainer.json` in the `extensions` array
2. **Add system packages**: Edit `.devcontainer/Dockerfile`
3. **Change Node version**: Update the base image in `Dockerfile`
4. **Add environment variables**: Update `containerEnv` in `devcontainer.json`

## Performance Tips

- Use **bind mounts** sparingly for better performance
- Consider using **named volumes** for node_modules if you experience slow npm installs
- Close unnecessary VS Code windows to reduce memory usage

## Getting Help

If you encounter issues with the dev container setup, check:

1. VS Code Dev Containers documentation
2. Docker logs: `docker logs <container_name>`
3. VS Code Developer Tools: Help → Toggle Developer Tools
