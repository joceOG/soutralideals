import Groupe from "../models/groupeModel.js";
import Categorie from "../models/categorieModel.js";
import Service from "../models/serviceModel.js";

const normalize = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Groupe « Services Généraux » (ancien fourre-tout import) — masqué des listes catalogue. */
export function isServicesGenerauxGroupeName(nomgroupe) {
  const n = normalize(nomgroupe);
  return n === "services generaux" || n === "service generaux";
}

export async function getCategorieIdsUnderServicesGenerauxGroupe() {
  const groupes = await Groupe.find().lean();
  const sgIds = groupes
    .filter((g) => isServicesGenerauxGroupeName(g.nomgroupe))
    .map((g) => g._id);
  if (!sgIds.length) return [];
  const cats = await Categorie.find({ groupe: { $in: sgIds } })
    .select("_id")
    .lean();
  return cats.map((c) => c._id);
}

export async function getServiceIdsUnderServicesGenerauxCategories() {
  const catIds = await getCategorieIdsUnderServicesGenerauxGroupe();
  if (!catIds.length) return [];
  const services = await Service.find({ categorie: { $in: catIds } })
    .select("_id")
    .lean();
  return services.map((s) => s._id);
}
