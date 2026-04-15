# justfile for Pickleball Practice Scheduler

# Install dependencies
install:
    npm install

# Run the local development server (Vite)
dev:
    npm run dev

# Run unit tests (Vitest)
test:
    npx vitest run

# Run unit tests in watch mode
test-watch:
    npx vitest

# Build the project for production
build:
    VITE_APP_VERSION=$(git describe --tags --always) npm run build

# Preview the production build locally
preview: build
    npm run preview

# Deploy to GitHub Pages (triggers the Action by pushing to main)
deploy: check
    git push origin main

# Clean up build artifacts and node_modules
clean:
    rm -rf dist node_modules

# Check project status and run all tests
check: install test build
