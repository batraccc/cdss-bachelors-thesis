import db from "../db/db.js";

export async function applyPhenoconversion(geneSymbol, baselinePhenotype, currentDrugs){
  let adjustedPhenotype = baselinePhenotype;
  let reason = null;

  for (let i = 0; i<currentDrugs.length;i++){
      const drugName = currentDrugs[i];
      const result = await db.query(
          "SELECT effect, strength FROM drug_gene_effects dge JOIN drugs d ON d.id = dge.drug_id JOIN genes g ON g.id = dge.gene_id WHERE d.name = $1 AND g.symbol = $2", [drugName, geneSymbol]
      );

      if (result.rows.length > 0){
          const effect = result.rows[0].effect;
          if(effect === "inhibitor"){
              if(baselinePhenotype == "NM"){
                  adjustedPhenotype = "IM";
              } else if(baselinePhenotype == "IM"){
                  adjustedPhenotype = "PM";
              }

              reason = `${drugName} inhibits ${geneSymbol}`;
              break;
          }
      }
  }

  return {
      baselinePhenotype,
      adjustedPhenotype,
      reason
  };
}