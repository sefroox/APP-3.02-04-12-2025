import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const router = Router();

// Datei, in der die Projekte gespeichert werden
const DATA_FILE = path.join(process.cwd(), "data", "projects.json");

async function readProjects() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // Datei existiert noch nicht → leere Liste
      return [];
    }
    throw err;
  }
}

async function writeProjects(projects: any[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

// GET /api/projects → alle Projekte holen
router.get("/", async (_req, res) => {
  try {
    const projects = await readProjects();
    res.json(projects);
  } catch (err) {
    console.error("Error reading projects", err);
    res.status(500).json({ error: "Failed to read projects" });
  }
});

// POST /api/projects → komplette Projektliste speichern (Snapshot)
router.post("/", async (req, res) => {
  try {
    const projects = req.body;

    if (!Array.isArray(projects)) {
      return res
        .status(400)
        .json({ error: "Body must be an array of projects" });
    }

    await writeProjects(projects);
    res.json({ success: true });
  } catch (err) {
    console.error("Error writing projects", err);
    res.status(500).json({ error: "Failed to save projects" });
  }
});

export default router;

