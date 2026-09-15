// Genera docs/manual/Guia_de_uso_NemediClinic.pdf
//   1. pandoc: MANUAL_USUARIO.md → HTML autocontenido (--toc, imágenes embebidas, guia.css)
//   2. Chrome headless imprime el HTML a PDF (A4, sin cabecera/pie del navegador)
// No hay motor LaTeX en la máquina; Chrome hace de motor PDF.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("docs/manual");
const md = resolve(dir, "MANUAL_USUARIO.md");
const html = resolve(dir, "Guia_de_uso_NemediClinic.html");
const pdf = resolve(dir, "Guia_de_uso_NemediClinic.pdf");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

execFileSync("pandoc", [
  md, "-o", html, "--standalone", "--embed-resources", "--toc", "--toc-depth=2",
  `--resource-path=${dir}`, `--css=${resolve(dir, "guia.css")}`, "--metadata", "lang=es",
], { stdio: "inherit" });

if (existsSync(pdf)) unlinkSync(pdf);
const r = spawnSync(CHROME, [
  "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
  "--virtual-time-budget=20000", `--print-to-pdf=${pdf}`, `file:///${html.replace(/\\/g, "/")}`,
], { encoding: "utf8" });
if (!existsSync(pdf)) { console.error(r.stderr); throw new Error("Chrome no generó el PDF"); }

const bytes = readFileSync(pdf);
const text = bytes.toString("latin1");
const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
const images = (text.match(/\/Subtype\s*\/Image/g) ?? []).length;
console.log(`PDF: ${pdf}\n  tamaño: ${(statSync(pdf).size / 1024 / 1024).toFixed(1)} MB · páginas: ${pages} · imágenes embebidas: ${images}`);
