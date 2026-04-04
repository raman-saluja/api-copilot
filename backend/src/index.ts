import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { setupSwagger } from "./swagger";
import apiRoutes from "./routes/apiRoutes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger Docs
setupSwagger(app);

// Serve static uploaded spec files
app.use("/api/specs", express.static(path.join(__dirname, "../../uploads")));

// Routes
app.use("/api", apiRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send(
    "Welcome to the API Copilot Backend. Check /api-docs for Swagger UI.",
  );
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
