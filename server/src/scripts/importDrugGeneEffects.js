import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/drug_gene_effects.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      drug: data.drug.trim(),
      gene: data.gene.trim(),
      phenotype: data.phenotype.trim(),
      effect: data.effect.trim(),
      strength: data.strength ? data.strength.trim() : null,
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const drugRes = await client.query(`SELECT id, name FROM drugs`);
      const geneRes = await client.query(`SELECT id, symbol FROM genes`);

      const drugMap = {};
      const geneMap = {};

      drugRes.rows.forEach((d) => {
        drugMap[d.name.toLowerCase()] = d.id;
      });

      geneRes.rows.forEach((g) => {
        geneMap[g.symbol] = g.id;
      });

      for (const row of results) {
        const drug_id = drugMap[row.drug.toLowerCase()];
        const gene_id = geneMap[row.gene];

        if (!drug_id) {
          console.warn(`Drug not found: ${row.drug}`);
          continue;
        }

        if (!gene_id) {
          console.warn(`Gene not found: ${row.gene}`);
          continue;
        }

        if (!row.phenotype) {
          console.warn(`Missing phenotype: ${row.drug} / ${row.gene}`);
          continue;
        }

        await client.query(
          `
          INSERT INTO drug_gene_effects 
          (drug_id, gene_id, effect, strength, phenotype)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            drug_id,
            gene_id,
            row.effect,
            row.strength,
            row.phenotype,
          ]
        );
      }

      await client.query("COMMIT");
      console.log("Drug-gene effects import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing drug_gene_effects:", err);
    } finally {
      client.release();
    }
  });