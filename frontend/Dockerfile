FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Vite inlines VITE_* vars at build time, so they must be set here.
# docker-compose passes VITE_APP_ENV=prod; default keeps standalone builds as prod too.
ARG VITE_APP_ENV=prod
ENV VITE_APP_ENV=$VITE_APP_ENV

# Prod build talks to the gateway through nginx (see nginx.conf) using relative
# /api URLs, so the API base must be empty — NOT the local .env's localhost:5092.
# .dockerignore keeps .env out of the build context to guarantee this.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
