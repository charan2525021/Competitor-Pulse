import { Router } from "express";
import {
  signup,
  login,
  verify,
  resendVerification,
  me,
  googleRedirect,
  googleCallback,
} from "../controllers/auth.controller";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify", verify);
router.post("/resend-verification", resendVerification);
router.get("/me", me);
router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);

export default router;
