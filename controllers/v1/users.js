import { Router } from "express"
import Users from '../../models/users.js'
import { verifyToken } from "../../middlewares/auth.js";

const router = Router()

let users = []

//Create

router.use(verifyToken);

router.post('/', (req, res) => {
    const { name, email, password } = req.body
    const newUser = { name, email, password }
    return Users.saveUser(newUser, (err, user) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error creando usuario!' });
        }
        res.json({ code: 'OK', message: 'Usuario creado excitosamente!', data: { user } });
    });
})
//Read id, email
router.get('/', (req, res) => {
    return Users.getAllUsers((err, users) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error getting users!' });
        }
        res.json({ code: 'OK', message: 'Users are available!', data: { users } });
    });
});

router.get('/contacts', (req, res) => {
    return Users.getAllContacts(req.user.id, (err, users) => {
        if (err) {
            return res.status(500).json({ code: 'ERU', message: 'Error getting users!' });
        }
        res.json({ code: 'OK', message: 'Users are available!', data: { users } });
    });
});

router.get('/query', (req, res) => {

    const id = req.query.id;
    const email = req.query.email;
    if (id) {
        return Users.getUserById(id, (err, user) => {
            if (err) {
                return res.status(500).json({ code: 'ER', message: 'Error getting user!' });
            }
            if (!user) {
                return res.status(404).json({ code: 'NF', message: 'User not found!' });
            }
            res.json({ code: 'OK', message: 'User is available!', data: { user } });
        });
    } else if (email) {
        return Users.getUserByEmailWithoutPassContacts(email, (err, user) => {
            if (err) {
                return res.status(500).json({ code: 'ER', message: 'Error getting user!' });
            }
            if (!user) {
                return res.status(404).json({ code: 'NF', message: 'User not found!' });
            }
            res.json({ code: 'OK', message: 'User is available!', data: { user } });
        });

    }

    return res.status(404).json({ code: 'NF', message: 'User not found!' });
});


//Update

router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { name, email, password } = req.body;
    const user = { name, email, password }

    return Users.updateUser(id, user, (err, userActualizado) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error actualizando usuario!' });
        }
        if (!userActualizado) {
            return res.status(404).json({ code: 'NF', message: 'Usuario no encontrado!' });
        }
        res.json({ code: 'OK', message: 'Evento actualizado!', data: { user } });
    })

})
//Delete

router.delete('/:id', (req, res) => {
    const { id } = req.params
    return Users.deleteUser(id, (err, user) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error eliminando evento!' });
        }
        if (!user) {
            return res.status(404).json({ code: 'NF', message: 'Evento no encontrado!' });
        }
        res.json({ code: 'OK', message: 'Evento eliminado!', data: { user } });
    });
})


router.get('/:id/contacts', (req, res) => {
    const { id } = req.params;

    Users.getContacts(id, (err, contacts) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error obteniendo contactos!' });
        }
        res.json({ code: 'OK', message: 'Contactos disponibles!', data: { contacts } });
    });
});

// ➕ Agregar contacto
router.post('/:id/contacts', (req, res) => {
    const { id } = req.params;
    const { contactId } = req.body;

    if (!contactId) {
        return res.status(400).json({ code: 'ER', message: 'Falta contactId en el cuerpo de la petición!' });
    }

    Users.addContact(id, contactId, (err, user) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error agregando contacto!' });
        }
        if (!user) {
            return res.status(404).json({ code: 'NF', message: 'Usuario no encontrado!' });
        }
        res.json({ code: 'OK', message: 'Contacto agregado correctamente!', data: { contacts: user.contacts } });
    });
});

// ❌ Eliminar contacto
router.delete('/:id/contacts/:contactId', (req, res) => {
    const { id, contactId } = req.params;

    Users.removeContact(id, contactId, (err, user) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error eliminando contacto!' });
        }
        if (!user) {
            return res.status(404).json({ code: 'NF', message: 'Usuario no encontrado!' });
        }
        res.json({ code: 'OK', message: 'Contacto eliminado correctamente!', data: { contacts: user.contacts } });
    });
});


router.put('/:id/updateFcmToken/', (req, res) => {
    const { fcmToken } = req.body
    const { id } = req.params

    Users.updateFcmToken(id, fcmToken, (err, user) => {
        if (err) {
            return res.status(500).json({ code: 'ER', message: 'Error actualizando token!' });
        }
        if (!user) {
            return res.status(404).json({ code: 'NF', message: 'Usuario no encontrado!' });
        }
        res.json({ code: 'OK', message: 'Token actualizado!' });
    })
})

router.put('/actions/changePassword', (req, res) => {
    const { oldPass, newPass } = req.body;
    console.log("🧑‍💻 Usuario id:", req.user);

    const id = req.user?.id;
    if (!id) {
        return res.status(401).json({ code: "ER", message: "Token inválido o usuario no autenticado" });
    }

    Users.updatePassword(id, oldPass, newPass, (err, user) => {
        if (err && err.message === "Contraseña actual incorrecta") {
            return res.status(400).json({ code: "ER1", message: "Contraseña actual incorrecta" });
        }
        if (err) {
            return res.status(500).json({ code: "ER", message: "Error actualizando contraseña!" });
        }
        if (!user) {
            return res.status(404).json({ code: "NF", message: "Usuario no encontrado!" });
        }
        res.json({ code: "OK", message: "Contraseña actualizada correctamente!" });
    })

})



export default router;