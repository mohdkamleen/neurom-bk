/**
 * Proxies Open Food Facts for product search and nutrient data (no API key).
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const OFF_BASE = "https://world.openfoodfacts.org";

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

async function fetchOffProduct(code) {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json`;
  const upstream = await fetch(url);
  if (!upstream.ok) {
    const err = new Error("upstream");
    err.status = upstream.status;
    throw err;
  }
  const data = await upstream.json();
  if (data.status === 0 || !data.product) return null;
  return data.product;
}

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

exports.searchFoods = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Query parameter q is required",
    });
  }

  try {
    const params = new URLSearchParams({
      search_terms: q,
      json: "1",
      page_size: String(pageSize),
      page: String(page),
    });
    const url = `${OFF_BASE}/cgi/search.pl?${params.toString()}`;
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: "Food data service unavailable",
        status: upstream.status,
      });
    }
    const data = await upstream.json();
    const products = (data.products || []).map((p) => ({
      code: p.code,
      product_name: p.product_name,
      brands: p.brands,
      image_front_small_url: p.image_front_small_url,
      nutriments: pickNutrimentsSummary(p.nutriments),
    }));

    return res.status(200).json({
      success: true,
      count: data.count,
      page: data.page,
      page_size: pageSize,
      products,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to search foods",
      error: err.message,
    });
  }
};

exports.getFoodByCode = async (req, res) => {
  const code = String(req.params.code || "").trim();
  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Product code (barcode) is required",
    });
  }

  try {
    const p = await fetchOffProduct(code);
    if (!p) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: {
        code: p.code,
        product_name: p.product_name,
        generic_name: p.generic_name,
        brands: p.brands,
        categories: p.categories,
        countries: p.countries,
        image_front_url: p.image_front_url,
        image_nutrition_url: p.image_nutrition_url,
        serving_size: p.serving_size,
        serving_quantity: p.serving_quantity,
        nutriscore_grade: p.nutriscore_grade,
        nutriments: p.nutriments,
        nutriments_estimated: p.nutriments_estimated,
      },
    });
  } catch (err) {
    console.error(err);
    if (err.status) {
      return res.status(502).json({
        success: false,
        message: "Food data service unavailable",
        status: err.status,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: err.message,
    });
  }
};

/** For manual entry / Add Food flow: scale OFF per-100g values to an amount in grams. */
exports.nutrientsForServing = async (req, res) => {
  const code = String(req.query.code || "").trim();
  const grams = Number.parseFloat(String(req.query.grams || "").trim());

  if (!code) {
    return res.status(400).json({ success: false, message: "Query code (barcode) is required" });
  }
  if (!(grams > 0)) {
    return res.status(400).json({
      success: false,
      message: "Query grams must be a positive number (weight of serving)",
    });
  }

  try {
    const p = await fetchOffProduct(code);
    if (!p) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const perServing = nutrientsForGrams(p.nutriments, grams);

    return res.status(200).json({
      success: true,
      code: p.code,
      product_name: p.product_name,
      serving_grams: grams,
      perServing,
      nutrimentsPer100g: pickNutrimentsSummary(p.nutriments),
    });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      success: false,
      message: "Food data service unavailable",
    });
  }
};
