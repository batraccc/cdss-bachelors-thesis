import db from "../db/db.js";

function isActivityScoreGene(geneSymbol){
  return [
    "CYP2D6",
    "CYP2C19",
    "CYP2C9",
    "CYP2B6",
    "CYP3A5"
  ].includes(geneSymbol);
}

function downgradePhenotype(p){
  p = p.toLowerCase();

  if(p === "ultrarapid metabolizer") return "normal metabolizer";
  if(p === "normal metabolizer") return "intermediate metabolizer";
  if(p === "intermediate metabolizer") return "poor metabolizer";
  return p;
}

function upgradePhenotype(p){
  p = p.toLowerCase();

  if(p === "poor metabolizer") return "intermediate metabolizer";
  if(p === "intermediate metabolizer") return "normal metabolizer";
  if(p === "normal metabolizer") return "ultrarapid metabolizer";
  return p;
}

export async function applyPhenoconversion(geneSymbol, baselinePhenotype, currentDrugs){

  if(!isActivityScoreGene(geneSymbol)){
    return {
      baselinePhenotype,
      adjustedPhenotype: baselinePhenotype,
      reason: null
    };
  }

  if(!Array.isArray(currentDrugs) || currentDrugs.length === 0){
    return {
      baselinePhenotype,
      adjustedPhenotype: baselinePhenotype,
      reason: null
    };
  }

  const geneRes = await db.query(
    "SELECT id FROM genes WHERE symbol = $1",
    [geneSymbol]
  );

  if(geneRes.rows.length === 0){
    throw new Error(`Unknown gene: ${geneSymbol}`);
  }

  const geneId = geneRes.rows[0].id;

  const result = await db.query(
    `
    SELECT d.name, dgi.effect, dgi.strength
    FROM drug_gene_interactions dgi
    JOIN drugs d ON d.id = dgi.drug_id
    WHERE dgi.gene_id = $1
    AND d.name = ANY($2)
    `,
    [geneId, currentDrugs.map(d => d.toLowerCase())]
  );

  if(result.rows.length === 0){
    return {
      baselinePhenotype,
      adjustedPhenotype: baselinePhenotype,
      reason: null
    };
  }

  let adjustedPhenotype = baselinePhenotype;
  const reasons = [];

  const strengthPriority = { strong: 3, moderate: 2, weak: 1 };

  const sorted = result.rows.sort(
    (a, b) => strengthPriority[b.strength] - strengthPriority[a.strength]
  );

  for(const row of sorted){

    if(row.effect === "inhibitor"){
      adjustedPhenotype = downgradePhenotype(adjustedPhenotype);
      reasons.push(`${row.name} inhibits ${geneSymbol} (${row.strength})`);
    }

    if(row.effect === "inducer"){
      adjustedPhenotype = upgradePhenotype(adjustedPhenotype);
      reasons.push(`${row.name} induces ${geneSymbol} (${row.strength})`);
    }
  }

  return {
    baselinePhenotype,
    adjustedPhenotype,
    reason: reasons.join("; ")
  };
}