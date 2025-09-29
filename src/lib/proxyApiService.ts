/**
 * Service API avec proxy pour contourner les limites IP
 */

import { config } from 'dotenv';

config({ path: '.env' });

export class ProxyApiService {
  private apiKey: string;
  private proxyServices = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/'
  ];

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set');
    }
  }

  /**
   * Teste tous les proxies et retourne celui qui fonctionne
   */
  async findWorkingProxy(): Promise<string | null> {
    const testUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&outputsize=compact&apikey=${this.apiKey}`;
    
    for (const proxy of this.proxyServices) {
      try {
        console.log(`🔄 Test du proxy: ${proxy.split('/')[2]}`);
        
        const proxyUrl = `${proxy}${encodeURIComponent(testUrl)}`;
        const response = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        });
        
        const data = await response.json();
        
        if (data['Time Series (Daily)'] && !data.Information) {
          console.log(`✅ Proxy fonctionnel trouvé: ${proxy.split('/')[2]}`);
          return proxy;
        }
        
      } catch (error) {
        console.log(`❌ Proxy ${proxy.split('/')[2]} échoué`);
      }
      
      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  }

  /**
   * Récupère des données via proxy
   */
  async fetchWithProxy(url: string, proxy?: string): Promise<any> {
    const workingProxy = proxy || await this.findWorkingProxy();
    
    if (!workingProxy) {
      throw new Error('Aucun proxy fonctionnel trouvé');
    }
    
    const proxyUrl = `${workingProxy}${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    return await response.json();
  }

  /**
   * Construit l'URL API Alpha Vantage
   */
  buildApiUrl(symbol: string, marketType: string): string {
    const baseUrl = 'https://www.alphavantage.co/query';
    
    switch (marketType) {
      case 'CRYPTOCURRENCY':
        return `${baseUrl}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${this.apiKey}`;
      case 'COMMODITY':
      case 'INDEX':
      case 'STOCK':
        return `${baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${this.apiKey}`;
      default:
        throw new Error(`Unsupported market type: ${marketType}`);
    }
  }
}
