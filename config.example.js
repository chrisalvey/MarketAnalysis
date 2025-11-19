// Configuration file for Market Analysis Dashboard
// Copy this file to config.js and add your API keys

const CONFIG = {
    // Alpha Vantage API Key (Keep for News)
    // Get your free API key at: https://www.alphavantage.co/support/#api-key
    ALPHA_VANTAGE_API_KEY: 'YOUR_ALPHA_VANTAGE_KEY',

    // Twelve Data API Key (For Price Data)
    // Get your free API key at: https://twelvedata.com/
    TWELVE_DATA_API_KEY: 'YOUR_TWELVE_DATA_KEY',

    // Default ticker symbol
    DEFAULT_TICKER: 'VGT',

    // Available symbols
    SYMBOLS: [
        { ticker: 'VGT', name: 'Vanguard Information Technology ETF' },
        { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
        { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust' }
    ],

    // API Settings
    ALPHA_VANTAGE_BASE_URL: 'https://www.alphavantage.co/query',
    TWELVE_DATA_BASE_URL: 'https://api.twelvedata.com',

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
