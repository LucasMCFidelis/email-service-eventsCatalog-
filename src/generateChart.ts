import fs from "fs";
// @ts-ignore
import { merge } from "mochawesome-merge";

interface ScenarioData {
  name: string;
  duration: number;
}

(async () => {
  const report = await merge({ files: ["cypress/reports/*.json"] });

  let passed = 0,
    failed = 0,
    skipped = 0;
  const timeByScenario: ScenarioData[] = [];
  const testsByFile: Record<string, number> = {};

  for (const result of report.results) {
    const file = result.file;
    if (!testsByFile[file]) testsByFile[file] = 0;

    for (const suite of result.suites) {
      for (const test of suite.tests) {
        testsByFile[file]++;
        if (test.pass) passed++;
        if (test.fail) failed++;
        if (test.skipped) skipped++;

        timeByScenario.push({
          name: test.fullTitle,
          duration: test.duration ?? 0,
        });
      }
    }
  }

  function breakLine(text: string, maxLen = 25): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length > maxLen) {
        lines.push(current.trim());
        current = word;
      } else {
        current += " " + word;
      }
    }

    if (current) lines.push(current.trim());
    return lines;
  }

  const labelsLine = timeByScenario.map((t) => {
    const splitName = t.name.split(" - ");
    const middleSection = splitName.length >= 2 ? splitName[1] : t.name;
    return breakLine(middleSection);
  });

  const dataLine = timeByScenario.map((t) => t.duration);
  const labelsFile = Object.keys(testsByFile).map(f => {
    const normalized = f.replace(/\\/g, '/'); // converte \ para /
    const cleaned = normalized
      .replace('cypress/e2e/api/', '')
      .replace('.cy.ts', '');
    return `"${cleaned}"`;
  });
  const dataFile = Object.values(testsByFile);

  const chartData = `
    // Gráfico de Pizza
    new Chart(document.getElementById('chartPie'), {
      type: 'pie',
      data: {
        labels: ['${passed} - Passaram', '${failed} - Falharam', '${skipped} - Ignorados'],
        datasets: [{
          data: [${passed}, ${failed}, ${skipped}],
          backgroundColor: ['#22c55e', '#ef4444', '#facc15']
        }]
      }
    });

    // Gráfico de Linha
    new Chart(document.getElementById('chartLine'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(labelsLine)},
        datasets: [{
          label: 'Duração por cenário (ms)',
          data: [${dataLine}],
          borderColor: '#3b82f6',
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 60,
              minRotation: 60
            }
          }
        },
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return timeByScenario[context[0].dataIndex].name;
              }
            }
          }
        }
      }
    });

    // Gráfico de Barras
    new Chart(document.getElementById('chartBar'), {
      type: 'bar',
      data: {
        labels: [${labelsFile}],
        datasets: [{
          label: 'Testes por arquivo de spec',
          data: [${dataFile}],
          backgroundColor: '#a78bfa'
        }]
      },
      options: {
        indexAxis: 'y'
      }
    });
  `;

  fs.writeFileSync("./dist/chart-data.js", chartData);
  console.log("✅ Arquivo chart-data.js gerado com sucesso!");
})();
