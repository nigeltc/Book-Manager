import { Router, type IRouter } from "express";
import { db, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateLocationBody,
  UpdateLocationBody,
  GetLocationParams,
  UpdateLocationParams,
  DeleteLocationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const locations = await db.select().from(locationsTable).orderBy(locationsTable.name);
    res.json(locations);
  } catch (err) {
    req.log.error({ err }, "Failed to list locations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const input = CreateLocationBody.parse(req.body);
    const [location] = await db.insert(locationsTable).values(input).returning();
    res.status(201).json(location);
  } catch (err) {
    req.log.error({ err }, "Failed to create location");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetLocationParams.parse({ id: Number(req.params.id) });
    const [location] = await db.select().from(locationsTable).where(eq(locationsTable.id, id));
    if (!location) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(location);
  } catch (err) {
    req.log.error({ err }, "Failed to get location");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = UpdateLocationParams.parse({ id: Number(req.params.id) });
    const input = UpdateLocationBody.parse(req.body);
    const [location] = await db
      .update(locationsTable)
      .set(input)
      .where(eq(locationsTable.id, id))
      .returning();
    if (!location) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.json(location);
  } catch (err) {
    req.log.error({ err }, "Failed to update location");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteLocationParams.parse({ id: Number(req.params.id) });
    const [deleted] = await db
      .delete(locationsTable)
      .where(eq(locationsTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Location not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete location");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
