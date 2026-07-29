/**
 * Food lookup with local MongoDB cache (neurom_food DB).
 * Cache-first: food_by_name + food_by_barcode, then Open Food Facts / USDA.
 */

const {
  pickNutrimentsSummary,
  nutrientsForGrams,
  fetchOffProduct,
  searchOffProducts,
  offProductToScanResult,
} = require("../utils/offHelpers");
const {
  searchUsdaFoods,
  fetchUsdaFood,
  usdaFoodToScanResult,
} = require("../utils/usdaHelpers");
const {
  tagOffFood,
  buildFoodSearchResponse,
  nutrientsForGramsFromUsda,
} = require("../utils/foodHelpers");
const foodCache = require("../services/foodCacheService");

function parseSource(raw) {
  const source = String(raw || "all").toLowerCase();
  if (source === "off" || source === "openfoodfacts" || source === "packaged") {
    return "off";
  }
  if (source === "usda" || source === "generic") return "usda";
  if (source === "all") return "all";
  return null;
}

function hasNutritionData(nutrition = {}) {
  return (
    (nutrition.calories ?? 0) > 0 ||
    (nutrition.carbs ?? 0) > 0 ||
    (nutrition.fat ?? 0) > 0 ||
    (nutrition.protein ?? 0) > 0
  );
}

async function fetchPackagedFoodsFromUpstream(query, page, pageSize) {
  const data = await searchOffProducts(query, { page, pageSize });
  const foods = (data.products || [])
    .map(offProductToScanResult)
    .filter((food) => food.barcode && food.productName !== "Unknown product")
    .map(tagOffFood);

  await foodCache.cacheFoods(foods, query);

  return {
    foods,
    count: data.count ?? foods.length,
    page: data.page || page,
  };
}

async function fetchGenericFoodsFromUpstream(query, page, pageSize) {
  const data = await searchUsdaFoods(query, { page, pageSize });
  const foods = (data.foods || [])
    .map((food) => usdaFoodToScanResult(food))
    .filter((food) => food && hasNutritionData(food.nutrition));

  await foodCache.cacheFoods(foods, query);

  return {
    foods,
    count: data.totalHits ?? foods.length,
    page,
  };
}

async function fetchBarcodeFromUpstream(barcode) {
  const product = await fetchOffProduct(barcode);
  if (!product) return null;

  const food = tagOffFood(offProductToScanResult(product));
  await foodCache.cacheFood(food);
  return food;
}

async function fetchGenericDetailsFromUpstream(fdcId) {
  const food = await fetchUsdaFood(fdcId);
  const result = usdaFoodToScanResult(food);
  if (!result) return null;

  await foodCache.cacheFood(result);
  return result;
}

function upstreamError(res, err, message) {
  if (err.status) {
    return res.status(502).json({
      success: false,
      message,
      status: err.status,
    });
  }
  return res.status(500).json({
    success: false,
    message,
    error: err.message,
  });
}

/**
 * Search by food name — local food_by_name first, then USDA / OFF.
 * source=off | usda | all (default).
 */
exports.searchFoods = async (req, res) => {
  const query = String(req.query.q || "").trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const source = parseSource(req.query.source);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query parameter q is required",
    });
  }

  if (!source) {
    return res.status(400).json({
      success: false,
      message: "Query parameter source must be off, usda, or all",
    });
  }

  try {
    const cached = await foodCache.searchByName(query, { source, page, pageSize });
    if (cached.foods.length > 0) {
      const split = foodCache.splitCachedBySource(cached.foods);
      return res.status(200).json(
        buildFoodSearchResponse({
          query,
          page,
          pageSize,
          count: cached.count,
          foods: cached.foods,
          fromCache: true,
          sources:
            source === "all"
              ? { usda: split.usda.length, openfoodfacts: split.openfoodfacts.length }
              : source === "usda"
                ? { usda: cached.foods.length }
                : { openfoodfacts: cached.foods.length },
        })
      );
    }

    if (source === "off") {
      const result = await fetchPackagedFoodsFromUpstream(query, page, pageSize);
      return res.status(200).json(
        buildFoodSearchResponse({
          query,
          page: result.page,
          pageSize,
          count: result.count,
          foods: result.foods,
          fromCache: false,
          sources: { openfoodfacts: result.foods.length },
        })
      );
    }

    if (source === "usda") {
      const result = await fetchGenericFoodsFromUpstream(query, page, pageSize);
      return res.status(200).json(
        buildFoodSearchResponse({
          query,
          page: result.page,
          pageSize,
          count: result.count,
          foods: result.foods,
          fromCache: false,
          sources: { usda: result.foods.length },
        })
      );
    }

    const genericSize = Math.ceil(pageSize / 2);
    const packagedSize = pageSize - genericSize;
    const [genericResult, packagedResult] = await Promise.allSettled([
      fetchGenericFoodsFromUpstream(query, page, genericSize),
      fetchPackagedFoodsFromUpstream(query, page, packagedSize),
    ]);

    const genericFoods =
      genericResult.status === "fulfilled" ? genericResult.value.foods : [];
    const packagedFoods =
      packagedResult.status === "fulfilled" ? packagedResult.value.foods : [];

    if (genericResult.status === "rejected") {
      console.error("USDA search failed:", genericResult.reason);
    }
    if (packagedResult.status === "rejected") {
      console.error("Open Food Facts search failed:", packagedResult.reason);
    }

    if (!genericFoods.length && !packagedFoods.length) {
      const failed = [genericResult, packagedResult].find((r) => r.status === "rejected");
      if (failed?.reason) {
        return upstreamError(res, failed.reason, "Food data service unavailable");
      }
    }

    const foods = [...genericFoods, ...packagedFoods];
    const count =
      (genericResult.status === "fulfilled" ? genericResult.value.count : 0) +
      (packagedResult.status === "fulfilled" ? packagedResult.value.count : 0);

    return res.status(200).json(
      buildFoodSearchResponse({
        query,
        page,
        pageSize,
        count,
        foods,
        fromCache: false,
        sources: {
          usda: genericFoods.length,
          openfoodfacts: packagedFoods.length,
        },
      })
    );
  } catch (err) {
    console.error(err);
    return upstreamError(res, err, "Failed to search foods");
  }
};

/** Generic / non-packaged food search (USDA only). */
exports.searchGenericFoods = async (req, res) => {
  req.query.source = "usda";
  return exports.searchFoods(req, res);
};

/** Packaged food details by barcode — local food_by_barcode first, then OFF. */
exports.getFoodDetails = async (req, res) => {
  const barcode = String(req.params.code || "").trim();
  if (!barcode) {
    return res.status(400).json({
      success: false,
      message: "Barcode is required",
    });
  }

  try {
    const cached = await foodCache.findByBarcode(barcode);
    if (cached) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        ...cached,
      });
    }

    const food = await fetchBarcodeFromUpstream(barcode);
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        barcode,
      });
    }

    return res.status(200).json({
      success: true,
      fromCache: false,
      ...food,
    });
  } catch (err) {
    console.error(err);
    return upstreamError(res, err, "Failed to fetch food details");
  }
};

exports.scanBarcode = exports.getFoodDetails;

/** Generic food details by USDA FDC ID — local food_by_name first, then USDA. */
exports.getGenericFoodDetails = async (req, res) => {
  const fdcId = String(req.params.fdcId || "").trim();
  if (!fdcId) {
    return res.status(400).json({
      success: false,
      message: "fdcId is required",
    });
  }

  try {
    const cached = await foodCache.findByFdcId(fdcId);
    if (cached) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        ...cached,
      });
    }

    const food = await fetchGenericDetailsFromUpstream(fdcId);
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
        fdcId,
      });
    }

    return res.status(200).json({
      success: true,
      fromCache: false,
      ...food,
    });
  } catch (err) {
    console.error(err);
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
        fdcId,
      });
    }
    return upstreamError(res, err, "Failed to fetch generic food details");
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
    const cached = await foodCache.findByBarcode(code);
    if (cached) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        product: {
          code: cached.barcode,
          product_name: cached.productName,
          brands: cached.brand,
          image_front_url: cached.imageUrl,
          serving_size: cached.servingSize,
        },
      });
    }

    const p = await fetchOffProduct(code);
    if (!p) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await foodCache.cacheFood(tagOffFood(offProductToScanResult(p)));

    return res.status(200).json({
      success: true,
      fromCache: false,
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
    return upstreamError(res, err, "Failed to fetch product");
  }
};

/** Scale nutrients to a serving size in grams. */
exports.nutrientsForServing = async (req, res) => {
  const rawSource = String(req.query.source || "off").toLowerCase();
  const source = rawSource === "usda" || rawSource === "generic" ? "usda" : "off";
  const code = String(req.query.code || req.query.fdcId || "").trim();
  const grams = Number.parseFloat(String(req.query.grams || "").trim());

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Query code (barcode or fdcId) is required",
    });
  }
  if (!(grams > 0)) {
    return res.status(400).json({
      success: false,
      message: "Query grams must be a positive number (weight of serving)",
    });
  }

  try {
    if (source === "usda") {
      const cached = await foodCache.findByFdcId(code);
      if (cached) {
        const perServing = scaleCachedNutrition(cached.nutrition, cached.servingSize, grams);
        return res.status(200).json({
          success: true,
          fromCache: true,
          source: "usda",
          fdcId: code,
          product_name: cached.productName,
          serving_grams: grams,
          perServing,
        });
      }

      const food = await fetchUsdaFood(code);
      const result = usdaFoodToScanResult(food);
      if (result) await foodCache.cacheFood(result);
      const perServing = nutrientsForGramsFromUsda(food.foodNutrients, grams);

      return res.status(200).json({
        success: true,
        fromCache: false,
        source: "usda",
        fdcId: String(food.fdcId),
        product_name: food.description,
        serving_grams: grams,
        perServing,
      });
    }

    const cached = await foodCache.findByBarcode(code);
    if (cached) {
      const perServing = scaleCachedNutrition(cached.nutrition, cached.servingSize, grams);
      return res.status(200).json({
        success: true,
        fromCache: true,
        source: "openfoodfacts",
        code: cached.barcode,
        product_name: cached.productName,
        serving_grams: grams,
        perServing,
      });
    }

    const p = await fetchOffProduct(code);
    if (!p) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await foodCache.cacheFood(tagOffFood(offProductToScanResult(p)));
    const perServing = nutrientsForGrams(p.nutriments, grams);

    return res.status(200).json({
      success: true,
      fromCache: false,
      source: "openfoodfacts",
      code: p.code,
      product_name: p.product_name,
      serving_grams: grams,
      perServing,
      nutrimentsPer100g: pickNutrimentsSummary(p.nutriments),
    });
  } catch (err) {
    console.error(err);
    return upstreamError(res, err, "Food data service unavailable");
  }
};

function scaleCachedNutrition(nutrition = {}, servingSize = "100", grams) {
  const baseGrams = Number.parseFloat(servingSize) || 100;
  const scale = grams / baseGrams;
  const round2 = (n) => Math.round((n || 0) * scale * 100) / 100;
  const round3 = (n) => Math.round((n || 0) * scale * 1000) / 1000;
  return {
    grams,
    calories: Math.round((nutrition.calories || 0) * scale),
    carbsG: round2(nutrition.carbs),
    fatG: round2(nutrition.fat),
    proteinG: round2(nutrition.protein),
    sugarG: round2(nutrition.sugar),
    fiberG: round2(nutrition.fiber),
    saturatedFatG: round2(nutrition.saturatedFat),
    monounsaturatedFatG: round2(nutrition.monounsaturatedFat),
    polyunsaturatedFatG: round2(nutrition.polyunsaturatedFat),
    transFatG: round2(nutrition.transFat),
    cholesterolMg: round2(nutrition.cholesterol),
    saltG: round3(nutrition.salt),
    sodiumMg: round2(nutrition.sodium),
    potassiumMg: round2(nutrition.potassium),
    calciumMg: round2(nutrition.calcium),
    ironMg: round2(nutrition.iron),
    magnesiumMg: round2(nutrition.magnesium),
    phosphorusMg: round2(nutrition.phosphorus),
    zincMg: round2(nutrition.zinc),
    copperMg: round2(nutrition.copper),
    manganeseMg: round2(nutrition.manganese),
    seleniumMcg: round3(nutrition.selenium),
    vitaminAMcg: round3(nutrition.vitaminA),
    vitaminCMg: round2(nutrition.vitaminC),
    vitaminDMcg: round3(nutrition.vitaminD),
    vitaminEMg: round2(nutrition.vitaminE),
    vitaminKMcg: round3(nutrition.vitaminK),
    thiaminMg: round3(nutrition.thiamin),
    riboflavinMg: round3(nutrition.riboflavin),
    niacinMg: round2(nutrition.niacin),
    vitaminB6Mg: round3(nutrition.vitaminB6),
    folateMcg: round3(nutrition.folate),
    vitaminB12Mcg: round3(nutrition.vitaminB12),
    cholineMg: round2(nutrition.choline),
    caffeineMg: round2(nutrition.caffeine),
    waterG: round2(nutrition.water),
    sucroseG: round2(nutrition.sucrose),
    glucoseG: round2(nutrition.glucose),
    fructoseG: round2(nutrition.fructose),
  };
}
