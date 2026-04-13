import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

async function importDrugGeneInteractions() {
  const interactions = [];

  fs.createReadStream(new URL("../data/drug_gene_interactions.csv", import.meta.url))
    .pipe(csv())
    .on("data", (row) => {
      interactions.push({
        drug: row.drug.trim().toLowerCase(),
        gene: row.gene.trim().toUpperCase(),
        effect: row.effect.trim().toLowerCase(),
        strength: row.strength.trim().toLowerCase(),
        source: row.source?.trim() || null,
        evidence_level: row.evidence_level?.trim() || null,
      });
    })
    .on("end", async () => {
      try {
        for (const i of interactions) {
          const drugRes = await db.query(
            "SELECT id FROM drugs WHERE name = $1",
            [i.drug]
          );

          if (drugRes.rows.length === 0) {
            console.warn(`Drug not found: ${i.drug} → skipping`);
            continue;
          }

          const drugId = drugRes.rows[0].id;
          const geneRes = await db.query(
            "SELECT id FROM genes WHERE symbol = $1",
            [i.gene]
          );

          if (geneRes.rows.length === 0) {
            console.warn(`Gene not found: ${i.gene} → skipping`);
            continue;
          }

          const geneId = geneRes.rows[0].id;

          await db.query(
            `INSERT INTO drug_gene_interactions 
            (drug_id, gene_id, effect, strength, source, evidence_level)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              drugId,
              geneId,
              i.effect,
              i.strength,
              i.source,
              i.evidence_level,
            ]
          );
        }

        console.log("drug_gene_interactions import finished");
        process.exit(0);

      } catch (err) {
        console.error("Import error:", err);
        process.exit(1);
      }
    });
}

importDrugGeneInteractions();