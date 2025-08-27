# Use official Node.js LTS image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json/yarn.lock
COPY package.json yarn.lock ./

# Enable Corepack for Yarn Berry
RUN corepack enable

# Install dependencies
RUN yarn install --frozen-lockfile

# Build the application
RUN yarn build

# Copy the rest of the application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DB_PATH=/data/app.db

# Create data directory for SQLite DB
RUN mkdir -p /data

# Set volume for SQLite DB
VOLUME ["/data"]

# Start the server
CMD ["yarn", "start"]
