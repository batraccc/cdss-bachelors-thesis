import db from "../db/db.js";
import { getDrugRecommendation } from "../services/guidelineService.js";
import fs from "fs";

async function runTests(){

  const results = [];

  const genes = await db.query("SELECT id, symbol FROM genes");

  for(const geneRow of genes.rows){

    const geneId = geneRow.id;
    const gene = geneRow.symbol;

    console.log("Testing gene:", gene);

    const phenotypesRes = await db.query(
      `SELECT DISTINCT phenotype
       FROM phenotype_rules
       WHERE gene_id = $1`,
      [geneId]
    );

    const drugsRes = await db.query(
      `SELECT DISTINCT d.name
       FROM gene_drug_guidelines gdg
       JOIN drugs d ON d.id = gdg.drug_id
       WHERE gdg.gene_id = $1`,
      [geneId]
    );

    for(const phRow of phenotypesRes.rows){
      const phenotype = phRow.phenotype;

      for(const drugRow of drugsRes.rows){
        const drug = drugRow.name;

        const rec = await getDrugRecommendation(
          gene,
          phenotype,
          drug
        );

        results.push({
          gene,
          phenotype,
          drug,
          recommendation: rec.recommendation || rec.message
        });
      }
    }
  }

  const header = "gene,phenotype,drug,recommendation\n";

  const rows = results.map(r =>
    `${r.gene},${r.phenotype},${r.drug},"${r.recommendation}"`
  ).join("\n");

  fs.writeFileSync("validation_results.csv", header + rows);

  console.log("Validation finished.");
}

runTests();