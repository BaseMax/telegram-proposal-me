export function createPromptReturnOnlyLatex(title, description) {
  return `You are a LaTeX-generating assistant.
Produce a complete, compilable LaTeX document (a single .tex file) for a professional report with this TITLE and DESCRIPTION.

Title: ${title}
Description: ${description}

Important instructions:
- Return ONLY the raw LaTeX code (no surrounding markdown, no explanations, no backticks).
- Ensure the preamble includes necessary packages (e.g., article/report, amsmath, graphicx).
- Make the document self-contained and compilable with pdflatex.
- Keep the content realistic, but brief (1–4 pages).
- If including images, don't include external images; use placeholders or omit them.

Start with \\documentclass and produce a single .tex file content only.`;
}
