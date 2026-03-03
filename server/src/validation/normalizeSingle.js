export function normalizeSingleInput(data) {
    return {
      gene: data.gene.trim().toUpperCase(),
  
      diplotype: data.diplotype.map(a => a.trim()),
  
      currentDrugs: data.currentDrugs
        ? data.currentDrugs
            .map(d => d.trim())
            .filter(d => d.length > 0)
        : [],
  
      plannedDrug: data.plannedDrug.trim()
    };
  }