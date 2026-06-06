import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signscopeRouter from "./signscope";

const router: IRouter = Router();

router.use(healthRouter);
router.use(signscopeRouter);

export default router;
