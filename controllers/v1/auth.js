// app/controllers/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import Users from "../../models/users.js"; // tu modelo user
import { signToken } from "../../middlewares/auth.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// Registro
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ code: "ER", message: "Campos obligatorios faltantes" });

  // hasheamos y guardamos con tu modelo
  bcrypt.hash(password, 10, (errHash, hash) => {
    if (errHash) return res.status(500).json({ code: "ER", message: "Error server" });
    const newUser = { name, email, password: hash };
    return Users.saveUser(newUser, (err, user) => {
      if (err) return res.status(500).json({ code: "ER", message: "Error creando usuario" });
      // no devolver password
      user.password = undefined;
      res.json({ code: "OK", message: "Usuario creado", data: { user } });
    });
  });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ code: "ER", message: "Email y password requeridos" });

  // suponiendo que tu modelo tiene findUserByEmail con callback
  Users.getUserByEmail(email, (err, user) => {
    if (err) return res.status(500).json({ code: "ER", message: "Error server" });
    if (!user) return res.status(401).json({ code: "ER", message: "Credenciales inválidas" });

    // comparar bcrypt
    bcrypt.compare(password, user.password, (errCmp, same) => {
      if (errCmp) return res.status(500).json({ code: "ER", message: "Error server" });
      if (!same) return res.status(401).json({ code: "ER", message: "Credenciales inválidas" });

      // firmar token (puedes incluir id y nombre)
      const token = signToken({ id: user._id, name: user.name, email: user.email });


      Users.findUserByEmailWithoutPass(email, (err2, cleanUser) => {
        if (err2) return res.status(500).json({ code: "ER", message: "Error al obtener usuario" });

        return res.json({
          code: "OK",
          message: "Autenticado",
          data: {
            token,
            user: cleanUser,
          },
        });
        });
    });
  });
});

router.post("/logout", verifyToken, (req, res) => {
  // No hacemos nada con el token, solo respondemos OK
  return res.json({ code: "OK", message: "Sesión cerrada correctamente" });
});

export default router;