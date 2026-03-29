import { Router, type IRouter } from "express";
import { db, booksTable, locationsTable } from "@workspace/db";
import { eq, ilike, or, and, isNull, type SQL } from "drizzle-orm";
import {
  CreateBookBody,
  UpdateBookBody,
  GetBookParams,
  UpdateBookParams,
  DeleteBookParams,
  ListBooksQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { search, locationId } = ListBooksQueryParams.parse(req.query);

    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(booksTable.title, `%${search}%`),
          ilike(booksTable.author, `%${search}%`)
        ) as SQL
      );
    }

    if (locationId !== undefined) {
      conditions.push(eq(booksTable.locationId, locationId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const books = await db
      .select({
        id: booksTable.id,
        title: booksTable.title,
        author: booksTable.author,
        locationId: booksTable.locationId,
        notes: booksTable.notes,
        createdAt: booksTable.createdAt,
        location: {
          id: locationsTable.id,
          name: locationsTable.name,
          description: locationsTable.description,
          createdAt: locationsTable.createdAt,
        },
      })
      .from(booksTable)
      .leftJoin(locationsTable, eq(booksTable.locationId, locationsTable.id))
      .where(whereClause)
      .orderBy(booksTable.title);

    const result = books.map((b) => ({
      ...b,
      location: b.location?.id ? b.location : null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list books");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const input = CreateBookBody.parse(req.body);
    const [book] = await db.insert(booksTable).values(input).returning();

    let location = null;
    if (book.locationId) {
      const [loc] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, book.locationId));
      location = loc || null;
    }

    res.status(201).json({ ...book, location });
  } catch (err) {
    req.log.error({ err }, "Failed to create book");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetBookParams.parse({ id: Number(req.params.id) });

    const [book] = await db
      .select({
        id: booksTable.id,
        title: booksTable.title,
        author: booksTable.author,
        locationId: booksTable.locationId,
        notes: booksTable.notes,
        createdAt: booksTable.createdAt,
        location: {
          id: locationsTable.id,
          name: locationsTable.name,
          description: locationsTable.description,
          createdAt: locationsTable.createdAt,
        },
      })
      .from(booksTable)
      .leftJoin(locationsTable, eq(booksTable.locationId, locationsTable.id))
      .where(eq(booksTable.id, id));

    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    res.json({ ...book, location: book.location?.id ? book.location : null });
  } catch (err) {
    req.log.error({ err }, "Failed to get book");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = UpdateBookParams.parse({ id: Number(req.params.id) });
    const input = UpdateBookBody.parse(req.body);

    const [book] = await db
      .update(booksTable)
      .set(input)
      .where(eq(booksTable.id, id))
      .returning();

    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    let location = null;
    if (book.locationId) {
      const [loc] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, book.locationId));
      location = loc || null;
    }

    res.json({ ...book, location });
  } catch (err) {
    req.log.error({ err }, "Failed to update book");
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteBookParams.parse({ id: Number(req.params.id) });
    const [deleted] = await db
      .delete(booksTable)
      .where(eq(booksTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete book");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
