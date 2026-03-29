import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import locationsRouter from "./locations";
import booksRouter from "./books";
import itemsRouter from "./items";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/locations", locationsRouter);
router.use("/books", booksRouter);
router.use("/items", itemsRouter);

export default router;
