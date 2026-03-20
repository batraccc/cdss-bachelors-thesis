import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/gene_drug_guidelines.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      gene: data.gene_id.trim(),
      drug: data.drug_id.trim(),
      phenotype: data.phenotype.trim(),
      recommendation: data.recommendation_summary.trim(),
      alternatives: data.alternatives
        ? data.alternatives.trim()
        : null,
      evidence_level: data.evidence_level
        ? data.evidence_level.trim()
        : null,
      source: data.source ? data.source.trim() : null,
      guideline_version_id: data.guideline_version
        ? parseInt(data.guideline_version)
        : null,
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const geneRes = await client.query(`SELECT id, symbol FROM genes`);
      const drugRes = await client.query(`SELECT id, name FROM drugs`);

      const geneMap = {};
      const drugMap = {};

      geneRes.rows.forEach((g) => {
        geneMap[g.symbol] = g.id;
      });

      drugRes.rows.forEach((d) => {
        drugMap[d.name.toLowerCase()] = d.id;
      });

      for (const row of results) {
        const gene_id = geneMap[row.gene];
        const drug_id = drugMap[row.drug.toLowerCase()];

        if (!gene_id) {
          console.warn(`Gene not found: ${row.gene}`);
          continue;
        }

        if (!drug_id) {
          console.warn(`Drug not found: ${row.drug}`);
          continue;
        }

        if (!row.phenotype || !row.recommendation) {
          console.warn(
            `Missing phenotype/recommendation: ${row.gene} / ${row.drug}`
          );
          continue;
        }

        await client.query(
          `
          INSERT INTO gene_drug_guidelines 
          (gene_id, drug_id, phenotype, recommendation_summary, alternatives, evidence_level, source, guideline_version_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            gene_id,
            drug_id,
            row.phenotype,
            row.recommendation,
            row.alternatives,
            row.evidence_level,
            row.source,
            row.guideline_version_id,
          ]
        );
      }

      await client.query("COMMIT");
      console.log("Guidelines import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing guidelines:", err);
    } finally {
      client.release();
    }
  });