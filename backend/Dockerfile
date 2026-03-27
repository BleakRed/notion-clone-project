# Use Node.js 20 (LTS) version
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Start the application
# We use a safety sleep to ensure the DB process is fully stabilized before Prisma connects
CMD sleep 5 && npx prisma db push --accept-data-loss && npm start
