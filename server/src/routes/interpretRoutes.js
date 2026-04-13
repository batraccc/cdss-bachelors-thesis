import express from "express";
import db from "../db/db.js";

import { interpretDiplotype } from "../services/genotypeService.js";
import { applyPhenoconversion } from "../services/phenoconversionService.js";
import { getDrugRecommendation } from "../services/guidelineService.js";
import { interpretPanel } from "../services/panelService.js";

import { SingleInterpretSchema } from "../validation/singleSchema.js";
import { normalizeSingleInput } from "../validation/normalizeSingle.js";
import { ZodError } from "zod";

const router = express.Router();

router.get("/genes", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT symbol FROM genes ORDER BY symbol"
    );

    res.json(result.rows.map(r => r.symbol));
  } catch (err) {
    console.error("GENES ERROR: ", err)
    res.status(500).json({ error: "Failed to fetch genes" });
  }
});


router.get("/drugs", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT name FROM drugs ORDER BY name"
    );

    res.json(result.rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch drugs" });
  }
});

router.post("/interpret/genotype", async (req, res) => {
  try {
    const parsed = SingleInterpretSchema.parse(req.body);
    const normalized = normalizeSingleInput(parsed);

    const { gene, diplotype, currentDrugs, plannedDrug } = normalized;

    const genotypeResult = await interpretDiplotype(gene, diplotype);

    const phenoconversionResult = await applyPhenoconversion(
      gene,
      genotypeResult.phenotype,
      currentDrugs
    );

    const recommendation = await getDrugRecommendation(
      gene,
      phenoconversionResult.adjustedPhenotype,
      plannedDrug
    );

    res.json({
      ok: true,
      genetics: genotypeResult,
      phenoconversion: phenoconversionResult,
      recommendation
    });

  } catch (err) {
    let message = "Invalid request";

    if (err instanceof ZodError) {
      message = err.issues[0].message;
    } else {
      message = err.message;
    }

    res.status(400).json({
      ok: false,
      error: message
    });
  }
});

router.post("/interpret/panel", async (req, res) => {
  try {
    const result = await interpretPanel(req.body);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});


export default router;