const EXCHANGES_URL = "https://api.coinlore.net/api/exchanges/";
const MARKETS_URL = `https://api.coinlore.net/api/coin/markets/?id=90`;
const URL_COINS = `https://api.coinlore.net/api/tickers/`
let exchangesData = [], coinsData = [], chartExchanges, chartCoins;

const el = (id) => document.getElementById(id);

//Calcular total de casas de cambio con reduce
const getTotalExchanges = (data) => {
  return data.reduce((total) => total + 1, 0);
};

//Calcular precio medio 
const getAveragePrice = (data) => {
  //Ver si el precio esta correcto
  const validPrices = data.filter(coin =>
    coin.price_usd && parseFloat(coin.price_usd) > 0
  );
  //Sumar todos los precios
  const total = validPrices.reduce((sum, coin) =>
    sum + parseFloat(coin.price_usd), 0
  );
  return validPrices.length > 0 ? total / validPrices.length : 0;
};

//Moneda mas cara 
const getMostExpensive = (data) => {
  //Saber si es valido
  const validCoins = data.filter(coin =>
    coin.price_usd && parseFloat(coin.price_usd) > 0
  );
  //Validar 
  return validCoins.reduce((max, coin) => {
    const price = parseFloat(coin.price_usd);
    const maxPrice = parseFloat(max.price_usd);
    return price > maxPrice ? coin : max;
  }, validCoins[0]);
};

//Top 10 monedas 
const getTop10Coins = (data) => {
  return data
    .filter(coin => coin.price_usd && parseFloat(coin.price_usd) > 0)
    .sort((a, b) => parseFloat(b.price_usd) - parseFloat(a.price_usd))
    .slice(0, 10)
    .map(coin => ({
      name: coin.name,
      symbol: coin.symbol,
      price_usd: parseFloat(coin.price_usd)
    }));
};

//Top Casas de Cambio
const getTop10Exchanges = (data) => {
  return data
    .filter(ex => ex.volume_usd && parseFloat(ex.volume_usd) > 0)
    .sort((a, b) => parseFloat(b.volume_usd) - parseFloat(a.volume_usd))
    .slice(0, 10)
    .map(ex => ({
      name: ex.name,
      base: ex.base,
      quote: ex.quote,
      volume_usd: parseFloat(ex.volume_usd),
      price_usd: parseFloat(ex.price_usd || 0)
    }));
};
//Buscar monedas  por tabla
const setupSearch = (inputId, data, renderFunction, searchFields) => {
  const input = el(inputId);
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
      renderFunction(data);
      return;
    }
    
    const filtered = data.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(searchTerm);
      });
    });
    
    renderFunction(filtered);
  });
};

//Renderizar tablas 
const renderCoinsTable = (data) => {
  const tbody = el("tableCoins");
  if (!tbody) return;
  
  tbody.innerHTML = data.map(coin => `
    <tr>
      <td><strong>${coin.name}</strong></td>
      <td><span class="badge badge-soft">${coin.symbol}</span></td>
      <td><strong>${fmtUSD(parseFloat(coin.price_usd))}</strong></td>
      <td class="${parseFloat(coin.percent_change_24h) >= 0 ? 'text-success' : 'text-danger'}">
        ${parseFloat(coin.percent_change_24h).toFixed(2)}%
      </td>
    </tr>
  `).join('');
};

//Renderizar tabla de exchanges usando map
const renderExchangesTable = (data) => {
  const tbody = el("tableExchanges");
  if (!tbody) return;
  
  tbody.innerHTML = data.map(ex => `
    <tr>
      <td><strong>${ex.name}</strong></td>
      <td><span class="badge badge-soft">${ex.base}/${ex.quote}</span></td>
      <td><strong>${fmtUSD(parseFloat(ex.price_usd))}</strong></td>
      <td class="text-info">${fmtUSD(parseFloat(ex.volume_usd))}</td>
    </tr>
  `).join('');
};
//En vez de usar Fetch utilice axios
let refresh = async () => {
  try {
    //Cargar las monedas
    const resCoins = await axios.get(URL_COINS);
    coinsData = resCoins.data.data;
    console.log("Monedas cargadas:", coinsData.length);

    //Cargar las casas de cambio
    const resExchanges = await axios.get(MARKETS_URL);
    exchangesData = resExchanges.data;
    console.log("Casas de cambio cargadas:", exchangesData.length);

    //1 Total de casas
    el("totalExchanges").textContent = getTotalExchanges(exchangesData);

    //2 Precio medio
    el("avgPrice").textContent = fmtUSD(getAveragePrice(coinsData));

    //3 Moneda mas cara 
    const mostExpensive = getMostExpensive(coinsData);
    el("mostExpensive").textContent = `${mostExpensive.name} (${fmtUSD(parseFloat(mostExpensive.price_usd))})`;

    //4 Top Monedas
    const top10Coins = getTop10Coins(coinsData);
    renderCoinChart(top10Coins);
    console.log("Top 10 monedas:", top10Coins);

    //5 Top Casas
    const top10Exchanges = getTop10Exchanges(exchangesData);
    renderExchangesChart(top10Exchanges);
    console.log("Top 10 exchanges:", top10Exchanges);

    //6 Renderizar Tablas
    renderCoinsTable(coinsData);
    renderExchangesTable(exchangesData);
    console.log("Tablas renderizadas");

    //7 Configurar Buscadores
    setupSearch("searchCoins", coinsData, renderCoinsTable, ['name', 'symbol']);
    setupSearch("searchExchanges", exchangesData, renderExchangesTable, ['name', 'base', 'quote']);
    console.log("Buscadores configurados");
    
  } catch (error) {
    console.error("Error:", error);
  }
};

//Funcion solo para devolver los colores
const getColorPalette = (count) => {
  const base = [
    "#06d6a0", "#4cc9f0", "#f72585", "#ffd166", "#48bfe3",
    "#8338ec", "#ff7b00", "#80ed99", "#00f5d4", "#a2d2ff",
    "#ef476f", "#06b6d4", "#22c55e", "#f59e0b", "#38bdf8",
  ];
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
};

//Funcion para formatear a USD
const fmtUSD = (n) => {
  if (!n || isNaN(n)) return "—";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
  return "$" + n.toFixed(2);
};

//Cargar grafico de monedas
function renderCoinChart(dataTop) {
  const labels = dataTop.map((x) => x.name);
  const prices = dataTop.map((x) => x.price_usd);
  const colors = getColorPalette(labels.length);
  const ctx = el("chartCoin").getContext("2d");
  
  if (chartCoins) chartCoins.destroy();
  
  chartCoins = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Precio USD",
        data: prices,
        backgroundColor: colors.map((c) => c + "cc"),
        borderColor: colors,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          ticks: {
            color: "#c2c8d6",
            callback: (v) => fmtUSD(v),
            font: { size: 12 }
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: {
            color: "#c2c8d6",
            font: { size: 12, weight: '500' }
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 19, 26, 0.95)',
          titleColor: '#e6e9ef',
          bodyColor: '#06d6a0',
          borderColor: '#06d6a0',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            title: (context) => dataTop[context[0].dataIndex].name,
            label: (context) => `Precio: ${fmtUSD(context.parsed.x)}`
          }
        }
      },
      layout: {
        padding: {
          left: 10,
          right: 20,
          top: 10,
          bottom: 10
        }
      }
    },
  });
}

//Cargar grafico de exchanges
function renderExchangesChart(dataTop) {
  const labels = dataTop.map((x) => x.name);
  const volumes = dataTop.map((x) => x.volume_usd);
  const colors = getColorPalette(labels.length);
  const ctx = el("chartExchanges").getContext("2d");

  if (chartExchanges) chartExchanges.destroy();

  chartExchanges = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Volumen USD",
        data: volumes,
        backgroundColor: colors.map((c) => c + "cc"),
        borderColor: colors,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          ticks: {
            color: "#c2c8d6",
            callback: (v) => fmtUSD(v),
            font: { size: 12 }
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: {
            color: "#c2c8d6",
            font: { size: 12, weight: '500' }
          },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 19, 26, 0.95)',
          titleColor: '#e6e9ef',
          bodyColor: '#4cc9f0',
          borderColor: '#4cc9f0',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            title: (context) => {
              const ex = dataTop[context[0].dataIndex];
              return `${ex.name} (${ex.base}/${ex.quote})`;
            },
            label: (context) => `Volumen: ${fmtUSD(context.parsed.x)}`
          }
        }
      },
      layout: {
        padding: {
          left: 10,
          right: 20,
          top: 10,
          bottom: 10
        }
      }
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  //EVENTOS
  el("btnReload").addEventListener("click", () => refresh());
});