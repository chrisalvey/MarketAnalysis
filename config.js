// Configuration file for Market Analysis Dashboard
// Note: Since this is a client-side application hosted on GitHub Pages,
// the API key will be visible in the browser. Alpha Vantage free tier
// is rate-limited (25 requests/day) which provides some protection.

const CONFIG = {
    // Alpha Vantage API Key
    ALPHA_VANTAGE_API_KEY: 'D3ZKUQ90803WS975',

    // Default ticker symbol
    DEFAULT_TICKER: 'VGT',

    // Available symbols
    SYMBOLS: [
        { ticker: 'VGT', name: 'Vanguard Information Technology ETF' },
        { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
        { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust' }
    ],

    // API Settings
    API_BASE_URL: 'https://www.alphavantage.co/query',

    // Chart settings
    CHART_DAYS_DISPLAYED: {
        MA: 100,      // Moving Averages chart
        RSI: 60,      // RSI chart
        MACD: 60,     // MACD chart
        BB: 60,       // Bollinger Bands chart
        VOLUME: 60,   // Volume chart
        SR: 60        // Support & Resistance chart
    }
};
