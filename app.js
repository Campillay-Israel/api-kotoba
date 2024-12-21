require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const User = require("./models/user.model");
const Koto = require("./models/kotoba.model");
const { authenticateToken } = require("./utilities");

mongoose.connect(process.env.MONGO_URI, {});

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); // Middleware para parsear JSON

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ data: "hola" });
});

// Crear cuenta posible
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere el nombre completo" });
  }
  if (!email) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere un email válido" });
  }
  if (!password) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere una contraseña" });
  }

  const isUser = await User.findOne({ email });
  if (isUser) {
    return res
      .status(400)
      .json({ error: true, message: "El usuario ya existe" });
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    fullName,
    email,
    password: hashedPassword,
  });

  await user.save();

  // Generar token de acceso
  const accessToken = jwt.sign(
    { id: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  return res.status(201).json({
    error: false,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
    },
    accessToken,
    message: "Registro exitoso",
  });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere email y contraseña" });
  }

  const userInfo = await User.findOne({ email });
  if (!userInfo) {
    return res
      .status(400)
      .json({ error: true, message: "Usuario no encontrado" });
  }

  const isPasswordValid = await bcrypt.compare(password, userInfo.password);
  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ error: true, message: "Credenciales inválidas" });
  }

  // Generar token de acceso
  const accessToken = jwt.sign(
    { id: userInfo._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  return res.json({
    error: false,
    message: "Login exitoso",
    user: {
      id: userInfo._id,
      email: userInfo.email,
      fullName: userInfo.fullName,
    },
    accessToken,
  });
});


// Get user
app.get("/get-user", authenticateToken, async (req, res) => {
const user = req.user;
const userId = req.user.id;
const isUser = await User.findOne({_id: userId});
if (!isUser) {
  return res.sendStatus(401);
}
return res.json({
  user:{
    fullName: isUser.fullName,
    email: isUser.email,
    _id: isUser._id,
    createOn: isUser.createOn,
  } ,
    
  message: "",
});

});


// Add Koto
app.post("/add-koto", authenticateToken, async (req, res) => {
  const { kotoba, tags, lectura, frase, español, ingles } = req.body;

  // Verificación separada para cada campo
  if (!kotoba) {
    return res.status(400).json({
      error: true,
      message: "Se requiere al menos un kanji o palabra",
    });
  }

  if (!frase) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere un ejemplo de uso" });
  }

  try {
    // Verificar si el 'kotoba' ya existe
    const existingKoto = await Koto.findOne({ kotoba });
    if (existingKoto) {
      return res.status(400).json({
        error: true,
        message: "Ya existe una palabra o kanji con ese nombre",
      });
    }

    // Crear el nuevo 'kotoba'
    const koto = new Koto({
      kotoba,
      tags: tags || [],
      lectura,
      frase,
      español,
      ingles,
      userId: req.user.id, // Se usa el id del usuario autenticado
    });
    await koto.save();

    return res.json({
      error: false,
      koto,
      message: "Kotoba agregado exitosamente",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: true, message: "Error interno del servidor" });
  }
});

// Edit Koto
app.put("/edit-koto/:id", authenticateToken, async (req, res) => {
  const { kotoba, tags, lectura, frase, español, ingles, isPinned } = req.body;
  const { id } = req.params; // Obtener el ID del Koto a editar

  // Validación básica de campos requeridos
  if (!kotoba) {
    return res.status(400).json({
      error: true,
      message: "Se requiere al menos un kanji o palabra",
    });
  }

  if (!frase) {
    return res
      .status(400)
      .json({ error: true, message: "Se requiere un ejemplo de uso" });
  }

  try {
    // Verificar si ya existe otro 'kotoba' con el mismo nombre y diferente ID
    const existingKoto = await Koto.findOne({ kotoba });
    if (existingKoto && existingKoto._id.toString() !== id) {
      return res.status(400).json({
        error: true,
        message: "Ya existe una palabra o kanji con ese nombre",
      });
    }

    // Actualizar el 'kotoba' en la base de datos
    const updatedKoto = await Koto.findByIdAndUpdate(
      id,
      {
        kotoba,
        tags: Array.isArray(tags) ? tags : [], // Asegurarse de que 'tags' sea un array
        lectura: lectura || "", // Valor por defecto si está vacío
        frase,
        español: español || "", // Valor por defecto si está vacío
        ingles: ingles || "", // Valor por defecto si está vacío
        isPinned: isPinned || false, // Valor por defecto si está vacío
      },
      { new: true, runValidators: true } // Retorna el objeto actualizado y aplica validaciones
    );

    if (!updatedKoto) {
      return res.status(404).json({
        error: true,
        message: "No se encontró el 'kotoba' para editar",
      });
    }

    return res.json({
      error: false,
      koto: updatedKoto,
      message: "Kotoba actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al editar el Kotoba:", error); // Log detallado en consola
    return res.status(500).json({
      error: true,
      message: "Ocurrió un error inesperado al editar el 'kotoba'",
    });
  }
});
//Get All Notes
app.get("/get-all-kotos/", authenticateToken, async (req, res) => {
  const user = req.user; // Se asume que `req.user` está definido por el middleware de autenticación

  try {
    const kotobas = await Koto.find({ userId: req.user.id }).sort({
      isPinned: -1,
    });

    return res.json({
      error: false,
      kotobas, // Cambiado de `kotos` a `kotobas` para que coincida con la variable de respuesta
      message: "Todas las kotobas reveladas con éxito",
    });
  } catch (error) {
    console.error("Error obteniendo kotobas:", error); // Para depuración
    return res.status(500).json({
      error: true,
      message: "Error interno del servidor",
    });
  }
});

//Delete koto
app.delete("/delete-koto/:kotoId", authenticateToken, async (req, res) => {
  const kotoId = req.params.kotoId;
  const user = req.user;
  const userId = req.user.id;

  try {
    const note = await Koto.findOne({ _id: kotoId, userId: userId });
    console.log("probamnos", kotoId, userId, user);
    console.log(kotoId, userId, user);
    if (!note) {
      return res
        .status(404)
        .json({ error: true, message: "Kotoba no encontrado" });
    }
    await Koto.deleteOne({ _id: kotoId, userId: userId });
    return res.json({
      error: false,
      message: "Kotoba eliminada correctamente",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Error interno del server",
    });
  }
});

//Pin act

app.put("/update-koto-pinned/:kotoId", authenticateToken, async (req, res) => {
  const kotoId = req.params.kotoId;
  const isPinned  = req.body.isPinned;
  const user = req.user;
  const logUserId = req.user.id;
  try {
    
    const koto = await Koto.findOne({ _id: kotoId, userId: logUserId });
    if (!koto) {
      return res
        .status(404)
        .json({ error: true, message: "Koto no encontrado" });
    }
    koto.isPinned = isPinned;

    await koto.save();
    return res.json({
      error: false,
      koto,
      message: "Koto actualizado exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Error interno del servidor",
    });
  }
});
app.listen(8000, () => {
  console.log("Servidor escuchando en http://localhost:8000");
});

module.exports = app;
