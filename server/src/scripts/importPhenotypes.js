import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/phenotype_rules.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      gene: data.gene.trim(),
      min_score: data.min_score ? parseFloat(data.min_score) : null,
      max_score: data.max_score ? parseFloat(data.max_score) : null,
      phenotype: data.phenotype.trim(),
      allele_combination: data.allele_combination
        ? data.allele_combination.trim()
        : null,
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const geneRes = await client.query(`SELECT id, symbol FROM genes`);
      const geneMap = {};

      geneRes.rows.forEach((g) => {
        geneMap[g.symbol] = g.id;
      });

      for (const rule of results) {
        const gene_id = geneMap[rule.gene];

        if (!gene_id) {
          console.warn(`Gene not found: ${rule.gene}`);
          continue;
        }

        if (!rule.phenotype) {
          console.warn(`Missing phenotype for gene ${rule.gene}`);
          continue;
        }

        if (
          rule.min_score === null &&
          rule.allele_combination === null
        ) {
          console.warn(
            `Invalid rule (no score or allele): ${rule.gene}`
          );
          continue;
        }

        await client.query(
          `
          INSERT INTO phenotype_rules 
          (gene_id, min_score, max_score, phenotype, allele_combination)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            gene_id,
            rule.min_score,
            rule.max_score,
            rule.phenotype,
            rule.allele_combination,
          ]
        );
      }

      await client.query("COMMIT");
      console.log("Phenotype rules import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing phenotype rules:", err);
    } finally {
      client.release();
    }
  });