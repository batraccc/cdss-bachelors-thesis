import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/alleles.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      gene: data.gene.trim(),
      name: data.allele.trim(),
      activity_score: data.activity_score
        ? parseFloat(data.activity_score)
        : null,
      allele_function: data.allele_function
        ? data.allele_function.trim()
        : null,
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const allele of results) {
        const geneRes = await client.query(
          `SELECT id FROM genes WHERE symbol = $1`,
          [allele.gene]
        );

        if (geneRes.rows.length === 0) {
          console.warn(`⚠️ Gene not found: ${allele.gene}`);
          continue;
        }

        const gene_id = geneRes.rows[0].id;

        await client.query(
          `
          INSERT INTO alleles (gene_id, name, activity_score, allele_function)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
          `,
          [
            gene_id,
            allele.name,
            allele.activity_score,
            allele.allele_function,
          ]
        );
      }

      await client.query("COMMIT");
      console.log("Alleles import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing alleles:", err);
    } finally {
      client.release();
    }
  });