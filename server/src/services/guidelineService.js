import db from "../db/db.js";

function normalizePhenotype(p){
  if(!p) return p;

  const map = {
    "high risk": "positive",
    "low risk": "negative"
  };

  return map[p.toLowerCase()] || p.toLowerCase();
}

export async function getDrugRecommendation(geneSymbol, phenotype, drugName){

  const normalizedPhenotype = normalizePhenotype(phenotype);

  const result = await db.query(
    `SELECT 
        gdg.recommendation_summary,
        gdg.alternatives,
        gdg.evidence_level,
        gdg.source
     FROM gene_drug_guidelines gdg
     JOIN genes g ON g.id = gdg.gene_id
     JOIN drugs d ON d.id = gdg.drug_id
     WHERE g.symbol = $1
       AND LOWER(d.name) = $2
       AND LOWER(gdg.phenotype) = $3
     LIMIT 1`,
    [
      geneSymbol,
      drugName.toLowerCase(),
      normalizedPhenotype
    ]
  );

  if(result.rows.length === 0){
    return {
      recommendation: null,
      alternatives: null,
      evidenceLevel: null,
      source: null,
      message: "No guideline for given gene–drug–phenotype combination"
    };
  }

  return {
    recommendation: result.rows[0].recommendation_summary,
    alternatives: result.rows[0].alternatives,
    evidenceLevel: result.rows[0].evidence_level,
    source: result.rows[0].source
  };
}