import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/genes.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      symbol: data.symbol.trim(),
      name: data.name.trim(),
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const gene of results) {
        await client.query(
          `
          INSERT INTO genes (symbol, name)
          VALUES ($1, $2)
          ON CONFLICT (symbol) DO NOTHING
          `,
          [gene.symbol, gene.name]
        );
      }

      await client.query("COMMIT");
      console.log("Genes import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing genes:", err);
    } finally {
      client.release();
    }
  });