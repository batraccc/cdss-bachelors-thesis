import fs from "fs";
import csv from "csv-parser";
import db from "../db/db.js";

const results = [];

fs.createReadStream("src/data/drugs.csv")
  .pipe(csv())
  .on("data", (data) => {
    results.push({
      name: data.drug_name.trim(),
      drug_class: data.drug_class
        ? data.drug_class.trim()
        : null,
    });
  })
  .on("end", async () => {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const drug of results) {
        await client.query(
          `
          INSERT INTO drugs (name, drug_class)
          VALUES ($1, $2)
          ON CONFLICT (name) DO NOTHING
          `,
          [drug.name, drug.drug_class]
        );
      }

      await client.query("COMMIT");
      console.log("Drugs import successful");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error importing drugs:", err);
    } finally {
      client.release();
    }
  });