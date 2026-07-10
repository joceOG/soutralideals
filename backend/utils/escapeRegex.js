/** Échappe les caractères spéciaux d'une chaîne pour utilisation dans RegExp / $regex MongoDB. */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
