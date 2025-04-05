FROM node:18

# Instala dependências necessárias pro Venom funcionar (incluindo Chrome)
RUN apt-get update && apt-get install -y wget gnupg unzip \
 && wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
 && dpkg -i google-chrome-stable_current_amd64.deb || apt-get -fy install

WORKDIR /app

COPY . .

RUN npm install

CMD ["node", "index.js"]
