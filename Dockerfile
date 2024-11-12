FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY .env.example .env

FROM node:20
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 3200
CMD ["npm", "run", "start:consumer", "--", "email"]