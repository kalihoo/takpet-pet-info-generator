FROM mcr.microsoft.com/playwright:v1.45.3-jammy

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p outputs

EXPOSE 3000
CMD ["npm", "start"]
