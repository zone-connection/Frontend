import fs from "node:fs";

const files = [
  "node_modules/@tanstack/router-generator/dist/esm/generator.js",
  "node_modules/@tanstack/router-generator/dist/cjs/generator.cjs",
];

const needle = `async getCrawlingResult() {
		await this.runPromise;
		return this.crawlingResult;
	}`;

const replacement = `async getCrawlingResult() {
		if (!this.crawlingResult) await this.run();
		else await this.runPromise;
		return this.crawlingResult;
	}`;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("if (!this.crawlingResult) await this.run()")) continue;
  if (!source.includes(needle)) {
    console.error(`Não achei getCrawlingResult em ${file}`);
    process.exit(1);
  }
  fs.writeFileSync(file, source.replace(needle, replacement));
  console.log(`Ajustei a geração de rotas em ${file}`);
}
