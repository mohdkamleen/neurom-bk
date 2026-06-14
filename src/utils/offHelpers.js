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
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
  ];
  const out = {};
  for (const k of keys) {
    if (nutriments[k] != null) out[k] = nutriments[k];
  }
  return Object.keys(out).length ? out : nutriments;
};

function nutrientsForGrams(nutriments, grams) {
  const g = Number(grams);
  if (!(g > 0) || !nutriments) return null;
  const scale = (k) => {
    const v = nutriments[k];
    if (v == null || Number.isNaN(Number(v))) return 0;
    return (Number(v) * g) / 100;
  };
  return {
    grams: g,
    calories: Math.round(scale("energy-kcal_100g") || scale("energy_kcal_100g") || 0),
    carbsG: Math.round(scale("carbohydrates_100g") * 100) / 100,
    fatG: Math.round(scale("fat_100g") * 100) / 100,
    proteinG: Math.round(scale("proteins_100g") * 100) / 100,
    sugarG: Math.round(scale("sugars_100g") * 100) / 100,
    fiberG: Math.round(scale("fiber_100g") * 100) / 100,
    saltG: Math.round(scale("salt_100g") * 1000) / 1000,
  };
}

function nutritionToFrontend(nutrients) {
  if (!nutrients) {
    return {
      calories: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    };
  }
  return {
    calories: nutrients.calories ?? 0,
    carbs: nutrients.carbsG ?? 0,
    fat: nutrients.fatG ?? 0,
    protein: nutrients.proteinG ?? 0,
    sugar: nutrients.sugarG ?? 0,
    fiber: nutrients.fiberG ?? 0,
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
  parseServingGrams,
  fetchOffProduct,
  searchOffProducts,
  offProductToScanResult,
};
