import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [genes, setGenes] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [gene, setGene] = useState("");
  const [allele1, setAllele1] = useState("");
  const [allele2, setAllele2] = useState("");
  const [currentDrugs, setCurrentDrugs] = useState("");
  const [plannedDrug, setPlannedDrug] = useState("");

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/genes")
      .then(res => res.json())
      .then(data => setGenes(data));

    fetch("/api/drugs")
      .then(res => res.json())
      .then(data => setDrugs(data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      gene: gene,
      diplotype: [allele1, allele2],
      currentDrugs: currentDrugs
        .split(",")
        .map(d => d.trim())
        .filter(d => d),
      plannedDrug: plannedDrug
    };

    try {
      const response = await fetch("/api/interpret/genotype", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error("Server error: " + text);
      }

      const data = JSON.parse(text);
      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <h1>Pharmacogenomic CDSS</h1>

      <form onSubmit={handleSubmit}>
        <h2>Single Gene Interpretation</h2>

        <label>Gene</label>
        <input
          list="genes"
          value={gene}
          onChange={e => setGene(e.target.value)}
        />
        <datalist id="genes">
          {genes.map(g => <option key={g} value={g} />)}
        </datalist>

        <label>Diplotype</label>
        <div className="diplotype">
          <input
            value={allele1}
            onChange={e => setAllele1(e.target.value)}
            placeholder="Allele 1"
          />
          <span>/</span>
          <input
            value={allele2}
            onChange={e => setAllele2(e.target.value)}
            placeholder="Allele 2"
          />
        </div>

        <label>Current Drugs</label>
        <input
          list="drugs"
          value={currentDrugs}
          onChange={e => setCurrentDrugs(e.target.value)}
        />

        <label>Planned Drug</label>
        <input
          list="drugs"
          value={plannedDrug}
          onChange={e => setPlannedDrug(e.target.value)}
        />

        <datalist id="drugs">
          {drugs.map(d => <option key={d} value={d} />)}
        </datalist>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Interpret"}
        </button>
      </form>

      {loading && <div className="loading">Processing...</div>}
      {error && <div className="error">{error}</div>}

      {result && result.ok && (
        <div className="result-card">
          <h2>Result</h2>

          <div className="result-section">
            <span className="label">Genotype</span>
            <span className="value">
              {result.genetics.gene}{" "}
              {result.genetics.diplotype?.join("/") || ""}
            </span>
          </div>

          <div className="result-section">
            <span className="label">Phenotype</span>
            <span className="value">
              {result.genetics.phenotype}
            </span>
          </div>

          <div className="result-section">
            <span className="label">Adjusted phenotype</span>
            <span className="value">
              {result.phenoconversion.adjustedPhenotype}
            </span>
          </div>

          <div className="result-section">
            <span className="label">Phenoconversion reason</span>
            <span className="muted">
              {result.phenoconversion.reason || "None"}
            </span>
          </div>

          <div className="recommendation-box">
            <h3>Recommendation</h3>

            {result.recommendation.recommendation ? (
              <>
                <p className="value">
                  {result.recommendation.recommendation}
                </p>

                <p>
                  <span className="label">Alternatives:</span>{" "}
                  <span className="muted">
                    {result.recommendation.alternatives || "None"}
                  </span>
                </p>

                <p className="muted">
                  {result.recommendation.evidenceLevel} (
                  {result.recommendation.source})
                </p>
              </>
            ) : (
              <p className="muted">
                {result.recommendation.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;