import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./App.css";
import "./styles/layout-fixes.css";

createRoot(document.getElementById("root")!).render(<App />);
