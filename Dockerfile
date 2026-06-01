FROM node:22-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy backend and frontend package.json files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Copy prisma schema so postinstall script works
COPY backend/prisma ./backend/prisma/

# Install dependencies
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy the rest of the application
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN cd backend && npx prisma generate && npm run build

# Start backend (which also serves the compiled frontend)
WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run db:seed && npm start"]
