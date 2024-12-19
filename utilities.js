const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extrae el token
  
    if (!token) {
      console.log("Token no proporcionado");
      return res.status(401).json({ error: true, message: "Token no proporcionado" });
    }
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        console.log("Error al verificar el token:", err.message);
        return res.status(403).json({ error: true, message: "Token inválido o expirado" });
      }
      req.user = user; // Guarda el usuario decodificado en la solicitud
      console.log("Usuario autenticado:", user);
      next(); // Pasa al siguiente middleware o controlador
    });
  }
  

module.exports = {
  authenticateToken,
}
