import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import { successResponse, errorResponse } from "../utils/response";
import { validateOpenAPI, normalizeOpenAPI } from "../utils/normalizeOpenAPI";
import {
  buildPrompt,
  classifyQuery,
  findRelevantEndpoints,
  scoreEndpoint,
} from "../utils/queryEndpoints";
import { generateChatResponse } from "../utils/gemini";

const router = Router();
const uploadDir = path.join(__dirname, "../../../uploads");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer — save raw file temporarily; we'll keep it after validation
// Configure multer — save file in a unique subfolder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ts = Date.now();
    const subfolder = `spec-${ts}`;
    const fullPath = path.join(uploadDir, subfolder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    // Attach subfolder name locally to req for use in the route handler
    (req as any).uploadSubfolder = subfolder;
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Always persist as openapi.json within the subfolder
    cb(null, `openapi.json`);
  },
});

const isYaml = (file: Express.Multer.File) =>
  file.mimetype === "application/x-yaml" ||
  file.mimetype === "text/yaml" ||
  file.originalname.endsWith(".yaml") ||
  file.originalname.endsWith(".yml");

const isJson = (file: Express.Multer.File) =>
  file.mimetype === "application/json" || file.originalname.endsWith(".json");

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (isJson(file) || isYaml(file)) {
      cb(null, true);
    } else {
      cb(new Error("Only JSON or YAML files are allowed"));
    }
  },
});

/**
 * @swagger
 * /api/upload-openapi:
 *   post:
 *     summary: Upload an OpenAPI JSON file, validate it, and store a normalized version
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded, validated, and normalized successfully
 *       400:
 *         description: Invalid file type, missing file, or invalid OpenAPI spec
 */
router.post("/upload-openapi", (req: Request, res: Response) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return errorResponse(res, err.message, 400);
    }

    if (!req.file) {
      return errorResponse(res, "No file provided", 400);
    }

    const subfolder = (req as any).uploadSubfolder;
    const finalRawFilename = `${subfolder}/${req.file.filename}`;
    const fullRawPath = req.file.path;

    // ── 1. Parse the uploaded file (JSON or YAML) ───────────────────────────
    let parsedJson: unknown;
    try {
      const rawContent = fs.readFileSync(fullRawPath, "utf-8");
      const originalName = req.file.originalname;
      if (originalName.endsWith(".yaml") || originalName.endsWith(".yml")) {
        parsedJson = yaml.load(rawContent);
        // Re-save the file as JSON so Swagger UI can serve it
        fs.writeFileSync(fullRawPath, JSON.stringify(parsedJson, null, 2));
      } else {
        parsedJson = JSON.parse(rawContent);
      }
    } catch (error) {
      console.error(error);
      fs.unlinkSync(fullRawPath);
      // Clean up empty directory
      if (fs.readdirSync(path.dirname(fullRawPath)).length === 0) {
        fs.rmdirSync(path.dirname(fullRawPath));
      }
      return errorResponse(res, "Uploaded file is not valid JSON or YAML", 400);
    }

    // ── 2. Validate as OpenAPI 3.x ──────────────────────────────────────────
    try {
      validateOpenAPI(parsedJson);
    } catch (validationError: unknown) {
      fs.unlinkSync(fullRawPath);
      // Clean up empty directory
      if (fs.readdirSync(path.dirname(fullRawPath)).length === 0) {
        fs.rmdirSync(path.dirname(fullRawPath));
      }
      const msg =
        validationError instanceof Error
          ? validationError.message
          : "Invalid OpenAPI document";
      return errorResponse(res, msg, 400);
    }

    // ── 3. Normalize to flat search-friendly array ──────────────────────────
    const normalizedData = normalizeOpenAPI(
      parsedJson as Record<string, unknown>,
    );

    // ── 4. Save normalized file alongside the raw file ──────────────────────
    const normalizedFilename = `normalized.json`;
    const normalizedPath = path.join(uploadDir, subfolder, normalizedFilename);

    fs.writeFileSync(normalizedPath, JSON.stringify(normalizedData, null, 2));

    // ── 5. Respond ──────────────────────────────────────────────────────────
    return successResponse(
      res,
      {
        rawFile: finalRawFilename,
        normalizedFile: `${subfolder}/${normalizedFilename}`,
        endpointCount: normalizedData.length,
      },
      "OpenAPI file uploaded and normalized successfully",
    );
  });
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a chat message and get a response
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message received and processed
 *       400:
 *         description: Invalid request
 */
router.post("/chat", async (req: Request, res: Response) => {
  const { message, filename } = req.body;
  if (!message) {
    return errorResponse(res, "Message is required", 400);
  }
  if (!filename) {
    return errorResponse(res, "Filename (spec path) is required", 400);
  }

  // filename is now 'spec-timestamp/openapi.json'
  const specDir = path.dirname(path.join(uploadDir, filename));
  const normalizedPath = path.join(specDir, "normalized.json");

  const normalizedJson = await fs.promises.readFile(normalizedPath, "utf-8");

  // ── Read existing chat messages for context ─────────────────────────────
  let chatHistory: any[] = [];
  const chatDir = path.join(specDir, "chat");
  const messagesPath = path.join(chatDir, "messages.json");
  try {
    if (fs.existsSync(messagesPath)) {
      const existing = fs.readFileSync(messagesPath, "utf-8");
      chatHistory = JSON.parse(existing);
    }
  } catch (error) {
    console.error("Error reading chat history for context:", error);
  }

  const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;

  let response;
  try {
    response = await generateChatResponse(
      buildPrompt(message),
      normalizedJson,
      chatHistory,
      userApiKey,
    );
  } catch (err: any) {
    console.error("Chat error:", err);
    if (err.status === 429) {
      return errorResponse(res, err.message, 429);
    }
    if (err.status === 401) {
      return errorResponse(res, err.message, 401);
    }
    return errorResponse(
      res,
      err.message || "Failed to generate response",
      500,
    );
  }

  const { text: LLMResponse, tokensUsed } = response;

  // ── Save new chat messages ───────────────────────────────────────────────
  try {
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }

    const newUserMsg = {
      id: Date.now().toString(),
      text: message,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const newBotMsg = {
      id: (Date.now() + 1).toString(),
      text: LLMResponse,
      sender: "bot",
      timestamp: new Date().toISOString(),
      tokensUsed,
    };

    chatHistory.push(newUserMsg, newBotMsg);
    fs.writeFileSync(messagesPath, JSON.stringify(chatHistory, null, 2));
  } catch (error) {
    console.error("Error saving chat message:", error);
  }

  return successResponse(
    res,
    {
      reply: LLMResponse,
      tokensUsed,
    },
    "Message processed successfully",
  );
});

/**
 * @swagger
 * /api/chat-history/{subfolder}/{filename}:
 *   get:
 *     summary: Get chat history for a specific specification
 *     parameters:
 *       - in: path
 *         name: subfolder
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       404:
 *         description: Chat history not found
 */
router.get(
  "/chat-history/:subfolder/:filename",
  async (req: Request, res: Response) => {
    const subfolder = req.params.subfolder as string;
    const filename = req.params.filename as string;
    const messagesPath = path.join(
      uploadDir,
      subfolder,
      "chat",
      "messages.json",
    );

    if (!fs.existsSync(messagesPath)) {
      return successResponse(res, [], "No chat history found");
    }

    try {
      const data = await fs.promises.readFile(messagesPath, "utf-8");
      const messages = JSON.parse(data);
      return successResponse(
        res,
        messages,
        "Chat history retrieved successfully",
      );
    } catch (error) {
      console.error("Error reading chat history:", error);
      return errorResponse(res, "Failed to retrieve chat history", 500);
    }
  },
);

/**
 * @swagger
 * /api/chat-history/{subfolder}/{filename}:
 *   delete:
 *     summary: Clear chat history for a specific specification
 *     parameters:
 *       - in: path
 *         name: subfolder
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history cleared successfully
 *       404:
 *         description: Chat history not found
 */
router.delete(
  "/chat-history/:subfolder/:filename",
  async (req: Request, res: Response) => {
    const subfolder = req.params.subfolder as string;
    const messagesPath = path.join(
      uploadDir,
      subfolder,
      "chat",
      "messages.json",
    );

    if (!fs.existsSync(messagesPath)) {
      return successResponse(res, null, "No chat history to clear");
    }

    try {
      await fs.promises.unlink(messagesPath);
      return successResponse(res, null, "Chat history cleared successfully");
    } catch (error) {
      console.error("Error deleting chat history:", error);
      return errorResponse(res, "Failed to clear chat history", 500);
    }
  },
);

/**
 * @swagger
 * /api/file/{filename}:
 *   delete:
 *     summary: Delete an uploaded OpenAPI file and its normalized counterpart
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
router.delete("/file/:subfolder/:filename", (req: Request, res: Response) => {
  const subfolder = String(req.params.subfolder);
  const filename = String(req.params.filename);

  // Only allow deleting spec-* subfolders (safety guard)
  if (!subfolder.startsWith("spec-")) {
    return errorResponse(res, "Invalid subfolder", 400);
  }

  const folderPath = path.join(uploadDir, subfolder);

  if (!fs.existsSync(folderPath)) {
    return errorResponse(res, "File not found", 404);
  }

  try {
    // Delete the entire subfolder
    fs.rmSync(folderPath, { recursive: true, force: true });
    return successResponse(
      res,
      { filename: `${subfolder}/${filename}` },
      "File and subfolder deleted successfully",
    );
  } catch (error) {
    console.error("Delete error:", error);
    return errorResponse(res, "Failed to delete file", 500);
  }
});

export default router;
