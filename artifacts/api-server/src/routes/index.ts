import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import locationsRouter from "./locations";
import booksRouter from "./books";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/locations", locationsRouter);
router.use("/books", booksRouter);

export default router;
