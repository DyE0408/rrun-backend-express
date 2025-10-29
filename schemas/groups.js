import mongoose from "mongoose";
import logger from '../utils/logger.js';
import UsersSchema from './users.js';
import { sendPushNotification } from "../utils/firebase.js";


const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isDeleted: { type: Boolean, default: false }
});

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amountOwed: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
})

const expenseImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true }
});

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["Alimentación", "Transporte", "Servicios", "Ocio", "Otros"],
    default: "Otros"
  },
  totalAmount: { type: Number, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  splitType: { type: String, enum: ["Partes iguales", "Partes desiguales", "Porcentaje"], default: "Partes iguales" },
  participants: [participantSchema],
  images: [expenseImageSchema],
  date: { type: Date, default: Date.now }
})

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["Hogar", "Viaje", "Trabajo", "Pareja", "Otros"],
      default: "Otros"
    },
    description: String,
    imageUrl: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    members: [memberSchema],
    expenses: [expenseSchema]
  },
  { timestamps: true }
)

const Group = mongoose.model("Group", groupSchema)

// ========================================================
// 💾 Crear grupo
// ========================================================
const saveGroup = (grupo, callback) => {

  const { name, description, imageUrl, createdBy, members, type } = grupo;

  const newGroup = new Group({
    name,
    description,
    imageUrl,
    createdBy,
    members,
    type
  });
  newGroup.save().then(() => {
    logger.info("Nuevo grupo creado!")
    return callback(null, newGroup);
  })
    .catch(err => {
      logger.error(`Error al crear grupo con error: ${err.message}`)
      return callback(err);
    });
}
// ========================================================
// 💾 Editar grupo
// ========================================================
const editGroup = (groupId, updateData, callback) => {

  const { name, description, imageUrl, type } = updateData;

  // Solo permitimos estos campos
  const allowedFields = ["name", "type", "description", "imageUrl"];
  const fieldsToUpdate = {};

  for (const key of allowedFields) {
    if (updateData[key] !== undefined) {
      fieldsToUpdate[key] = updateData[key];
    }
  }

  // Si no hay campos válidos
  if (Object.keys(fieldsToUpdate).length === 0) {
    logger.warn(`⚠️ No se proporcionaron campos válidos para actualizar el grupo ${groupId}`);
    return callback(new Error("No se proporcionaron campos válidos para actualizar."));
  }

  Group.updateOne(
    { _id: groupId },
    { $set: fieldsToUpdate }
  )
    .then(result => {
      if (result.modifiedCount === 0) {
        logger.warn(`⚠️ No se encontró el grupo o no hubo cambios en ${groupId}`);
        return callback(null, null);
      }
      logger.info(`✅ Grupo ${groupId} actualizado correctamente.`);
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`❌ Error al actualizar grupo: ${err.message}`);
      return callback(err);
    });
}
// ========================================================
// 📋 Obtener todos los grupos
// ========================================================
const findAllGroups = (id, callback) => {

  Group.find({ "members.user": id })
    .populate("createdBy", "name")
    .populate("members.user", "name email")
    .populate("expenses.paidBy", "name email")
    .populate("expenses.participants.user", "name email isDeleted")
    .lean()
    .then(results => {
      logger.info(`📋 Se encontraron ${results.length} grupos para el usuario ${id}.`);
      return callback(null, results);
    })
    .catch(err => {
      logger.error(`❌ Error al obtener grupos: ${err.message}`);
      return callback(err);
    });
};

// ========================================================
// Buscar grupo por ID
// ========================================================
const findGroupById = (id, callback) => {
  console.log("HELLO")
  Group.findById(id)
    .populate("createdBy", "name email")
    .populate("members", "name email")
    .populate("members.user", "name email")
    .populate("expenses.paidBy", "name email")
    .populate("expenses.participants.user", "name email")
    .then(result => {
      if (!result) {
        logger.warn(`⚠️ Grupo no encontrado con ID: ${id}`);
        return callback(null, null);
      }
      logger.info(`🔍 Grupo encontrado: ${result.name}`);
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`Error al buscar grupo por ID: ${err.message}`);
      return callback(err);
    });
};

// ========================================================
// ➕ Agregar un gasto a un grupo
// ========================================================
const addExpense = (groupId, expenseData, callback) => {
  const { description, totalAmount, type, paidBy, splitType, participants } = expenseData;

  if (!description || !type || !totalAmount || !paidBy) {
    const error = new Error("Datos incompletos para crear gasto.");
    logger.warn(error.message);
    return callback(error);
  }

  Group.findById(groupId)
    .then(group => {
      if (!group) {
        logger.warn(`⚠️ Grupo no encontrado con ID: ${groupId}`);
        return callback(null, null);
      }

      // Añadir nuevos participantes al grupo
      for (const participant of participants) {
        const participantId = participant.user;
        const exists = group.members.some(m => m.user._id.toString() === participantId && !m.isDeleted);


        if (!exists) {
          logger.info(`👥 Añadiendo participante ${participantId} al grupo ${group.name}`);
          group.members.push({ user: participantId });
        }
      }

      const payerId = paidBy;

      // ⚠️ RETORNAMOS la promesa aquí
      return UsersSchema.User.findById(payerId).populate("contacts").then(payer => {
        if (!payer) {
          const error = new Error(`Usuario que paga no encontrado: ${payerId}`);
          logger.error(error.message);
          throw error; // <--- importante para que el catch lo capture
        }

        for (const participant of participants) {
          const participantId = participant.user;
          if (participantId != payerId) {
            if (participantId.toString() === payerId.toString()) continue;

            const isContact = payer.contacts.some(
              c => c._id.toString() === participantId.toString()
            );

            if (!isContact) {
              logger.info(`👤 Agregando ${participantId} como contacto de ${payer.name}`);
              UsersSchema.addContact(payerId, participantId, () => { });
            }
          }
        }

        group.expenses.push(expenseData);

        // Retorna la promesa del guardado
        return group.save();
      });
    })
    .then(updatedGroup => {
      logger.info(`💰 Nuevo gasto agregado al grupo ${updatedGroup.name}`);
      return callback(null, updatedGroup);
    })
    .catch(err => {
      logger.error(`❌ Error al agregar gasto: ${err.message}`);
      return callback(err);
    });
};


const sendExpenseNotification = async (groupId, expense, updatedGroup = null, type = "new_expense", callback) => {
  try {
    if (!expense || !expense.participants || !expense.paidBy) {
      console.warn("⚠️ Datos de gasto incompletos");
      return callback?.(null, null);
    }

    // 🔍 Filtrar solo participantes que no han pagado (en ambos casos)
    const validParticipants = expense.participants.filter(
      (p) =>
        p?.user &&
        p.user.toString() !== expense.paidBy.toString() &&
        p.paid === false
    );

    if (validParticipants.length === 0) {
      console.warn("⚠️ No hay participantes válidos para notificar");
      return callback?.(null, null);
    }

    // 🔹 Buscar los usuarios con token FCM
    const userIds = validParticipants.map((p) => p.user.toString());
    const users = await UsersSchema.User.find(
      {
        _id: { $in: userIds },
        fcmToken: { $exists: true, $ne: null },
      },
      "fcmToken name"
    ).lean();

    if (!users || users.length === 0) {
      console.warn("⚠️ Ningún usuario con token FCM válido");
      return callback?.(null, null);
    }

    // 🧾 Obtener el ID del gasto
    const expenseId =
      updatedGroup?.expenses?.slice(-1)[0]?._id?.toString() ||
      expense._id?.toString() ||
      null;

    // 💬 Mensaje según el tipo
    const sendPromises = users.map((user) => {
      const participant = validParticipants.find(
        (p) => p.user.toString() === user._id.toString()
      );

      const amount = participant?.amountOwed?.toFixed(2) || expense.totalAmount;

      let title, body;
      if (type === "payment_reminder") {
        title = "Recordatorio de pago pendiente";
        body = `${user.name}, recuerda que debes pagar $${amount} por el gasto: "${expense.description}"`;
      } else {
        title = "Nuevo gasto agregado";
        body = `${user.name}, nuevo gasto: ${expense.description}, debes pagar $${amount} `;
      }

      const data = {
        groupId: groupId.toString(),
        type,
        expenseId,
      };

      return sendPushNotification([user.fcmToken], title, body, data);
    });

    await Promise.all(sendPromises);

    console.log(`✅ Notificaciones (${type}) enviadas a ${users.length} usuarios`);
    callback?.(null, users);
  } catch (error) {
    console.error("❌ Error en sendExpenseNotification:", error);
    callback?.(error);
  }
};

const sendNotification = async (groupId, expense, updatedGroup, callback) => {
  try {
    if (!expense || !expense.participants || !expense.paidBy) {
      console.warn("⚠️ Datos de gasto incompletos");
      return callback(null, null);
    }

    // 🔍 Obtener los participantes (excepto quien pagó)
    const validParticipants = expense.participants.filter(
      (p) =>
        p?.user &&
        p.user.toString() !== expense.paidBy.toString() &&
        p.paid === false
    );

    if (validParticipants.length === 0) {
      console.warn("⚠️ No hay participantes válidos para notificar");
      return callback(null, null);
    }

    // 🔹 Buscar todos los usuarios que tengan token
    const userIds = validParticipants.map((p) => p.user.toString());
    const users = await UsersSchema.User.find(
      {
        _id: { $in: userIds },
        fcmToken: { $exists: true, $ne: null },
      },
      "fcmToken name"
    ).lean();

    if (!users || users.length === 0) {
      console.warn("⚠️ Ningún usuario con token FCM válido");
      return callback(null, null);
    }

    // 🧾 Identificar el último gasto agregado
    const lastExpense = updatedGroup?.expenses?.slice(-1)[0];
    const expenseId = lastExpense ? lastExpense._id.toString() : expense._id.toString();


    console.log("Participantes")
    console.log(validParticipants)
    // 💬 Enviar notificación personalizada por usuario
    const sendPromises = users.map((user) => {
      const participant = validParticipants.find(
        (p) => p.user.toString() === user._id.toString()
      );
      console.log("participant")
      console.log(participant)
      const amount = participant?.amountOwed?.toFixed(2) || expense.totalAmount;
      const paidStatus = participant?.paid ? "ya pagaste ✅" : `debes pagar $${amount}`;

      const title = "Nuevo gasto agregado";
      const body = `${user.name}, nuevo gasto: ${expense.description}, ${paidStatus}`;

      const data = {
        groupId: groupId.toString(),
        type: "new_expense",
        expenseId,
      };

      return sendPushNotification([user.fcmToken], title, body, data);
    });

    await Promise.all(sendPromises);

    console.log(`✅ Notificaciones personalizadas enviadas a ${users.length} usuarios`);
    callback(null, users);
  } catch (error) {
    console.error("❌ Error en sendNotification:", error);
    callback(error);
  }
};
// ========================================================
// ❌ Eliminar un gasto
// ========================================================
const deleteExpense = (groupId, expenseId, callback) => {
  Group.updateOne(
    { _id: groupId },
    { $pull: { expenses: { _id: expenseId } } }
  )
    .then(result => {
      logger.info(`🗑️ Gasto eliminado del grupo ${groupId}`);
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`❌ Error al eliminar gasto: ${err.message}`);
      return callback(err);
    });
};

// ========================================================
// ❌ Eliminar un participante dentro de un gasto
// ========================================================
const deleteParticipant = (groupId, expenseId, participantId, isDeleted, callback) => {
  Group.updateOne(
    {
      _id: groupId,
      "expenses._id": expenseId,
      "expenses.participants._id": participantId
    },
    {
      $set: {
        "expenses.$[expense].participants.$[participant].isDeleted": isDeleted
      }
    },
    {
      arrayFilters: [
        { "expense._id": expenseId },
        { "participant._id": participantId }
      ]
    }
  )
    .then(result => {
      if (result.modifiedCount > 0) {
        logger.info(`🟡 Participante ${participantId} marcado como eliminado en el gasto ${expenseId}`);
      } else {
        logger.warn(`⚠️ No se encontró el participante ${participantId} en el gasto ${expenseId}`);
      }
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`❌ Error al eliminar (soft delete) participante: ${err.message}`);
      return callback(err);
    });
};

// ========================================================
// 🧾 Agregar un participante a un gasto existente
// ========================================================
const addParticipant = (groupId, expenseId, participantData, callback) => {
  Group.findOneAndUpdate(
    { _id: groupId, "expenses._id": expenseId },
    { $push: { "expenses.$.participants": participantData } },
    { new: true }
  )
    .populate("expenses.participants.user", "name email")
    .then(result => {
      if (!result) {
        logger.warn(`⚠️ No se encontró el gasto ${expenseId} en el grupo ${groupId}`);
        return callback(null, null);
      }
      logger.info(`✅ Participante agregado al gasto ${expenseId}`);
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`❌ Error al agregar participante: ${err.message}`);
      return callback(err);
    });
};



const findAllMembers = (groupId, callback) => {
  Group.findById(groupId)
    .populate("members.user", "_id name email") // Trae solo nombre y correo
    .select("members") // Solo el campo members del grupo
    .lean()
    .then(group => {
      if (!group) {
        logger.warn(`⚠️ No se encontró el grupo con ID: ${groupId}`);
        return callback(new Error("Grupo no encontrado"));
      }

      // group.members es el arreglo de usuarios
      logger.info(`📋 Se encontraron ${group.members.length} miembros en el grupo ${groupId}.`);
      return callback(null, group.members);
    })
    .catch(err => {
      logger.error(`❌ Error al obtener miembros del grupo: ${err.message}`);
      return callback(err);
    });

}

// ======================================================
// Añadir miembro a un grupo por groupId
// ======================================================
const addMember = (groupId, userId, callback) => {
  Group.findById(groupId)
    .then(group => {
      if (!group) {
        return callback(new Error("Grupo no encontrado"));
      }

      // Buscar si el usuario ya está en la lista de miembros
      const existingMember = group.members.find(
        m => m.user.toString() === userId.toString()
      );

      if (existingMember) {
        if (existingMember.isDeleted) {
          // Si estaba "eliminado", lo reactivamos
          existingMember.isDeleted = false;
          return group.save().then(updated => callback(null, updated));
        } else {
          // Ya está activo
          return callback(new Error("El usuario ya es miembro activo del grupo"));
        }
      }

      // Si no existe, lo agregamos como nuevo miembro
      group.members.push({ user: userId, isDeleted: false });
      return group.save().then(updated => callback(null, updated));
    })
    .catch(err => {
      console.error(`❌ Error al agregar miembro: ${err.message}`);
      return callback(err);
    });
};

const deleteMember = (groupId, memberId, isDeleted, callback) => {
  Group.findById(groupId)
    .then(group => {
      if (!group) {
        return callback(new Error("Grupo no encontrado"));
      }

      // Buscar si el usuario ya está en la lista de miembros
      const existingMember = group.members.find(
        m => m.user.toString() === memberId.toString()
      );
      if (!existingMember) {
        return callback(new Error("Miembro no encontrado en el grupo"));
      }

      // 🔍 Verificar si el usuario participa en algún gasto
      const participatesInExpenses = group.expenses.some(expense =>
        expense.participants.some(
          p => p.user.toString() === memberId.toString() && !p.isDeleted
        )
      );

      if (participatesInExpenses) {
        // Si participa en algún gasto → marcar como eliminado
        existingMember.isDeleted = true;
        console.log(`⚠️ Miembro ${memberId} marcado como eliminado (aún tiene gastos en el grupo ${groupId}).`);
      } else {
        // Si no participa en ningún gasto → eliminarlo del array
        group.members = group.members.filter(
          m => m.user.toString() !== memberId.toString()
        );
        console.log(`🗑️ Miembro ${memberId} eliminado completamente del grupo ${groupId}.`);
      }

      return group.save().then(updatedGroup => callback(null, updatedGroup));
    })
    .catch(err => {
      console.error(`❌ Error al eliminar miembro: ${err.message}`);
      callback(err);
    });
};

const deleteGroup = (groupId, userId, callback) => {
  Group.findById(groupId)
    .then(group => {
      if (!group) {
        return callback(new Error("Grupo no encontrado"));
      }
      if (group.createdBy.toString() !== userId.toString()) {
        console.log("❌ Usuario no autorizado para eliminar este grupo");
        return callback(new Error("Usuario no autorizado para eliminar este grupo"));
      }
      return group.deleteOne().then(deleteGrupo => {
        console.log("✅ Grupo eliminado");
        callback(null, deleteGrupo)
      });
    })
    .catch(err => {
      console.error(`❌ Error al eliminar miembro: ${err.message}`);
      callback(err);
    });


}





//===================================================Nuevos

// ======================================================
// Obtener Gasto por id
// ======================================================
const findExpenseById = (expenseId, callback) => {
  Group.findOne({ "expenses._id": expenseId })
    .populate("createdBy", "name email")
    .populate("members.user", "name email")
    .populate("expenses.paidBy", "name email")
    .populate("expenses.participants.user", "name email isDeleted")
    .lean()
    .then(group => {
      if (!group) {
        logger.warn(`⚠️ No se encontró ningún grupo que contenga el gasto con ID: ${expenseId}`);
        return callback(null, null);
      }

      // Buscar el gasto específico dentro del grupo
      const expense = group.expenses.find(
        e => e._id.toString() === expenseId.toString()
      );

      if (!expense) {
        logger.warn(`⚠️ No se encontró el gasto con ID: ${expenseId} dentro del grupo ${group.name}`);
        return callback(null, null);
      }

      logger.info(`💰 Gasto encontrado (${expense.description}) en el grupo "${group.name}"`);
      return callback(null, expense);
    })
    .catch(err => {
      logger.error(`❌ Error al obtener gasto por ID (${expenseId}): ${err.message}`);
      return callback(err);
    });
};

// ========================================================
// 💸 Actualizar el estado de pago de un participante
// ========================================================
const updatePayExpense = (groupId, expenseId, participantId, paid, callback) => {
  Group.updateOne(
    { _id: groupId, "expenses._id": expenseId, "expenses.participants.user": participantId },
    { $set: { "expenses.$[e].participants.$[p].paid": paid } },
    {
      arrayFilters: [
        { "e._id": new mongoose.Types.ObjectId(expenseId) },
        { "p.user": new mongoose.Types.ObjectId(participantId) }
      ]
    }
  )
    .then(result => {
      if (result.modifiedCount === 0) {
        logger.warn(`⚠️ No se encontró el participante ${participantId} en el gasto ${expenseId}`);
        return callback(null, null);
      }
      logger.info(`💸 Estado de pago actualizado para participante ${participantId}`);
      return callback(null, result);
    })
    .catch(err => {
      logger.error(`❌ Error al actualizar estado de pago: ${err.message}`);
      return callback(err);
    });
};








// ========================================================
// 🔄 Exportar métodos
// ========================================================
export default {
  Group,
  sendExpenseNotification,
  sendNotification,
  saveGroup,
  editGroup,
  findAllGroups,
  findAllMembers,
  findGroupById,
  addExpense,
  deleteExpense,
  deleteParticipant,
  addParticipant,
  updatePayExpense,
  addMember,
  deleteMember,
  deleteGroup,
  findExpenseById
};