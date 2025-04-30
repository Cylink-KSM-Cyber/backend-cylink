FROM node:18-alpine

WORKDIR /app
COPY . .

RUN npm ci --omit=dev
RUN npm install typescript
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
