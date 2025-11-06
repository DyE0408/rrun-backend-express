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
// Crear nuevo grupo
// ======================================================
router.post("/", upload.single("images"), async (req, res) => {
  const imageUrl = req.file?.path || null
  const { name, description, type, members } = req.body;
  const createdBy = req.user.id;
  if (!name || !type) {
    return res.status(400).json({ code: "ER", message: "Faltan campos obligatorios (name, type)" });
  }
  let memberList = []
  if (members) {
    memberList = members
      .split(",")
      .map(id => id.trim())
      .filter(id => id !== "")
      .map(id => ({ user: id, isDeleted: false })); // <-- importante
  }

  // 👤 Agregar el creador si no está en la lista
  if (!memberList.some(m => m.user === createdBy)) {
    memberList.push({ user: createdBy, isDeleted: false });
  }

  const newGroup = {
    name,
    description,
    imageUrl,
    type,
    createdBy,
    members: memberList
  };
  return Groups.saveGroup(newGroup, (err, group) => {
    if (err) {
      return res.status(500).json({ code: 'ER', message: 'Error creando grupo!' });
    }
    res.json({ code: 'OK', message: 'Evento creado excitosamente!', data: { group } });
  });
});

// ======================================================
// 📋 Listar gruposs
// ======================================================
router.get("/", async (req, res) => {
  const id = req.user.id;
  return Groups.getAllGroups(id, (err, groups) => {
    if (err) {
      return res.status(500).json({ code: 'ER', message: 'Error obteniendo los grupos!' });
    }
    res.json({ code: 'OK', message: 'Grupos disponibles!', data: { groups } });
  });
});

// ======================================================
// 🔍 Obtener grupo por ID
// ======================================================
router.get("/:id", (req, res) => {

  Groups.getGroupById(req.params.id, (err, group) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error obteniendo grupo!" });
    if (!group) return res.status(404).json({ code: "NF", message: "Grupo no encontrado!" });
    res.json({ code: "OK", message: "Grupo encontrado!", data: { group } });
  });
});
// ======================================================
// 🗑️ Eliminar grupo
// ======================================================
router.delete("/:groupId", (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id
  Groups.deleteGroup(groupId, userId, (err, group) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error eliminando grupo!" });
    if (!group) return res.status(404).json({ code: "NF", message: "Grupo no encontrado!" });
    res.json({ code: "OK", message: "Grupo eliminado!", data: { group } });
  });
})
// ======================================================
// 💰 Agregar gasto con múltiples imágenes
// ======================================================
router.post("/:groupId/expenses", upload.array("images", 5), async (req, res) => {
  const { groupId } = req.params;
  const { description, type, totalAmount, paidBy, splitType = "Partes iguales", date = new Date().toISOString() } = req.body;

  if (!description || !type || !totalAmount || !paidBy) {
    return res.status(400).json({ code: "ER", message: "Faltan campos obligatorios del gasto" });
  }

  let participants = [];
  try {
    participants = typeof req.body.participants === "string"
      ? JSON.parse(req.body.participants)
      : req.body.participants || [];
  } catch (e) {
    return res.status(400).json({ code: "ER", message: "participants debe ser JSON válido" });
  }

  const images = req.files?.map(f => ({
    url: f.path,
    publicId: f.filename || f.public_id || null
  })) || [];

  const expense = {
    description,
    type,
    totalAmount: parseFloat(totalAmount),
    paidBy,
    splitType,
    date,
    participants,
    images,
  };

  Groups.addExpense(groupId, expense, (err, updatedGroup) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error agregando gasto!" });
    if (!updatedGroup) return res.status(404).json({ code: "NF", message: "Grupo no encontrado!" });

    // 🔔 Llamada asíncrona a notificaciones (no bloquea respuesta)
    Groups.sendExpenseNotification(groupId, expense, updatedGroup, "new_expense", (errNotif) => {
      if (errNotif) console.error("⚠️ Error al enviar notificación:", errNotif);
    });

    res.json({
      code: "OK",
      message: "Gasto agregado correctamente",
      data: { updatedGroup },
    });
  });
});

// ======================================================
// 🗑️ Eliminar gasto (y sus imágenes en Cloudinary)
// ======================================================
router.delete("/:groupId/expenses/:expenseId", async (req, res) => {
  const { groupId, expenseId } = req.params;

  Groups.getGroupById(groupId, async (err, group) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error buscando grupo!" });
    if (!group) return res.status(404).json({ code: "NF", message: "Grupo no encontrado!" });

    const expense = group.expenses.find(e => String(e._id) === String(expenseId));
    if (!expense) return res.status(404).json({ code: "NF", message: "Gasto no encontrado!" });

    // borrar imágenes asociadas
    for (const img of expense.images) {
      if (img.publicId) {
        try {
          await cloudinary.uploader.destroy(img.publicId);
        } catch (cloudErr) {
          console.warn("⚠️ No se pudo eliminar imagen Cloudinary:", cloudErr.message);
        }
      }
    }

    Groups.deleteExpense(groupId, expenseId, (err2, result) => {
      if (err2) return res.status(500).json({ code: "ER", message: "Error eliminando gasto!" });
      res.json({ code: "OK", message: "Gasto eliminado correctamente!", data: result });
    });
  });
});



// ======================================================
// 👥 Agregar participante
// ======================================================
router.post("/:groupId/expenses/:expenseId/participants", (req, res) => {
  const { groupId, expenseId } = req.params;
  const participant = req.body;

  Groups.addParticipant(groupId, expenseId, participant, (err, result) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error agregando participante!" });
    res.json({ code: "OK", message: "Participante agregado correctamente!", data: result });
  });
});

// ======================================================
// ❌ Eliminar participante
// ======================================================
router.put("/:groupId/expenses/:expenseId/participant/delete", (req, res) => {
  const { groupId, expenseId } = req.params;
  const { participantId, isDeleted } = req.body;

  Groups.deleteParticipant(groupId, expenseId, participantId, isDeleted, (err, result) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error eliminando participante!" });
    res.json({ code: "OK", message: "Participante eliminado correctamente!", data: result });
  });
});



// ======================================================
// Editar grupo
// ======================================================
router.put("/:groupId/", upload.single("images"), (req, res) => {
  const imageUrl = req.file?.path || null
  const { name, description, type } = req.body;
  const { groupId } = req.params;
  let updateData = {}
  if (imageUrl != null) {
    updateData = {
      name,
      description,
      imageUrl,
      type
    };
  } else {
    updateData = {
      name,
      description,
      type
    };
  }

  if (!groupId) {
    return res.status(400).json({ code: "ER", message: "Faltan datos obligatorios" });
  }

  Groups.editGroup(groupId, updateData, (err, result) => {
    if (err) {
      console.log("hola")
      return res.status(500).json({ code: "ER", message: "Error al actualizar el grupo" });
    }
    if (!result) return res.status(404).json({ code: "NF", message: "Grupo no encontrado" });
    res.json({ code: "OK", message: "Grupo actualizado correctamente!", data: result });
  });
});

// ======================================================
// Obtener los miembros de un grupo por groupId
// ======================================================
router.get("/:groupId/members", (req, res) => {

  Groups.getAllMembers(req.params.groupId, (err, members) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error obteniendo miembros!" });
    if (!members) return res.status(404).json({ code: "NF", message: "Grupo no encontrado!" });
    res.json({ code: "OK", message: "Miembros!", data: { members } });
  });
})

// ======================================================
// Añadir miembro a un grupo por groupId
// ======================================================
router.post("/:groupId/members", (req, res) => {
  console.log("HOLA")
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!groupId || !userId) {
    return res.status(400).json({
      code: "ER",
      message: "Faltan datos obligatorios (groupId o userId)",
    });
  }
  Groups.addMember(groupId, userId, (err, updatedGroup) => {
    if (err) {
      logger?.error?.(`❌ Error al agregar miembro: ${err.message}`);
      return res.status(500).json({ code: "ER", message: err.message });
    }

    return res.json({
      code: "OK",
      message: "✅ Miembro agregado correctamente al grupo",
      data: updatedGroup,
    });
  });
});

// ======================================================
// ❌ Eliminar miembro a un grupo por groupId
// ======================================================
router.put("/:groupId/members/delete", (req, res) => {
  const { groupId } = req.params;
  const { memberId, isDeleted } = req.body;

  Groups.deleteMember(groupId, memberId, isDeleted, (err, result) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error eliminando miembro!" });
    res.json({ code: "OK", message: "Miembro eliminado correctamente!", data: result });
  });
});
//===================================================================NUEVO====================================================

// ======================================================
// Actualizar participante ya pago
// ======================================================
router.put("/:groupId/expenses/:expenseId/participantPaid", (req, res) => {
  const { groupId, expenseId } = req.params;
  const { participantId, paid } = req.body;
  if (!groupId || !expenseId || !participantId) {
    return res.status(400).json({ code: "ER", message: "Faltan datos obligatorios" });
  }

  Groups.updatePayExpense(groupId, expenseId, participantId, paid, (err, result) => {
    if (err) {
      return res.status(500).json({ code: "ER", message: "Error al actualizar el estado de pago" });
    }
    if (!result) return res.status(404).json({ code: "NF", message: "Participante no encontrado" });
    res.json({ code: "OK", message: "Estado de pago actualizado correctamente!", data: result });
  });
});




router.put("/:groupId/expenses/:expenseId", upload.array("images", 5), async (req, res) => {
  const { groupId, expenseId } = req.params;

  // Campos de texto
  const { description, type, totalAmount, splitType, date } = req.body;

  // participants e imagesToRemove llegan como string JSON desde Android
  let participants = [];
  let imagesToRemove = [];

  try {
    if (typeof req.body.participants === "string") {
      participants = JSON.parse(req.body.participants);
    } else if (Array.isArray(req.body.participants)) {
      participants = req.body.participants;
    }
  } catch (e) {
    return res.status(400).json({ code: "ER", message: "participants debe ser JSON válido" });
  }

  try {
    if (typeof req.body.imagesToRemove === "string") {
      imagesToRemove = JSON.parse(req.body.imagesToRemove);
    } else if (Array.isArray(req.body.imagesToRemove)) {
      imagesToRemove = req.body.imagesToRemove;
    }
  } catch (e) {
    return res.status(400).json({ code: "ER", message: "imagesToRemove debe ser JSON válido" });
  }

  // Nuevas imágenes (ya subidas por CloudinaryStorage)
  const imagesNew = (req.files || []).map(f => ({
    url: f.path,                 // URL segura
    publicId: f.filename || null // public_id en CloudinaryStorage
  }));
  const actorUserId =req.user.id

  const updateData = {
    description,
    type,
    totalAmount,
    splitType,
    date,
    participants,    // arreglo ya parseado
    imagesNew,       // nuevas imágenes a añadir
    imagesToRemove,  // publicIds a eliminar
  };

  return Groups.updateExpense(groupId, expenseId, updateData, actorUserId ,(err, updatedGroup) => {
    if (err) {
      return res.status(500).json({ code: "ER", message: err.message || "Error actualizando gasto!" });
    }
    if (!updatedGroup) {
      return res.status(404).json({ code: "NF", message: "Grupo o gasto no encontrado!" });
    }

    // Opcional: también puedes devolver solo el expense actualizado
    const expense = updatedGroup.expenses.find(e => String(e._id) === String(expenseId));

    return res.json({
      code: "OK",
      message: "Gasto actualizado correctamente",
      data: { group: updatedGroup, expense }
    });
  });
});
export default router;