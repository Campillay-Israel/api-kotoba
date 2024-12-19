const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const kotobaSchema = new Schema({
  kotoba: { type: String, required: true }, // Palabra principal
  tags: { type: [String], default: [] }, // Etiquetas relacionadas
  lectura: { type: String }, // Lectura (por ejemplo, kana)
  frase: { type: String }, // Frase de ejemplo
  español: { type: String }, // Traducción al español
  ingles: { type: String }, // Traducción al inglés
  isPinned: { type: Boolean, default: false }, // Si está fijado
  onEdit: { type: Date }, // Última edición
  onDelete: { type: Date }, // Fecha de eliminación (si es necesario)
  onPinKoto: { type: Date }, // Fecha en la que se fijó la palabra
  userId: { type: String, required: true }, // Usuario que creó el registro
  createOn: { type: Date, default: Date.now }, // Fecha de creación
});

module.exports = mongoose.model("Kotoba", kotobaSchema);