import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { setupSwagger } from "./swagger";
import apiRoutes from "./routes/apiRoutes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger Docs
setupSwagger(app);

// Serve static uploaded spec files
app.use("/api/specs", express.static(path.join(__dirname, "../../uploads")));

// Serve React App
app.use(express.static(path.join(__dirname, "../../frontend/dist")));

// Routes
app.use("/api", apiRoutes);

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

app.use((req: Request, res: Response) => {
  res
    .status(404)
    .sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
