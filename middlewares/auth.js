
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

export const signToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader) return res.status(401).json({ code: "ER", message: "Token requerido" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2) return res.status(401).json({ code: "ER", message: "Formato inválido" });

  const scheme = parts[0];
  const token = parts[1];

  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ code: "ER", message: "Formato Bearer inválido" });

  jwt.verify(token, SECRET, (err, decoded) => {
    console.log("Verificando Token")
    if (err) {
      console.log("Token invalido")
      return res.status(401).json({ code: "ER", message: "Token inválido o expirado" });
    }
    console.log("Token valido")
    req.user = decoded;
    next();
  });
};
