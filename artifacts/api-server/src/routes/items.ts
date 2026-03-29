import { Router, type IRouter } from "express";
import { db, itemsTable, locationsTable } from "@workspace/db";
import { eq, ilike, or, and, type SQL } from "drizzle-orm";
import {
  CreateItemBody,
  UpdateItemBody,
  GetItemParams,
  UpdateItemParams,
  DeleteItemParams,
  ListItemsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { search, locationId, category } = ListItemsQueryParams.parse(req.query);

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(itemsTable.name, `%${search}%`),
          ilike(itemsTable.description, `%${search}%`),
          ilike(itemsTable.category, `%${search}%`)
        ) as SQL
      );
    }

    if (locationId !== undefined) {
      conditions.push(eq(itemsTable.locationId, locationId));
    }

    if (category) {
      conditions.push(ilike(itemsTable.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        description: itemsTable.description,
        category: itemsTable.category,
        locationId: itemsTable.locationId,
        notes: itemsTable.notes,
        createdAt: itemsTable.createdAt,
        location: {
          id: locationsTable.id,
          name: locationsTable.name,
          description: locationsTable.description,
          createdAt: locationsTable.createdAt,
        },
      })
      .from(itemsTable)
      .leftJoin(locationsTable, eq(itemsTable.locationId, locationsTable.id))
      .where(whereClause)
      .orderBy(itemsTable.name);

    const result = items.map((i) => ({
      ...i,
      location: i.location?.id ? i.location : null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const input = CreateItemBody.parse(req.body);
    const [item] = await db.insert(itemsTable).values(input).returning();

    let location = null;
    if (item.locationId) {
      const [loc] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, item.locationId));
      location = loc || null;
    }

    res.status(201).json({ ...item, location });
  } catch (err) {
    req.log.error({ err }, "Failed to create item");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetItemParams.parse({ id: Number(req.params.id) });

    const [item] = await db
      .select({
        id: itemsTable.id,
        name: itemsTable.name,
        description: itemsTable.description,
        category: itemsTable.category,
        locationId: itemsTable.locationId,
        notes: itemsTable.notes,
        createdAt: itemsTable.createdAt,
        location: {
          id: locationsTable.id,
          name: locationsTable.name,
          description: locationsTable.description,
          createdAt: locationsTable.createdAt,
        },
      })
      .from(itemsTable)
      .leftJoin(locationsTable, eq(itemsTable.locationId, locationsTable.id))
      .where(eq(itemsTable.id, id));

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.json({ ...item, location: item.location?.id ? item.location : null });
  } catch (err) {
    req.log.error({ err }, "Failed to get item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = UpdateItemParams.parse({ id: Number(req.params.id) });
    const input = UpdateItemBody.parse(req.body);

    const [item] = await db
      .update(itemsTable)
      .set(input)
      .where(eq(itemsTable.id, id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    let location = null;
    if (item.locationId) {
      const [loc] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, item.locationId));
      location = loc || null;
    }

    res.json({ ...item, location });
  } catch (err) {
    req.log.error({ err }, "Failed to update item");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteItemParams.parse({ id: Number(req.params.id) });
    const [deleted] = await db
      .delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
