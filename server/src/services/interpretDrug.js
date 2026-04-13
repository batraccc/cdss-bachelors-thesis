import { interpretDiplotype } from "./genotypeService.js";
import { applyPhenoconversion } from "./phenoconversionService.js";
import { getDrugRecommendation } from "./guidelineService.js";

export async function interpretDrug(
  geneSymbol,
  diplotype,
  drugName,
  currentDrugs = []
){
  try {
    const diplotypeResult = await interpretDiplotype(
      geneSymbol,
      diplotype
    );

    const baselinePhenotype = diplotypeResult.phenotype;
    const activityScore = diplotypeResult.activityScore;

    const phenoconversionResult = await applyPhenoconversion(
      geneSymbol,
      baselinePhenotype,
      currentDrugs
    );

    const adjustedPhenotype = phenoconversionResult.adjustedPhenotype;
    const phenoconversionReason = phenoconversionResult.reason;

    const recommendationResult = await getDrugRecommendation(
      geneSymbol,
      adjustedPhenotype,
      drugName
    );

    return {
      gene: geneSymbol,
      diplotype,
      activityScore,
      baselinePhenotype,
      adjustedPhenotype,
      phenoconversionReason,
      drug: drugName,
      recommendation: recommendationResult.recommendation || null,
      alternatives: recommendationResult.alternatives || null,
      evidenceLevel: recommendationResult.evidenceLevel || null,
      source: recommendationResult.source || null,
      message: recommendationResult.message || null
    };

  } catch (err) {
    console.error(err);
  
    return {
      gene: geneSymbol,
      diplotype,
      activityScore: null,
      baselinePhenotype: "unknown",
      adjustedPhenotype: "unknown",
      phenoconversionReason: null,
      drug: drugName,
      recommendation: null,
      alternatives: null,
      evidenceLevel: null,
      source: null,
      message: err.message || "Interpretation failed"
    };
  }
}