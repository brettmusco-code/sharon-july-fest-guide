/**
 * Capacitor `cap sync` regenerates android/capacitor-cordova-android-plugins/build.gradle
 * with a flatDir {} block that triggers AGP warnings. We remove it when no local AARs
 * use flatDir resolution (fileTree for jars is enough).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const gradle = path.join(root, "android", "capacitor-cordova-android-plugins", "build.gradle");

if (!fs.existsSync(gradle)) {
  console.warn("[strip-android-flatdir] skip: file not found:", gradle);
  process.exit(0);
}

let text = fs.readFileSync(gradle, "utf8");
const pattern = /\n\s*flatDir\s*\{[^}]*\}\s*/;
if (!pattern.test(text)) {
  process.exit(0);
}

text = text.replace(pattern, "\n");
fs.writeFileSync(gradle, text);
console.log("[strip-android-flatdir] removed flatDir from capacitor-cordova-android-plugins/build.gradle");
