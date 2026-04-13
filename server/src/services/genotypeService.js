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

export async function getGeneType(geneId){
    const result = await db.query(
      `SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM phenotype_rules 
            WHERE gene_id = $1 AND min_score IS NOT NULL
          )
          THEN 'score'
          ELSE 'allele'
        END as type
      `,
      [geneId]
    );
  
    return result.rows[0].type;
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
        return "unknown"
      }
      return result.rows[0].phenotype;
  } catch(err){
      throw new Error("Database error");
  }
}

export async function getPhenotypeFromAlleles(geneId, diplotype){
    const sorted = [...diplotype].sort();
    const diplotypeStr = `${sorted[0]}/${sorted[1]}`;
  
    let result = await db.query(
      `SELECT phenotype FROM phenotype_rules 
       WHERE gene_id = $1 AND allele_combination = $2`,
      [geneId, diplotypeStr]
    );
  
    if(result.rows.length > 0){
      return result.rows[0].phenotype;
    }
  
    const alleleRes = await db.query(
      `SELECT allele_function FROM alleles 
       WHERE gene_id = $1 AND name = ANY($2)`,
      [geneId, diplotype]
    );
  
    const functions = alleleRes.rows.map(r => r.allele_function);
  
    if(functions.includes("no_function")){
      return "Poor metabolizer";
    }
  
    if(functions.includes("decreased")){
      return "Intermediate metabolizer";
    }
  
    return "Normal metabolizer";
  }


  export async function interpretDiplotype(geneSymbol, diplotype){

    const geneRes = await db.query(
      "SELECT id, gene_type FROM genes WHERE symbol=$1",
      [geneSymbol]
    );
  
    if(geneRes.rows.length === 0){
      throw new Error("Unknown gene");
    }
  
    const geneId = geneRes.rows[0].id;
    const geneType = geneRes.rows[0].gene_type;
  
    const normalize = (str) => str?.toLowerCase().trim();
  
    if (geneSymbol === "CFTR") {
  
      let category = "non_responsive";
  
      if (diplotype.includes("G551D")) {
        category = "responsive";
      }
  
      const phenotypeRes = await db.query(
        `SELECT phenotype
         FROM phenotype_rules
         WHERE gene_id=$1
         AND allele_combination=$2
         LIMIT 1`,
        [geneId, category]
      );
  
      return {
        gene: geneSymbol,
        diplotype,
        activityScore: null,
        phenotype: phenotypeRes.rows[0]?.phenotype || "unknown"
      };
    }
  
    if(geneType === "activity_score"){
  
      let totalScore = 0;
  
      for(const allele of diplotype){
        const res = await db.query(
          "SELECT activity_score FROM alleles WHERE gene_id=$1 AND name=$2",
          [geneId, allele]
        );
  
        if(res.rows.length === 0){
          throw new Error(`Allele ${allele} not found`);
        }
  
        totalScore += Number(res.rows[0].activity_score);
      }
  
      const phenotypeRes = await db.query(
        `SELECT phenotype
         FROM phenotype_rules
         WHERE gene_id=$1
         AND $2 BETWEEN min_score AND max_score
         LIMIT 1`,
        [geneId, totalScore]
      );
  
      return {
        gene: geneSymbol,
        diplotype,
        activityScore: totalScore,
        phenotype: phenotypeRes.rows[0]?.phenotype || "unknown"
      };
    }
  
    if(geneType === "diplotype"){
  
      const funcRes = await db.query(
        `SELECT name, allele_function
         FROM alleles
         WHERE gene_id=$1 AND name = ANY($2)`,
        [geneId, diplotype]
      );
  
      if (funcRes.rows.length === 0) {
        throw new Error(`No alleles found for ${geneSymbol}`);
      }
  
      const functions = diplotype.map(allele => {
        const match = funcRes.rows.find(r => r.name === allele);
        return normalize(match?.allele_function) || "unknown";
      });
  
      let alleleCategory = functions.map(f => 
        f === "normal function" ? "*1" : "*variant"
      );
  
      const diplotype1 = `${alleleCategory[0]}/${alleleCategory[1]}`;
      const diplotype2 = `${alleleCategory[1]}/${alleleCategory[0]}`;
  
      const res = await db.query(
        `SELECT phenotype
         FROM phenotype_rules
         WHERE gene_id=$1
         AND allele_combination IN ($2,$3)
         LIMIT 1`,
        [geneId, diplotype1, diplotype2]
      );
  
      return {
        gene: geneSymbol,
        diplotype,
        activityScore: null,
        phenotype: res.rows[0]?.phenotype || "unknown"
      };
    }
  
    if(geneType === "function"){
  
      const funcRes = await db.query(
        `SELECT name, allele_function
         FROM alleles
         WHERE gene_id=$1 AND name = ANY($2)`,
        [geneId, diplotype]
      );
  
      if (funcRes.rows.length === 0) {
        throw new Error(`No alleles found for ${geneSymbol}`);
      }
  
      const functions = diplotype.map(allele => {
        const match = funcRes.rows.find(r => r.name === allele);
        return normalize(match?.allele_function) || "unknown";
      });
  
      let category = "normal";
  
      if (functions.includes("deficient")) {
        category = "deficient";
      }
  
      else if (geneSymbol === "NAT2") {
  
        const increasedCount = functions.filter(f => f.includes("increased")).length;
        const decreasedCount = functions.filter(f => f.includes("decreased")).length;
  
        if (decreasedCount === 2) {
          category = "slow";
        } 
        else if (increasedCount === 2) {
          category = "fast";
        } 
        else {
          category = "intermediate";
        }
      }
  
      else {
  
        const decreasedCount = functions.filter(f => 
          f.includes("decreased")
        ).length;
  
        if (decreasedCount === 2) {
          category = "low";
        }
        else if (decreasedCount === 1) {
          category = "decreased";
        }
        else {
          category = "normal";
        }
      }
  
      const phenotypeRes = await db.query(
        `SELECT phenotype
         FROM phenotype_rules
         WHERE gene_id=$1
         AND allele_combination=$2
         LIMIT 1`,
        [geneId, category]
      );
  
      return {
        gene: geneSymbol,
        diplotype,
        activityScore: null,
        phenotype: phenotypeRes.rows[0]?.phenotype || "unknown"
      };
    }
  
    if(geneType === "risk"){
  
      for(const allele of diplotype){
  
        const alleleCheck = await db.query(
          `SELECT 1 FROM alleles
           WHERE gene_id=$1 AND name=$2`,
          [geneId, allele]
        );
  
        if(alleleCheck.rows.length > 0){
          return {
            gene: geneSymbol,
            diplotype,
            activityScore: null,
            phenotype: "carrier"
          };
        }
      }
  
      return {
        gene: geneSymbol,
        diplotype,
        activityScore: null,
        phenotype: "non carrier"
      };
    }
  }