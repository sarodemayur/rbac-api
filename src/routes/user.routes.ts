import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

router.get("/profile", authenticate, (req, res) => {
  res.json({
    message: "Profile fetched successfully",
    user: req.authUser,
  });
});

router.get("/admin", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome, admin!" });
});

router.get(
  "/reports",
  authenticate,
  authorize("admin", "manager"),
  (req, res) => {
    res.json({ message: "Reports retrieved successfully" });
  },
);

export default router;
