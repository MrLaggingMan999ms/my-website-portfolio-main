import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import chatRouter from "../../routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
//disable @eslint/no-undef
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);

app.use(express.static(path.join(__dirname, "../../dist")));

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "../../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
