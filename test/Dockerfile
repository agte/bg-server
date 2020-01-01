FROM node:13.0.0-alpine
WORKDIR /app

ENV NODE_ENV test
COPY package.json yarn.lock ./
RUN yarn install

COPY . .

USER node
CMD ["yarn", "test"]