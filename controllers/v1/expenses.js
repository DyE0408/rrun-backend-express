import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import Groups from '../../models/groups.js';
import Users from '../../schemas/users.js'
import dotenv from "dotenv";
import { verifyToken } from "../../middlewares/auth.js";
dotenv.config();




const router = Router();
// ======================================================
// ☁️ Configuración de Cloudinary
// ======================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ======================================================
// 📸 Configuración de Multer + Cloudinary
// ======================================================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "groups", // carpeta en Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const upload = multer({ storage });


router.use(verifyToken);

// ======================================================
// Obtener Gasto por id
// ======================================================
router.get("/:groupid/expenses/:id", (req, res) => {
  console.log("Id Expense")
  console.log(req.params.id)
  Groups.getExpenseById(req.params.id, (err, expense) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error obteniendo el gasto!" });
    if (!expense) return res.status(404).json({ code: "NF", message: "Gasto no encontrado!" });
    res.json({ code: "OK", message: "Gasto encontrado!", data: { expense } });
  });
});
// ======================================================
// Enviar recordatorio
// ======================================================
router.post("/:groupId/reminder/:expenseId", (req, res) => {
  const { groupId, expenseId } = req.params;
   Groups.sendReminder(groupId, expenseId, (err, groupFound, expenseFound, notifiedCount) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error interno al enviar recordatorio" });
    if (!groupFound) return res.status(404).json({ code: "NF", message: "Grupo no encontrado" });
    if (!expenseFound) return res.status(404).json({ code: "NF", message: "Gasto no encontrado" });
    if (notifiedCount === 0)
      return res.json({ code: "OK", message: "No hay participantes pendientes de pago o sin token válido" });

    res.json({
      code: "OK",
      message: `Recordatorio enviado a ${notifiedCount} participante(s) pendiente(s)`,
    });
  });
});



export default router;