FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps --only=production

# Copy application files
COPY . .

# Build the web app
RUN npm run build:web

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]