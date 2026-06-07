import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import signscopeRouter from "./signscope.js";
import requestCheckRouter from "./requestCheck.js";
import aiStatusRouter from "./aiStatus.js";
import dmkRouter from "./dmk.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/request-check", requestCheckRouter);
router.use("/ai", aiStatusRouter);
router.use("/dmk", dmkRouter);
router.use(signscopeRouter);

export default router;
