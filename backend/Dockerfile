FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies (will use package.json in the backend folder)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

ENV NODE_ENV=development
ENV PORT=3001

EXPOSE 3001

# Use the development script so tsx watch restarts on changes
CMD ["npm", "run", "dev"]
