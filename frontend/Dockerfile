# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
