FROM node:24-alpine3.21

WORKDIR /app

RUN corepack enable

COPY tsconfig.json ./
COPY yarn.lock .yarnrc.yml package.json ./
COPY src ./src

RUN yarn install
RUN yarn build

ENV NODE_ENV=production

# TODO: Configure env var and set it here
EXPOSE 3000

CMD ["yarn", "start"]
