# ベースイメージに Node.js を指定
FROM node:22-bullseye

# Playwright の依存関係をインストール（Linux用）
RUN apt-get update && \
    apt-get install -y \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libgtk-3-0 \
        wget \
        ca-certificates \
        fonts-liberation \
        unzip \
        && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# package.json と package-lock.json をコピーして依存関係をインストール
COPY package*.json ./
RUN npm install

# Playwright のブラウザをインストール
RUN npx playwright install --with-deps

# プロジェクトのコードをコピー
COPY . .

# 環境変数（必要に応じてここにCOOKIE_DATAなどを設定可能）
# ENV COOKIE_DATA="ここにJSON文字列"

# ポート指定
EXPOSE 10000

# アプリ起動
CMD ["node", "index.js"]
