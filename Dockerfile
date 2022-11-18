FROM node:16.18

WORKDIR /app
ADD ./package*.json /app/
RUN npm i
ADD .. /app/

CMD ["node", "index.js"]