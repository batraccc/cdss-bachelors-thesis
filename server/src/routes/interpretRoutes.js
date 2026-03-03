import express from "express";
import { interpretDiplotype } from "../services/genotypeService.js";
import { applyPhenoconversion } from "../services/phenoconversionService.js";
import { getDrugRecommendation } from "../services/guidelineService.js";
import { interpretPanel } from "../services/panelService.js";

const router = express.Router();

router.post("/interpret/genotype", async (req, res) => {
  try{
    const {gene, diplotype, currentDrugs, plannedDrug} = req.body;
    
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
        recommendation,
    });
} catch (err) {
    res.status(400).json({
        ok: false,
        error: err.message
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