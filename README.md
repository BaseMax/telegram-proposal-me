# **telegram-proposal-me**

A Telegram bot that generates **professional LaTeX reports** using **OpenAI**, compiles them into **PDF**, and returns both the `.tex` and `.pdf` files to the user fully automatically.

Designed, engineered, and maintained by **Seyyed Ali Mohammadiyeh (Max Base)**.

---

## 📌 **Features**

✔ Accepts a **title** and **description** from the user
✔ Generates **LaTeX code** via OpenAI (with up to **3 retry attempts**)
✔ Compiles the LaTeX into **PDF** using `pdflatex`
✔ Returns both **.tex** and **.pdf** to the Telegram user
✔ Uses a safe temporary directory and cleans up
✔ Docker-ready
✔ Self-contained and production-ready

---

## 🧠 **How It Works**

1. User sends:
   ```
   /report <Title>
   <Description>
   ```

2. Bot builds a LaTeX-focused prompt (from `prompt.js`)

3. OpenAI generates a full `.tex` file
   → If LaTeX is invalid, bot retries up to **3 times**

4. Bot saves the `.tex` in `/tmp`

5. Bot compiles it using:
   ```
   pdflatex -interaction=batchmode
   ```

6. Bot sends back:
   * `report-xxxx.pdf`
   * `report-xxxx.tex`

7. Bot removes temporary files

---

## 🛠 **Project Structure**

```
telegram-proposal-me/
│
├── bot.js                   # Main Telegram bot logic
├── prompt.js                # LaTeX generation prompt
├── docker-compose.yml       # Container orchestration
├── Dockerfile-telegrambot   # Node + TeXLive environment
├── package.json
├── .env.example
├── LICENSE
├── README.md
└── tmp/                     # Runtime generated LaTeX/PDF files
```

---

## 🚀 **Running Locally**

### **1. Install dependencies**

```bash
npm install
```

### **2. Set environment variables**

Create a `.env`:

```
PROJECT_PREFIX=telegram-proposal-me
TELEGRAM_BOT_TOKEN=your_telegram_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

### **3. Start the bot**

```bash
node bot.js
```

---

## 🐳 **Running with Docker**

### **docker-compose.yml**

```yaml
services:
  telegram-bot:
    container_name: ${PROJECT_PREFIX}_telegram_bot
    build:
      context: ./
      dockerfile: Dockerfile-telegrambot
    restart: always
    volumes:
      - ./:/app
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
```

### **Build & Run**

```bash
docker compose up --build -d
```

---

## 📦 **Dockerfile (TeXLive + Node.js)**

Includes:

* Node 20
* TeXLive full LaTeX toolchain
* Minimal editor tools

```dockerfile
FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    bash \
    nano \
    htop \
    git \
    curl \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production
COPY . .

CMD ["node", "bot.js"]
```

---

## 📄 **Bot Command Usage**

### Basic:

```
/report طراحی پلتفرم رزرو غذا برای سازمان نفت
در حال حاضر سیستم رزرو غذا سنتی است و ...
```

The bot replies with:

* **PDF report**
* **LaTeX source file**
* Any error logs if LaTeX fails

---

## 🔁 **LaTeX Retry Logic**

The bot automatically retries up to **3 times**:

```js
generateLatexWithRetry(title, description, 3)
```

If after 3 attempts OpenAI still fails → bot returns an error to the user.

---

## 🧩 **Prompt System**

`prompt.js` ensures OpenAI produces **raw**, clean **LaTeX** (no markdown, no backticks):

```text
Return ONLY the raw LaTeX code.
Start with \documentclass.
Produce a single .tex file.
```

---

## 📃 **License**

MIT License

Copyright © 2025 **Seyyed Ali Mohammadiyeh (Max Base)**
