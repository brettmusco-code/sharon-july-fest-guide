import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initStatusBar, hideSplash } from "./lib/native";

// Brand the native chrome before first paint where possible.
initStatusBar();

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash once React has had a tick to mount.
requestAnimationFrame(() => {
  setTimeout(() => {
    hideSplash();
  }, 150);
});
