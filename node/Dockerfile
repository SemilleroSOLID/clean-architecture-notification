FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# The defaults of .env.example; docker-compose.yml overrides AMQP_URL and SMTP_HOST with the names of the services
COPY .env.example .env
CMD ["npm", "run", "start:consumer", "--", "email"]
