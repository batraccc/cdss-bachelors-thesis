import db from "../db/db.js";

export async function getGeneIdBySymbol(geneSymbol){
  try{
      const result = await db.query(
          "SELECT id FROM genes WHERE symbol = $1", [geneSymbol]
      );
      if(result.rows.length === 0){
          throw new Error(`Unknown gene symbol: ${geneSymbol}`);
      }
      return result.rows[0].id;
  } catch (err) {
      throw new Error("Database error");
  }
}

export async function getActivityScore(geneId, diplotype){
  let totalScore = 0;

  for(let i=0; i<diplotype.length; i++){
      const alleleName = diplotype[i];
      const result = await db.query(
          "SELECT activity_score FROM alleles WHERE gene_id = $1 AND name = $2", [geneId, alleleName]
      );

      if(result.rows.length === 0){
          throw new Error(`Allele ${alleleName} not found for gene_id = ${geneId}`);
      }

      const alleleScore = Number(result.rows[0].activity_score);
      totalScore += alleleScore;
  }

  return totalScore;
}

export async function getPhenotypeFromScore(geneId, activityScore){
  try{
      const result = await db.query(
          "SELECT phenotype, min_score, max_score FROM phenotype_rules WHERE gene_id = $1 AND $2 BETWEEN min_score AND max_score LIMIT 1", [geneId, activityScore]
      );
      if(result.rows.length === 0){
          throw new Error(`No phenotype rule matched for gene_id=${geneId} and score=${activityScore}`);
      }
      return result.rows[0].phenotype;
  } catch(err){
      throw new Error("Database error");
  }
}

export async function interpretDiplotype(geneSymbol, diplotype){
  if(!geneSymbol || typeof(geneSymbol) !== "string"){
      throw new Error("geneSymbol is required");
  }
  if(!Array.isArray(diplotype) || diplotype.length !== 2){
      throw new Error("diplotype must be an array of execatly 2 alleles");
  }

  const geneId = await getGeneIdBySymbol(geneSymbol);
  const activityScore = await getActivityScore(geneId, diplotype);
  const phenotype = await getPhenotypeFromScore(geneId, activityScore);

  return {
      gene: geneSymbol,
      diplotype,
      activityScore,
      phenotype,
  };
}