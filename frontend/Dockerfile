# Dev-oriented image: runs `next dev` with the source bind-mounted via compose.
# Production multi-stage build is handled in Phase 12.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
