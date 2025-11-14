// Configuration file for Market Analysis Dashboard
// Copy this file to config.js and add your API keys

const CONFIG = {
    // Alpha Vantage API Key
    // Get your free API key at: https://www.alphavantage.co/support/#api-key
    ALPHA_VANTAGE_API_KEY: 'YOUR_API_KEY_HERE',

    // Default ticker symbol
    DEFAULT_TICKER: 'VGT',

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
