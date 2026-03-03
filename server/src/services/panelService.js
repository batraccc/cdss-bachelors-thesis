import { interpretDiplotype } from "./genotypeService.js";
import { applyPhenoconversion } from "./phenoconversionService.js";
import { getDrugRecommendation } from "./guidelineService.js";

export async function interpretPanel(data) {

  const { genes, currentDrugs = [], plannedDrugs = [] } = data;

  const geneResults = [];

  for (let i = 0; i < genes.length; i++) {

    const genotype = await interpretDiplotype(
      genes[i].gene,
      genes[i].diplotype
    );

    const adjusted = await applyPhenoconversion(
      genes[i].gene,
      genotype.phenotype,
      currentDrugs
    );

    geneResults.push({
      gene: genes[i].gene,
      diplotype: genotype.diplotype,
      phenotype: genotype.phenotype,
      adjustedPhenotype: adjusted.adjustedPhenotype
    });
  }

  const drugRecommendations = [];

  for (let i = 0; i < plannedDrugs.length; i++) {

    const recs = [];

    for (let j = 0; j < geneResults.length; j++) {

      const r = await getDrugRecommendation(
        geneResults[j].gene,
        geneResults[j].adjustedPhenotype,
        plannedDrugs[i]
      );

      if (r.recommendation) {
        recs.push({
          gene: geneResults[j].gene,
          recommendation: r.recommendation
        });
      }
    }

    drugRecommendations.push({
      drug: plannedDrugs[i],
      recommendations: recs
    });
  }

  return {
    genes: geneResults,
    drugRecommendations
  };
}