# Use Node 18 image
FROM node:18

# Set working directory
WORKDIR /app

# Copy wait-for-it script from root of repo to container root
COPY ../../wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Compile TypeScript to dist/
RUN npx tsc

# Expose the port if the service has an API
EXPOSE 3000

# Wait for RabbitMQ before running app
CMD ["/wait-for-it.sh", "rabbitmq:5672", "--", "node", "dist/index.js"]
