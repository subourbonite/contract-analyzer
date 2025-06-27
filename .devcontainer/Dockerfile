# Use the official Node.js 20 image as base
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Set the working directory
WORKDIR /workspace

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    build-essential \
    jq \
    zip \
    unzip \
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    tree \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2 with architecture detection
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
        AWSCLI_ARCH="x86_64"; \
    elif [ "$ARCH" = "aarch64" ]; then \
        AWSCLI_ARCH="aarch64"; \
    else \
        AWSCLI_ARCH="x86_64"; \
    fi && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-${AWSCLI_ARCH}.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws/

# Update npm to latest version to avoid upgrade notices
RUN npm install -g npm@latest

# Install specific versions of global npm packages (as root before switching users)
RUN npm install -g \
    aws-cdk@latest \
    @aws-amplify/cli@latest \
    typescript@5.0.2 \
    eslint@8.45.0 \
    prettier@latest

# Create a non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Switch to node user
USER $USERNAME

# Set up shell aliases and environment for the node user
RUN echo 'alias ll="ls -la"' >> ~/.bashrc \
    && echo 'alias la="ls -A"' >> ~/.bashrc \
    && echo 'alias l="ls -CF"' >> ~/.bashrc \
    && echo 'alias ..="cd .."' >> ~/.bashrc \
    && echo 'alias ...="cd ../.."' >> ~/.bashrc \
    && echo 'alias grep="grep --color=auto"' >> ~/.bashrc \
    && echo 'alias cdk-deploy="cd infrastructure && npm run cdk:deploy && cd .."' >> ~/.bashrc \
    && echo 'alias cdk-destroy="cd infrastructure && npm run cdk:destroy && cd .."' >> ~/.bashrc \
    && echo 'alias dev="npm run dev"' >> ~/.bashrc

# Set default environment variables
ENV NODE_ENV=development
ENV PATH="/home/node/.local/bin:$PATH"

# Expose common ports
EXPOSE 3000 5173 8080

# Default command
CMD ["/bin/bash"]
