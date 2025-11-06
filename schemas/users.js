import mongoose from "mongoose";
import bcrypt from "bcrypt";
import logger from '../utils/logger.js';
import GroupsSchema from './groups.js';
const Group = GroupsSchema.Group;



const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fcmToken: { type: String, default: "none" },
    password: { type: String, required: true },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const saveUser = (user, callback) => {
    const { name, email, password } = user
    const newUser = new User({ name, email, password })
    newUser.save()
        .then(() => {
            logger.success('Nuevo usuario creado!')
            return callback(null, newUser)
        })
        .catch(err => {
            logger.error(err)
            return callback(err)
        });
}

const findAllUsers = (callback) => {
    User.find()
        .then(results => {
            console.log('📋 Todos los users:', results);
            return callback(null, results);
        })
        .catch(err => {
            console.error(err);
            return callback(err);
        });
}

const findAllContacts = (id, callback) => {
    User.findById(id)
        .populate('contacts', '_id name email') // Trae solo los campos indicados de cada contacto
        .select('contacts') // Solo devuelve el campo "contacts" del usuario
        .then(user => {
            if (!user) {
                return callback(new Error('Usuario no encontrado'));
            }
            console.log('📋 Todos los users:', user);
            return callback(null, user.contacts);
        })
        .catch(err => {
            console.error(err);
            return callback(err);
        });
}

const findUserById = (id, callback) => {
    User.findOne({ id })
        .then(result => {
            console.log('🔍 Encontrado:', result);
            return callback(null, result);
        })
        .catch(err => {
            console.error(err);
            console.log('🔍 Error:', err);
            return callback(err);
        });
}



const updateUser = (id, user, callback) => {
    User.findOneAndUpdate({ id }, user, { new: true })
        .then(result => {
            console.log('🔍 Actualizado:', result);
            return callback(null, result);
        })
        .catch(err => {
            console.error(err);
            return callback(err);
        });
}


const findUserByEmail = (email, callback) => {
    User.findOne({ email })
        .then(result => {
            console.log('🔍 Encontrado:', result);
            return callback(null, result);
        })
        .catch(err => {
            console.error(err);
            console.log('🔍 Error:', err);
            return callback(err);
        });
}

const findUserByEmailWithoutPass = (email, callback) => {
    User.findOne({ email })
        .select('-password')
        .populate('contacts', '_id name email')
        .then(result => {
            console.log('🔍 Encontrado:', result);
            return callback(null, result);
        })
        .catch(err => {
            console.error(err);
            console.log('🔍 Error:', err);
            return callback(err);
        });
}

const findUserByEmailWithoutPassContacts = (email, callback) => {
    User.findOne({ email })
        .select('-password -contacts')
        .then(result => {
            console.log('🔍 Encontrado:', result);
            return callback(null, result);
        })
        .catch(err => {
            console.error(err);
            console.log('🔍 Error:', err);
            return callback(err);
        });
}


const deleteUser = (id, callback) => {
    User.findOneAndDelete({ id })
        .then(result => {
            if (result) {
                logger.info(`Usuario eliminado con ID: ${id}`, result);
            } else {
                logger.warn(`Usuario inexistente con ID: ${id}`);
            }
            return callback(null, result);
        })
        .catch(err => {
            logger.error(`Error al eliminar al usuario con ID ${id}: ${err.message}`, err);
            return callback(err);
        });
};

// ➕ Agregar contacto
const addContact = (userId, contactId, callback) => {
    User.findByIdAndUpdate(
        userId,
        { $addToSet: { contacts: contactId } }, // evita duplicados
        { new: true }
    )
        .populate("contacts", "name email")
        .then(user => {
            if (!user) {
                logger.warn(`⚠️ Usuario no encontrado con ID: ${userId}`);
                return callback(null, null);
            }
            logger.info(`👥 Contacto agregado a ${user.name}`);
            return callback(null, user);
        })
        .catch(err => {
            logger.error(`❌ Error al agregar contacto: ${err.message}`);
            return callback(err);
        });
};

// ❌ Eliminar contacto
const removeContact = (userId, contactId, callback) => {
    User.findByIdAndUpdate(
        userId,
        { $pull: { contacts: contactId } },
        { new: true }
    )
        .populate("contacts", "name email")
        .then(user => {
            if (!user) {
                logger.warn(`⚠️ Usuario no encontrado con ID: ${userId}`);
                return callback(null, null);
            }
            logger.info(`👋 Contacto eliminado de ${user.name}`);
            return callback(null, user);
        })
        .catch(err => {
            logger.error(`❌ Error al eliminar contacto: ${err.message}`);
            return callback(err);
        });
};

// 📋 Obtener contactos de un usuario
const getContacts = (userId, callback) => {
    User.findById(userId)
        .populate("contacts", "name email")
        .then(user => {
            if (!user) {
                logger.warn(`⚠️ Usuario no encontrado con ID: ${userId}`);
                return callback(null, []);
            }
            logger.info(`📇 ${user.contacts.length} contactos obtenidos de ${user.name}`);
            return callback(null, user.contacts);
        })
        .catch(err => {
            logger.error(`❌ Error al obtener contactos: ${err.message}`);
            return callback(err);
        });
};

// 📋 actualizar el fcmToken

const updateFcmToken = (userId, fcmToken, callback) => {
    User.findByIdAndUpdate(
        userId,
        { fcmToken }, // actualiza el token
        { new: true } // devuelve el usuario actualizado
    )
        .then(user => {
            if (!user) {
                logger.warn(`⚠️ Usuario no encontrado con ID: ${userId}`);
                return callback(null, null);
            }
            logger.info(`🔄 Token FCM actualizado para ${user.email}`);
            return callback(null, user);
        })
        .catch(err => {
            logger.error(`❌ Error al actualizar FCM token: ${err.message}`);
            return callback(err);
        });

}

const updatePassword = async (userId, oldPass, newPass, callback) => {
    try {
        // 1️⃣ Buscar el usuario por su ID
        const user = await User.findById(userId);
        if (!user) {
            console.warn("Usuario no encontrado al intentar cambiar contraseña");
            return callback(null, null);
        }

        // 2️⃣ Verificar que la contraseña actual coincida
        const isMatch = await bcrypt.compare(oldPass, user.password);
        if (!isMatch) {
            console.warn("Contraseña actual incorrecta");
            return callback(new Error("Contraseña actual incorrecta"));
        }

        // 3️⃣ Hashear la nueva contraseña
        const hashedNewPass = await bcrypt.hash(newPass, 10);

        // 4️⃣ Guardar la nueva contraseña
        user.password = hashedNewPass;
        user.markModified("password");
        await user.save();
        const testUser = await User.findById(userId);
        console.log("🔎 Nueva contraseña guardada en DB:", testUser.password);

        console.info(`🔒 Contraseña actualizada para el usuario ${user.email}`);
        callback(null, user);
    } catch (err) {
        console.error("❌ Error al actualizar contraseña:", err);
        callback(err);
    }
};

const addContactAndMember = (userId, contactId, groupId, callback) => {
  let contactData = null;
  let groupData = null;

  // 1️⃣ Buscar usuario principal
  User.findById(userId)
    .then(user => {
      if (!user) {
        return callback({ message: "Usuario no encontrado" });
      }

      // 2️⃣ Buscar contacto
      return User.findById(contactId).then(contact => {
        if (!contact) {
          return callback({ message: "Contacto no encontrado" });
        }

        contactData = contact; // guardamos para devolver al final

        // 3️⃣ Agregar contacto si no existe
        if (!user.contacts.includes(contactId)) {
          user.contacts.push(contactId);
          return user.save(); // devolvemos la promesa
        }

        return null; // nada que guardar
      });
    })
    .then(() => {
      // 4️⃣ Buscar grupo
      return Group.findById(groupId);
    })
    .then(group => {
      if (!group) {
        return callback({ message: "Grupo no encontrado" });
      }

      groupData = group;

      // 5️⃣ Agregar miembro si no existe
      const exists = group.members.some(
        (m) => m.user.toString() === contactId.toString()
      );

      if (!exists) {
        group.members.push({ user: contactId, isDeleted: false });
        return group.save();
      }

      return null;
    })
    .then(() => {
      // 6️⃣ Éxito final
      const result = {
        contact: {
          id: contactData._id,
          name: contactData.name,
          email: contactData.email
        },
        group: {
          id: groupData._id,
          name: groupData.name
        }
      };

      return callback(null, result);
    })
    .catch(err => {
      console.error("❌ Error en addContactAndMember:", err);
      return callback({ message: err.message });
    });
};


export default {
    User,
    updatePassword,
    saveUser,
    findAllUsers,
    findUserById,
    updateUser,
    deleteUser,
    findUserByEmail,
    findUserByEmailWithoutPass,
    findUserByEmailWithoutPassContacts,
    addContactAndMember,
    addContact,
    removeContact,
    getContacts,
    findAllContacts,
    updateFcmToken
}