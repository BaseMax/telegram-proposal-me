/**
 * 
 * @date: 12/05/2025
 * @name: telegram-proposal-me
 * @repository: https://github.com/BaseMax/telegram-proposal-me
 * @author: Seyyed Ali Mohammadiyeh (Max Base)
 * @description:
 * - receives a title + description
 * - asks OpenAI for LaTeX code
 * - compiles LaTeX -> PDF with pdflatex
 * - sends both .tex and .pdf to the Telegram user
 * 
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { Telegraf } from "telegraf";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

import { createPromptReturnOnlyLatex } from './prompt.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN || !OPENAI_KEY) {
  console.error("Set TELEGRAM_BOT_TOKEN and OPENAI_API_KEY in .env");
  process.exit(1);
}

const bot = new Telegraf(TELEGRAM_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

const tmpDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

function writeFileSyncAtomic(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: "utf-8" });
}

async function generateLatexWithRetry(title, description, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Calling OpenAI for LaTeX...`);

      const prompt = createPromptReturnOnlyLatex(title, description);

      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that outputs valid LaTeX documents." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      });

      const latex = resp.choices?.[0]?.message?.content || "";

      if (!latex.includes("\\documentclass")) {
        throw new Error("OpenAI returned invalid LaTeX.");
      }

      return latex;
    } catch (err) {
      console.error(`OpenAI LaTeX generation failed on attempt ${attempt}:`, err.message);

      if (attempt === maxAttempts) throw err;
    }
  }
}

async function runPdflatex(texFilePath, cwd) {
  const runOnce = () =>
    new Promise((resolve, reject) => {
      const proc = spawn("pdflatex", ["-interaction=batchmode", path.basename(texFilePath)], { cwd });

      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", d => (stdout += d.toString()));
      proc.stderr?.on("data", d => (stderr += d.toString()));

      proc.on("close", code => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`pdflatex exited ${code}\n${stderr}\n${stdout}`));
      });

      proc.on("error", err => reject(err));
    });

  await runOnce();
  await runOnce();
  return;
}

bot.command("report", async (ctx) => {
  try {
    const text = ctx.message.text || "";
    const payload = text.replace(/^\/report\s*/i, "").trim();

    let title, description;
    const firstLine = payload.split("\n")[0].trim();
    if (payload.includes("\n")) {
      title = firstLine || "Report";
      description = payload.split("\n").slice(1).join("\n").trim() || "No description provided.";
    } else if (payload.length > 0) {
      title = payload;
      description = "Please provide description in the same message after newline or run again.";
    } else {
      await ctx.reply("Usage: /report <Title>\\n<Description>.");
      return;
    }

    await ctx.reply(`Got it — generating LaTeX for "${title}"... This may take a few seconds.`);

    let latexContent;
    try {
      latexContent = await generateLatexWithRetry(title, description, 3);
    } catch (err) {
      await ctx.reply("OpenAI failed to produce valid LaTeX after 3 attempts.\n" + err.message);
      return;
    }

    const id = uuidv4();
    const texFilename = `report-${id}.tex`;
    const pdfFilename = `report-${id}.pdf`;
    const workdir = tmpDir;

    const texPath = path.join(workdir, texFilename);
    writeFileSyncAtomic(texPath, latexContent);

    try {
      await runPdflatex(texPath, workdir);
    } catch (err) {
      await ctx.reply("Failed to compile LaTeX after generation.\nSending .tex and the error:");
      await ctx.replyWithDocument({ source: fs.createReadStream(texPath), filename: texFilename });
      await ctx.reply("Error: " + String(err.message).slice(0, 1000));
      return;
    }

    const pdfPath = path.join(workdir, pdfFilename);
    const generatedPdfPath = texPath.replace(/\.tex$/, ".pdf");

    if (!fs.existsSync(generatedPdfPath)) {
      await ctx.reply("PDF not found after compilation. Sending .tex for inspection.");
      await ctx.replyWithDocument({ source: fs.createReadStream(texPath), filename: texFilename });
      return;
    }

    await ctx.reply("Here's your report:");
    await ctx.replyWithDocument({ source: fs.createReadStream(generatedPdfPath), filename: pdfFilename });
    await ctx.replyWithDocument({ source: fs.createReadStream(texPath), filename: texFilename });

    try {
      fs.unlinkSync(texPath);
      fs.unlinkSync(generatedPdfPath);
      const aux = texPath.replace(/\.tex$/, ".aux");
      const log = texPath.replace(/\.tex$/, ".log");
      if (fs.existsSync(aux)) fs.unlinkSync(aux);
      if (fs.existsExists(log)) fs.unlinkSync(log);
    } catch (e) {
      console.warn("Cleanup failed:", e);
    }
  } catch (err) {
    console.error(err);
    await ctx.reply("Internal error: " + String(err.message).slice(0, 1000));
  }
});

bot.on("text", async (ctx) => {
});

bot.launch().then(() => {
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
