// Market Analysis JavaScript - VGT Dashboard

let historicalData = null;
let currentSymbol = CONFIG.DEFAULT_TICKER;

function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    document.getElementById('loadingMessage').style.display = 'none';
}

async function fetchRealData() {
    try {
        const url = `${CONFIG.API_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${currentSymbol}&outputsize=full&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message']) {
            throw new Error('Invalid API call or symbol not found');
        }

        if (data['Note']) {
            throw new Error('API call limit reached (25/day). Please try again tomorrow or wait a few minutes.');
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            throw new Error('No data returned from API');
        }

        const processedData = [];
        const dates = Object.keys(timeSeries).sort();

        for (const date of dates) {
            const dayData = timeSeries[date];
            processedData.push({
                date: date,
                price: parseFloat(dayData['4. close']),
                volume: parseInt(dayData['5. volume']),
                open: parseFloat(dayData['1. open']),
                high: parseFloat(dayData['2. high']),
                low: parseFloat(dayData['3. low'])
            });
        }

        return processedData;

    } catch (error) {
        showError(`⚠️ Error: ${error.message}`);
        throw error;
    }
}

async function loadAllData() {
    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';

    try {
        historicalData = await fetchRealData();

        if (!historicalData || historicalData.length === 0) {
            throw new Error('No data available');
        }

        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        const currentPrice = historicalData[historicalData.length - 1].price;
        const previousPrice = historicalData[historicalData.length - 2].price;
        const priceChange = ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2);

        document.getElementById('currentPrice').textContent = `$${currentPrice.toFixed(2)}`;
        const changeElement = document.getElementById('priceChange');
        changeElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange}%`;
        changeElement.style.color = priceChange > 0 ? '#10b981' : '#ef4444';
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();

        loadMovingAverages(historicalData, currentPrice);
        loadRSI(historicalData, currentPrice);
        loadMACD(historicalData);
        loadBollingerBands(historicalData, currentPrice);
        loadVolume(historicalData);
        loadSupportResistance(historicalData, currentPrice);

        // Load news after technical indicators
        fetchNews();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function calculateMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.price, 0);
        result.push(sum / period);
    }
    return result;
}

function calculateRSI(data, period = 14) {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
        changes.push(data[i].price - data[i - 1].price);
    }

    let avgGain = 0, avgLoss = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) avgGain += changes[i];
        else avgLoss -= changes[i];
    }
    avgGain /= period;
    avgLoss /= period;

    const rsi = [];
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }

        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
        ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }

    return ema;
}

function calculateMACD(data) {
    const prices = data.map(d => d.price);
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);

    const macdLine = [];
    for (let i = 0; i < ema12.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = calculateEMA(macdLine, 9);
    const histogram = [];

    for (let i = 0; i < signalLine.length; i++) {
        histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
    }

    return { macdLine, signalLine, histogram };
}

function calculateBollingerBands(data, period = 20) {
    const prices = data.map(d => d.price);
    const ma = calculateMA(data, period);
    const currentMA = ma[ma.length - 1];

    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => {
        return sum + Math.pow(price - currentMA, 2);
    }, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
        upper: currentMA + (2 * stdDev),
        middle: currentMA,
        lower: currentMA - (2 * stdDev)
    };
}

function loadMovingAverages(data, currentPrice) {
    const ma20Data = calculateMA(data, 20);
    const ma50Data = calculateMA(data, 50);
    const ma200Data = calculateMA(data, 200);

    const ma20 = ma20Data[ma20Data.length - 1];
    const ma50 = ma50Data[ma50Data.length - 1];
    const ma200 = ma200Data[ma200Data.length - 1];

    document.getElementById('ma20').textContent = `$${ma20.toFixed(2)}`;
    document.getElementById('ma50').textContent = `$${ma50.toFixed(2)}`;
    document.getElementById('ma200').textContent = `$${ma200.toFixed(2)}`;

    let signal = 'neutral';
    let signalClass = 'signal-neutral';
    let explanation = '';

    if (currentPrice > ma20 && currentPrice > ma50 && currentPrice > ma200) {
        signal = 'BUY';
        signalClass = 'signal-buy';
        explanation = `The current price ($${currentPrice.toFixed(2)}) is trading above all major moving averages. This is a <strong>bullish signal</strong> indicating strong upward momentum. The stock is in an uptrend across short, medium, and long-term timeframes.`;
    } else if (currentPrice < ma20 && currentPrice < ma50 && currentPrice < ma200) {
        signal = 'SELL';
        signalClass = 'signal-sell';
        explanation = `The current price ($${currentPrice.toFixed(2)}) is trading below all major moving averages. This is a <strong>bearish signal</strong> indicating downward pressure. Consider waiting for a trend reversal before buying.`;
    } else {
        signal = 'NEUTRAL';
        signalClass = 'signal-neutral';
        explanation = `The price is showing mixed signals relative to the moving averages. Currently at $${currentPrice.toFixed(2)} vs MA20: $${ma20.toFixed(2)}, MA50: $${ma50.toFixed(2)}, MA200: $${ma200.toFixed(2)}. Wait for clearer trend confirmation.`;
    }

    document.getElementById('ma-signal').textContent = signal;
    document.getElementById('ma-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('ma-explanation').innerHTML = explanation;

    const dates = data.slice(-100).map(d => d.date);
    const prices = data.slice(-100).map(d => d.price);

    const trace1 = { x: dates, y: prices, type: 'scatter', mode: 'lines', name: 'Price', line: { color: '#667eea', width: 3 } };
    const trace2 = { x: dates.slice(-ma20Data.length), y: ma20Data.slice(-100), type: 'scatter', mode: 'lines', name: '20-Day MA', line: { color: '#10b981', width: 2 } };
    const trace3 = { x: dates.slice(-ma50Data.length), y: ma50Data.slice(-100), type: 'scatter', mode: 'lines', name: '50-Day MA', line: { color: '#f59e0b', width: 2 } };
    const trace4 = { x: dates.slice(-ma200Data.length), y: ma200Data.slice(-100), type: 'scatter', mode: 'lines', name: '200-Day MA', line: { color: '#ef4444', width: 2 } };

    const layout = { showlegend: true, legend: { x: 0, y: 1 }, margin: { t: 20, r: 20, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'Price ($)' }, hovermode: 'x unified' };
    Plotly.newPlot('ma-chart', [trace1, trace2, trace3, trace4], layout, { responsive: true });
}

function loadRSI(data, currentPrice) {
    const rsiValues = calculateRSI(data);
    const rsi = rsiValues[rsiValues.length - 1];

    document.getElementById('rsi-value').textContent = rsi.toFixed(2);

    let signal, signalClass, status, explanation;

    if (rsi > 70) {
        signal = 'SELL'; signalClass = 'signal-sell'; status = 'Overbought';
        explanation = `RSI is at ${rsi.toFixed(2)}, above 70 (overbought). The stock may be overextended and due for a <strong>pullback</strong>. Consider taking profits.`;
    } else if (rsi < 30) {
        signal = 'BUY'; signalClass = 'signal-buy'; status = 'Oversold';
        explanation = `RSI is at ${rsi.toFixed(2)}, below 30 (oversold). The stock may be <strong>undervalued and due for a bounce</strong>. Good buying opportunity if other indicators confirm.`;
    } else if (rsi >= 50) {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral'; status = 'Bullish';
        explanation = `RSI is at ${rsi.toFixed(2)}, above 50 but below 70. <strong>Moderately bullish momentum</strong> without being overbought. Room to move higher.`;
    } else {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral'; status = 'Bearish';
        explanation = `RSI is at ${rsi.toFixed(2)}, below 50 but above 30. <strong>Moderately bearish momentum</strong>. Watch for further weakness or reversal.`;
    }

    document.getElementById('rsi-status').textContent = status;
    document.getElementById('rsi-signal').textContent = signal;
    document.getElementById('rsi-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('rsi-explanation').innerHTML = explanation;

    const dates = data.slice(-60).map(d => d.date);
    const rsiForChart = rsiValues.slice(-60);

    const trace1 = { x: dates.slice(-rsiForChart.length), y: rsiForChart, type: 'scatter', mode: 'lines', name: 'RSI', line: { color: '#667eea', width: 3 }, fill: 'tozeroy', fillcolor: 'rgba(102, 126, 234, 0.1)' };
    const layout = {
        shapes: [
            { type: 'line', x0: dates[0], x1: dates[dates.length - 1], y0: 70, y1: 70, line: { color: '#ef4444', width: 2, dash: 'dash' } },
            { type: 'line', x0: dates[0], x1: dates[dates.length - 1], y0: 30, y1: 30, line: { color: '#10b981', width: 2, dash: 'dash' } },
            { type: 'line', x0: dates[0], x1: dates[dates.length - 1], y0: 50, y1: 50, line: { color: '#94a3b8', width: 1, dash: 'dot' } }
        ],
        annotations: [
            { x: dates[dates.length - 1], y: 70, text: 'Overbought', showarrow: false, xanchor: 'left', font: { color: '#ef4444' } },
            { x: dates[dates.length - 1], y: 30, text: 'Oversold', showarrow: false, xanchor: 'left', font: { color: '#10b981' } }
        ],
        showlegend: false, margin: { t: 20, r: 50, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'RSI', range: [0, 100] }
    };
    Plotly.newPlot('rsi-chart', [trace1], layout, { responsive: true });
}

function loadMACD(data) {
    const macdData = calculateMACD(data);
    const macdLine = macdData.macdLine[macdData.macdLine.length - 1];
    const signalLine = macdData.signalLine[macdData.signalLine.length - 1];
    const histogram = macdData.histogram[macdData.histogram.length - 1];

    document.getElementById('macd-value').textContent = macdLine.toFixed(2);
    document.getElementById('macd-signal-value').textContent = signalLine.toFixed(2);
    document.getElementById('macd-histogram').textContent = histogram.toFixed(2);

    let signal, signalClass, explanation;

    if (macdLine > signalLine && histogram > 0) {
        signal = 'BUY'; signalClass = 'signal-buy';
        explanation = `MACD line (${macdLine.toFixed(2)}) is above signal line (${signalLine.toFixed(2)}) with positive histogram. <strong>Bullish crossover</strong> - good time to buy or hold.`;
    } else if (macdLine < signalLine && histogram < 0) {
        signal = 'SELL'; signalClass = 'signal-sell';
        explanation = `MACD line (${macdLine.toFixed(2)}) is below signal line (${signalLine.toFixed(2)}) with negative histogram. <strong>Bearish crossover</strong> - consider selling.`;
    } else {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Mixed MACD signals. MACD: ${macdLine.toFixed(2)}, Signal: ${signalLine.toFixed(2)}. Wait for clearer crossover.`;
    }

    document.getElementById('macd-signal').textContent = signal;
    document.getElementById('macd-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('macd-explanation').innerHTML = explanation;

    const dates = data.slice(-60).map(d => d.date);
    const macdForChart = macdData.macdLine.slice(-60);
    const signalForChart = macdData.signalLine.slice(-60);
    const histogramForChart = macdData.histogram.slice(-60);

    const trace1 = { x: dates.slice(-macdForChart.length), y: macdForChart, type: 'scatter', mode: 'lines', name: 'MACD', line: { color: '#667eea', width: 2 } };
    const trace2 = { x: dates.slice(-signalForChart.length), y: signalForChart, type: 'scatter', mode: 'lines', name: 'Signal', line: { color: '#ef4444', width: 2 } };
    const trace3 = { x: dates.slice(-histogramForChart.length), y: histogramForChart, type: 'bar', name: 'Histogram', marker: { color: histogramForChart.map(v => v > 0 ? '#10b981' : '#ef4444') } };

    const layout = { showlegend: true, legend: { x: 0, y: 1 }, margin: { t: 20, r: 20, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'MACD' } };
    Plotly.newPlot('macd-chart', [trace3, trace1, trace2], layout, { responsive: true });
}

function loadBollingerBands(data, currentPrice) {
    const bb = calculateBollingerBands(data);

    document.getElementById('bb-upper').textContent = `$${bb.upper.toFixed(2)}`;
    document.getElementById('bb-middle').textContent = `$${bb.middle.toFixed(2)}`;
    document.getElementById('bb-lower').textContent = `$${bb.lower.toFixed(2)}`;

    let signal, signalClass, explanation;

    if (currentPrice > bb.upper) {
        signal = 'SELL'; signalClass = 'signal-sell';
        explanation = `Price ($${currentPrice.toFixed(2)}) is <strong>above upper band</strong> ($${bb.upper.toFixed(2)}). Stock is overbought, may pull back.`;
    } else if (currentPrice < bb.lower) {
        signal = 'BUY'; signalClass = 'signal-buy';
        explanation = `Price ($${currentPrice.toFixed(2)}) is <strong>below lower band</strong> ($${bb.lower.toFixed(2)}). Stock is oversold, may bounce back.`;
    } else if (currentPrice > bb.middle) {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Price between middle ($${bb.middle.toFixed(2)}) and upper ($${bb.upper.toFixed(2)}) band. <strong>Moderate bullish momentum</strong>.`;
    } else {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Price between lower ($${bb.lower.toFixed(2)}) and middle ($${bb.middle.toFixed(2)}) band. <strong>Moderate weakness</strong>.`;
    }

    document.getElementById('bb-signal').textContent = signal;
    document.getElementById('bb-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('bb-explanation').innerHTML = explanation;

    const dates = data.slice(-60).map(d => d.date);
    const prices = data.slice(-60).map(d => d.price);

    const upperBands = [], middleBands = [], lowerBands = [];
    for (let i = 20; i < data.slice(-60).length; i++) {
        const subset = data.slice(Math.max(0, data.length - 60 + i - 19), data.length - 60 + i + 1);
        const localBB = calculateBollingerBands(subset, 20);
        upperBands.push(localBB.upper);
        middleBands.push(localBB.middle);
        lowerBands.push(localBB.lower);
    }

    const trace1 = { x: dates.slice(-upperBands.length), y: upperBands, type: 'scatter', mode: 'lines', name: 'Upper', line: { color: '#ef4444', width: 1, dash: 'dash' } };
    const trace2 = { x: dates.slice(-middleBands.length), y: middleBands, type: 'scatter', mode: 'lines', name: 'Middle', line: { color: '#667eea', width: 2 } };
    const trace3 = { x: dates.slice(-lowerBands.length), y: lowerBands, type: 'scatter', mode: 'lines', name: 'Lower', line: { color: '#10b981', width: 1, dash: 'dash' } };
    const trace4 = { x: dates, y: prices, type: 'scatter', mode: 'lines', name: 'Price', line: { color: '#764ba2', width: 3 } };

    const layout = { showlegend: true, legend: { x: 0, y: 1 }, margin: { t: 20, r: 20, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'Price ($)' } };
    Plotly.newPlot('bb-chart', [trace1, trace2, trace3, trace4], layout, { responsive: true });
}

function loadVolume(data) {
    const recentVolumes = data.slice(-20).map(d => d.volume);
    const currentVolume = recentVolumes[recentVolumes.length - 1];
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const volumeRatio = (currentVolume / avgVolume).toFixed(2);

    document.getElementById('current-volume').textContent = (currentVolume / 1000000).toFixed(2) + 'M';
    document.getElementById('avg-volume').textContent = (avgVolume / 1000000).toFixed(2) + 'M';

    const priceChange = data[data.length - 1].price - data[data.length - 2].price;

    let signal, signalClass, explanation;

    if (currentVolume > avgVolume * 1.5 && priceChange > 0) {
        signal = 'BUY'; signalClass = 'signal-buy';
        explanation = `<strong>High volume on up move!</strong> Volume is ${volumeRatio}x average. Strong buying interest confirms upward momentum.`;
    } else if (currentVolume > avgVolume * 1.5 && priceChange < 0) {
        signal = 'SELL'; signalClass = 'signal-sell';
        explanation = `<strong>High volume on down move!</strong> Volume is ${volumeRatio}x average. Strong selling pressure.`;
    } else if (currentVolume < avgVolume * 0.7 && Math.abs(priceChange) > 2) {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Low volume with price movement suggests weak conviction. Wait for volume confirmation.`;
    } else {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Normal volume levels. No strong signals at this time.`;
    }

    document.getElementById('volume-signal').textContent = signal;
    document.getElementById('volume-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('volume-explanation').innerHTML = explanation;

    const dates = data.slice(-60).map(d => d.date);
    const volumes = data.slice(-60).map(d => d.volume);
    const prices = data.slice(-60).map(d => d.price);

    const trace1 = { x: dates, y: volumes, type: 'bar', name: 'Volume', marker: { color: volumes.map((v, i) => i === 0 ? '#667eea' : prices[i] > prices[i - 1] ? '#10b981' : '#ef4444') }, yaxis: 'y' };
    const trace2 = { x: dates, y: prices, type: 'scatter', mode: 'lines', name: 'Price', line: { color: '#667eea', width: 2 }, yaxis: 'y2' };

    const layout = { showlegend: true, legend: { x: 0, y: 1 }, margin: { t: 20, r: 50, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'Volume' }, yaxis2: { title: 'Price ($)', overlaying: 'y', side: 'right' } };
    Plotly.newPlot('volume-chart', [trace1, trace2], layout, { responsive: true });
}

function loadSupportResistance(data, currentPrice) {
    const recentPrices = data.slice(-60).map(d => d.price);
    const resistance = Math.max(...recentPrices);
    const support = Math.min(...recentPrices.slice(-30));

    document.getElementById('resistance').textContent = `$${resistance.toFixed(2)}`;
    document.getElementById('support').textContent = `$${support.toFixed(2)}`;
    document.getElementById('current-price-sr').textContent = `$${currentPrice.toFixed(2)}`;

    const distToResistance = ((resistance - currentPrice) / currentPrice * 100).toFixed(2);
    const distToSupport = ((currentPrice - support) / currentPrice * 100).toFixed(2);

    let signal, signalClass, explanation;

    if (currentPrice >= resistance * 0.98) {
        signal = 'SELL'; signalClass = 'signal-sell';
        explanation = `Price is <strong>testing resistance</strong> at $${resistance.toFixed(2)} (${distToResistance}% away). May face selling pressure.`;
    } else if (currentPrice <= support * 1.02) {
        signal = 'BUY'; signalClass = 'signal-buy';
        explanation = `Price is <strong>near support</strong> at $${support.toFixed(2)} (${distToSupport}% above). Good risk/reward entry point.`;
    } else if (currentPrice > (support + resistance) / 2) {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Price in upper half of range. ${distToResistance}% to resistance, ${distToSupport}% above support.`;
    } else {
        signal = 'NEUTRAL'; signalClass = 'signal-neutral';
        explanation = `Price in lower half of range. Watch for bounce to resistance or break below support.`;
    }

    document.getElementById('sr-signal').textContent = signal;
    document.getElementById('sr-signal').className = `signal-badge ${signalClass}`;
    document.getElementById('sr-explanation').innerHTML = explanation;

    const dates = data.slice(-60).map(d => d.date);
    const prices = data.slice(-60).map(d => d.price);

    const trace1 = { x: dates, y: prices, type: 'scatter', mode: 'lines', name: 'Price', line: { color: '#667eea', width: 3 } };
    const layout = {
        shapes: [
            { type: 'line', x0: dates[0], x1: dates[dates.length - 1], y0: resistance, y1: resistance, line: { color: '#ef4444', width: 3, dash: 'dash' } },
            { type: 'line', x0: dates[0], x1: dates[dates.length - 1], y0: support, y1: support, line: { color: '#10b981', width: 3, dash: 'dash' } }
        ],
        annotations: [
            { x: dates[dates.length - 1], y: resistance, text: 'Resistance', showarrow: false, xanchor: 'left', font: { color: '#ef4444', size: 12 } },
            { x: dates[dates.length - 1], y: support, text: 'Support', showarrow: false, xanchor: 'left', font: { color: '#10b981', size: 12 } }
        ],
        showlegend: true, legend: { x: 0, y: 1 }, margin: { t: 20, r: 80, b: 40, l: 50 }, xaxis: { title: 'Date' }, yaxis: { title: 'Price ($)' }
    };
    Plotly.newPlot('sr-chart', [trace1], layout, { responsive: true });
}

async function fetchNews() {
    try {
        const newsContainer = document.getElementById('newsContainer');
        newsContainer.innerHTML = '<div class="news-loading">Loading latest news...</div>';

        // Fetch news with topics related to the ticker type
        const url = `${CONFIG.API_BASE_URL}?function=NEWS_SENTIMENT&tickers=${currentSymbol}&topics=technology,financial_markets&limit=10&apikey=${CONFIG.ALPHA_VANTAGE_API_KEY}`;
        console.log('Fetching news from:', url.replace(CONFIG.ALPHA_VANTAGE_API_KEY, 'API_KEY'));

        const response = await fetch(url);
        const data = await response.json();

        console.log('News API Response:', data);

        if (data.feed && data.feed.length > 0) {
            // Filter articles that mention the current symbol or show all if none match
            const relevantArticles = data.feed.filter(article => {
                if (!article.ticker_sentiment) return false;
                return article.ticker_sentiment.some(t => t.ticker === currentSymbol);
            });

            const articlesToShow = relevantArticles.length > 0 ? relevantArticles.slice(0, 6) : data.feed.slice(0, 6);
            displayNews(articlesToShow);
        } else if (data.Information) {
            // API limit reached
            newsContainer.innerHTML = `<div class="news-loading">API limit reached. News will be available after cooldown period.</div>`;
        } else {
            newsContainer.innerHTML = '<div class="news-loading">No recent news available for this symbol.</div>';
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        const newsContainer = document.getElementById('newsContainer');
        newsContainer.innerHTML = '<div class="news-loading">Unable to load news at this time.</div>';
    }
}

function displayNews(articles) {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = '';

    articles.forEach(article => {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'news-article';

        // Get sentiment for current symbol
        let sentiment = 'neutral';
        let sentimentLabel = 'Neutral';
        if (article.ticker_sentiment) {
            const tickerSentiment = article.ticker_sentiment.find(t => t.ticker === currentSymbol);
            if (tickerSentiment) {
                const score = parseFloat(tickerSentiment.ticker_sentiment_score);
                if (score > 0.15) {
                    sentiment = 'bullish';
                    sentimentLabel = 'Bullish';
                } else if (score < -0.15) {
                    sentiment = 'bearish';
                    sentimentLabel = 'Bearish';
                }
            }
        }

        // Format date
        const dateStr = article.time_published;
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const formattedDate = `${month}/${day}/${year}`;

        // Truncate summary if too long
        let summary = article.summary || '';
        if (summary.length > 200) {
            summary = summary.substring(0, 200) + '...';
        }

        articleDiv.innerHTML = `
            <div class="news-article-header">
                <span class="news-source">${article.source || 'Unknown Source'}</span>
                <span class="news-date">${formattedDate}</span>
            </div>
            <div class="news-title-text">${article.title}</div>
            <div class="news-summary">${summary}</div>
            <div class="news-footer">
                <span class="news-sentiment sentiment-${sentiment}">${sentimentLabel}</span>
                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-link">Read More →</a>
            </div>
        `;

        newsContainer.appendChild(articleDiv);
    });
}

function initializeSymbolSelector() {
    const select = document.getElementById('symbolSelect');
    select.innerHTML = '';

    CONFIG.SYMBOLS.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol.ticker;
        option.textContent = `${symbol.ticker} - ${symbol.name}`;
        if (symbol.ticker === currentSymbol) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function updateTickerDisplay() {
    const symbolData = CONFIG.SYMBOLS.find(s => s.ticker === currentSymbol);
    if (symbolData) {
        document.getElementById('tickerInfo').textContent = `${symbolData.ticker} - ${symbolData.name}`;
        document.getElementById('loadingText').textContent = `Loading ${symbolData.ticker} data from Alpha Vantage...`;
        document.title = `${symbolData.ticker} - Technical Indicators Dashboard`;
    }
}

function changeSymbol() {
    const select = document.getElementById('symbolSelect');
    currentSymbol = select.value;
    updateTickerDisplay();
    loadAllData();
}

window.addEventListener('load', function() {
    initializeSymbolSelector();
    updateTickerDisplay();
    loadAllData();
});
