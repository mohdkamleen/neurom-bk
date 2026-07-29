/**
 * Open Food Facts helpers — fetch and map products for search / barcode scan.
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const OFF_BASE = "https://world.openfoodfacts.org";
const OFF_USER_AGENT = "NeuroM/1.0 (diabetes-management-app)";

async function offFetch(url) {
  const upstream = await fetch(url, {
    headers: { "User-Agent": OFF_USER_AGENT },
  });
  if (!upstream.ok) {
    const err = new Error("upstream");
    err.status = upstream.status;
    throw err;
  }
  return upstream.json();
}

const pickNutrimentsSummary = (nutriments) => {
  if (!nutriments || typeof nutriments !== "object") return null;
  const keys = [
    "energy-kcal_100g",
    "energy_kcal_100g",
    "fat_100g",
    "saturated-fat_100g",
    "monounsaturated-fat_100g",
    "polyunsaturated-fat_100g",
    "trans-fat_100g",
    "cholesterol_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
    "potassium_100g",
    "calcium_100g",
    "iron_100g",
    "magnesium_100g",
    "phosphorus_100g",
    "zinc_100g",
    "vitamin-a_100g",
    "vitamin-c_100g",
    "vitamin-d_100g",
    "vitamin-e_100g",
    "vitamin-k_100g",
    "vitamin-b1_100g",
    "vitamin-b2_100g",
    "vitamin-pp_100g",
    "vitamin-b6_100g",
    "vitamin-b9_100g",
    "vitamin-b12_100g",
  ];
  const out = {};
  for (const k of keys) {
    if (nutriments[k] != null) out[k] = nutriments[k];
  }
  return Object.keys(out).length ? out : nutriments;
};

function roundN(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Scale OFF per-100g nutriments to a serving weight.
 * Macros/fats/salt in g; minerals & most vitamins converted to mg where OFF stores g.
 */
function nutrientsForGrams(nutriments, grams) {
  const g = Number(grams);
  if (!(g > 0) || !nutriments) return null;

  const raw = (k) => {
    const v = nutriments[k];
    if (v == null || Number.isNaN(Number(v))) return null;
    return Number(v);
  };

  /** Scale a per-100g value; returns 0 when missing. */
  const scaled = (keys, digits = 2) => {
    for (const k of keys) {
      const v = raw(k);
      if (v != null) return roundN((v * g) / 100, digits);
    }
    return 0;
  };

  /** OFF often stores sodium in grams; expose as mg. */
  const sodiumMg = () => {
    const sodiumG = raw("sodium_100g");
    if (sodiumG != null) return roundN((sodiumG * g * 1000) / 100);
    const saltG = raw("salt_100g");
    if (saltG != null) return roundN((saltG * 0.4 * g * 1000) / 100);
    return 0;
  };

  /** Convert OFF g → mg when the nutrient is typically stored in grams. */
  const asMg = (keys) => {
    for (const k of keys) {
      const v = raw(k);
      if (v != null) {
        // Values >= 1 for vitamins/minerals in OFF are often already in mg/µg units
        // as labeled; small gram amounts (< 1) are converted to mg.
        const unitHint = nutriments[`${k.replace(/_100g$/, "")}_unit`];
        if (unitHint === "mg" || unitHint === "µg" || unitHint === "mcg") {
          return roundN((v * g) / 100, unitHint === "mg" ? 2 : 3);
        }
        if (Math.abs(v) < 1) return roundN((v * g * 1000) / 100);
        return roundN((v * g) / 100);
      }
    }
    return 0;
  };

  return {
    grams: g,
    calories: Math.round(
      scaled(["energy-kcal_100g", "energy_kcal_100g"], 4) || 0
    ),
    carbsG: scaled(["carbohydrates_100g"]),
    fatG: scaled(["fat_100g"]),
    proteinG: scaled(["proteins_100g"]),
    sugarG: scaled(["sugars_100g"]),
    fiberG: scaled(["fiber_100g"]),
    saturatedFatG: scaled(["saturated-fat_100g"]),
    monounsaturatedFatG: scaled(["monounsaturated-fat_100g"]),
    polyunsaturatedFatG: scaled(["polyunsaturated-fat_100g"]),
    transFatG: scaled(["trans-fat_100g"]),
    cholesterolMg: asMg(["cholesterol_100g"]),
    saltG: scaled(["salt_100g"], 3),
    sodiumMg: sodiumMg(),
    potassiumMg: asMg(["potassium_100g"]),
    calciumMg: asMg(["calcium_100g"]),
    ironMg: asMg(["iron_100g"]),
    magnesiumMg: asMg(["magnesium_100g"]),
    phosphorusMg: asMg(["phosphorus_100g"]),
    zincMg: asMg(["zinc_100g"]),
    vitaminAMcg: asMg(["vitamin-a_100g"]),
    vitaminCMg: asMg(["vitamin-c_100g"]),
    vitaminDMcg: asMg(["vitamin-d_100g"]),
    vitaminEMg: asMg(["vitamin-e_100g"]),
    vitaminKMcg: asMg(["vitamin-k_100g"]),
    thiaminMg: asMg(["vitamin-b1_100g"]),
    riboflavinMg: asMg(["vitamin-b2_100g"]),
    niacinMg: asMg(["vitamin-pp_100g", "vitamin-b3_100g"]),
    vitaminB6Mg: asMg(["vitamin-b6_100g"]),
    folateMcg: asMg(["vitamin-b9_100g"]),
    vitaminB12Mcg: asMg(["vitamin-b12_100g"]),
  };
}

function nutritionToFrontend(nutrients) {
  if (!nutrients) {
    return emptyNutrition();
  }
  return {
    calories: nutrients.calories ?? 0,
    carbs: nutrients.carbsG ?? 0,
    fat: nutrients.fatG ?? 0,
    protein: nutrients.proteinG ?? 0,
    sugar: nutrients.sugarG ?? 0,
    fiber: nutrients.fiberG ?? 0,
    saturatedFat: nutrients.saturatedFatG ?? 0,
    monounsaturatedFat: nutrients.monounsaturatedFatG ?? 0,
    polyunsaturatedFat: nutrients.polyunsaturatedFatG ?? 0,
    transFat: nutrients.transFatG ?? 0,
    cholesterol: nutrients.cholesterolMg ?? 0,
    salt: nutrients.saltG ?? 0,
    sodium: nutrients.sodiumMg ?? 0,
    potassium: nutrients.potassiumMg ?? 0,
    calcium: nutrients.calciumMg ?? 0,
    iron: nutrients.ironMg ?? 0,
    magnesium: nutrients.magnesiumMg ?? 0,
    phosphorus: nutrients.phosphorusMg ?? 0,
    zinc: nutrients.zincMg ?? 0,
    vitaminA: nutrients.vitaminAMcg ?? 0,
    vitaminC: nutrients.vitaminCMg ?? 0,
    vitaminD: nutrients.vitaminDMcg ?? 0,
    vitaminE: nutrients.vitaminEMg ?? 0,
    vitaminK: nutrients.vitaminKMcg ?? 0,
    thiamin: nutrients.thiaminMg ?? 0,
    riboflavin: nutrients.riboflavinMg ?? 0,
    niacin: nutrients.niacinMg ?? 0,
    vitaminB6: nutrients.vitaminB6Mg ?? 0,
    folate: nutrients.folateMcg ?? 0,
    vitaminB12: nutrients.vitaminB12Mcg ?? 0,
  };
}

function emptyNutrition() {
  return {
    calories: 0,
    carbs: 0,
    fat: 0,
    protein: 0,
    sugar: 0,
    fiber: 0,
    saturatedFat: 0,
    monounsaturatedFat: 0,
    polyunsaturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    salt: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0,
    magnesium: 0,
    phosphorus: 0,
    zinc: 0,
    vitaminA: 0,
    vitaminC: 0,
    vitaminD: 0,
    vitaminE: 0,
    vitaminK: 0,
    thiamin: 0,
    riboflavin: 0,
    niacin: 0,
    vitaminB6: 0,
    folate: 0,
    vitaminB12: 0,
  };
}

function parseServingGrams(product = {}) {
  const qty = Number(product.serving_quantity);
  if (Number.isFinite(qty) && qty > 0) return qty;

  const size = String(product.serving_size || "").trim();
  if (size) {
    const match = size.match(/([\d.]+)\s*g/i);
    if (match) {
      const grams = Number(match[1]);
      if (Number.isFinite(grams) && grams > 0) return grams;
    }
  }

  return 100;
}

async function fetchOffProduct(code) {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`;
  const data = await offFetch(url);
  if (data.status === 0 || !data.product) return null;
  return data.product;
}

async function searchOffProducts(query, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    search_terms: query,
    json: "1",
    page_size: String(pageSize),
    page: String(page),
  });
  const url = `${OFF_BASE}/cgi/search.pl?${params.toString()}`;
  return offFetch(url);
}

function offProductToScanResult(product) {
  const barcode = String(product.code || product._id || "").trim();
  const servingGrams = parseServingGrams(product);
  const perServing = nutrientsForGrams(product.nutriments, servingGrams);
  const brand = String(product.brands || "").trim();

  const result = {
    barcode,
    productName:
      String(product.product_name || product.generic_name || product.abbreviated_product_name || "")
        .trim() || "Unknown product",
    servingSize: String(Math.round(servingGrams * 100) / 100),
    servings: 1,
    nutrition: nutritionToFrontend(perServing),
  };

  if (brand) result.brand = brand;

  const imageUrl = product.image_front_url || product.image_front_small_url;
  if (imageUrl) result.imageUrl = imageUrl;

  return result;
}

module.exports = {
  OFF_BASE,
  pickNutrimentsSummary,
  nutrientsForGrams,
  nutritionToFrontend,
  emptyNutrition,
  parseServingGrams,
  fetchOffProduct,
  searchOffProducts,
  offProductToScanResult,
};
