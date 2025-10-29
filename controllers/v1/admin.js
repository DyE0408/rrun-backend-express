import express from "express";
import GroupsSchema from "../../schemas/groups.js";
const { Group } = GroupsSchema;

const router = express.Router();

// ⚙️ Endpoint para añadir isDeleted=false a todos los participantes existentes
router.put("/fix-participants-isdeleted", async (req, res) => {
  try {
    const result = await Group.updateMany(
      { "expenses.participants.isDeleted": { $exists: false } },
      { $set: { "expenses.$[].participants.$[].isDeleted": false } }
    );

    return res.json({
      code: "OK",
      message: `✅ Se actualizaron ${result.modifiedCount} grupos. Todos los participantes ahora tienen isDeleted: false`
    });
  } catch (err) {
    console.error("❌ Error al actualizar participantes:", err);
    return res.status(500).json({
      code: "ER",
      message: "Error al actualizar los participantes",
      error: err.message
    });
  }
});

export default router;