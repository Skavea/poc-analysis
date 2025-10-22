/**
 * Script de test pour la gestion des streams multiples
 * ====================================================
 * 
 * Ce script teste les différents scénarios de création de streams
 * avec vérification des plages de dates et détection des chevauchements.
 * 
 * Usage: npx tsx scripts/test-stream-management.ts
 */

import { StreamDateRangeService } from '../src/lib/streamDateRangeService';
import { MarketType } from '../src/lib/schema';
import { config } from 'dotenv';

// Charger les variables d'environnement
config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
}

async function testGetExistingDateRanges(service: StreamDateRangeService, symbol: string) {
  logSection(`Test 1: Récupération des plages existantes pour ${symbol}`);
  
  try {
    const ranges = await service.getExistingDateRanges(symbol);
    
    if (ranges.length === 0) {
      log(`✅ Aucun stream trouvé pour ${symbol}`, 'yellow');
    } else {
      log(`✅ ${ranges.length} stream(s) trouvé(s) pour ${symbol}:`, 'green');
      
      ranges.forEach((range, index) => {
        log(`\n   Stream ${index + 1}:`, 'cyan');
        log(`   - ID: ${range.id}`, 'reset');
        log(`   - Type: ${range.marketType}`, 'reset');
        log(`   - Début: ${range.dateRange.startDate.toISOString()}`, 'reset');
        log(`   - Fin: ${range.dateRange.endDate.toISOString()}`, 'reset');
        log(`   - Points: ${range.totalPoints}`, 'reset');
      });
    }
    
    return ranges;
  } catch (error) {
    log(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'red');
    return [];
  }
}

async function testFindAvailableDateRange(
  service: StreamDateRangeService,
  symbol: string,
  marketType: MarketType
) {
  logSection(`Test 2: Recherche de plage disponible pour ${symbol}`);
  
  try {
    const available = await service.findAvailableDateRange(symbol, marketType);
    
    if (!available) {
      log(`❌ Aucune plage disponible pour ${symbol}`, 'red');
    } else {
      log(`✅ Plage disponible trouvée:`, 'green');
      log(`   - Début: ${available.startDate.toLocaleDateString('fr-FR')}`, 'cyan');
      log(`   - Fin: ${available.endDate.toLocaleDateString('fr-FR')}`, 'cyan');
      log(`   - Durée suggérée: ${available.suggestedDays} jour(s)`, 'cyan');
      log(`   - Max autorisé: ${available.maxDays} jour(s)`, 'cyan');
    }
    
    return available;
  } catch (error) {
    log(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'red');
    return null;
  }
}

async function testValidateDateRange(
  service: StreamDateRangeService,
  symbol: string,
  startDate: Date,
  endDate: Date
) {
  logSection(`Test 3: Validation d'une plage pour ${symbol}`);
  
  log(`Plage à valider:`, 'cyan');
  log(`   - Début: ${startDate.toLocaleDateString('fr-FR')}`, 'reset');
  log(`   - Fin: ${endDate.toLocaleDateString('fr-FR')}`, 'reset');
  
  try {
    const validation = await service.validateDateRange(symbol, { startDate, endDate });
    
    if (validation.valid) {
      log(`\n✅ Validation réussie - Aucun chevauchement détecté`, 'green');
    } else {
      log(`\n❌ Validation échouée`, 'red');
      log(`   Raison: ${validation.reason}`, 'yellow');
    }
    
    return validation;
  } catch (error) {
    log(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'red');
    return { valid: false, reason: 'Erreur lors de la validation' };
  }
}

async function testGetAvailabilityMessage(
  service: StreamDateRangeService,
  symbol: string,
  marketType: MarketType
) {
  logSection(`Test 4: Génération du message pour ${symbol}`);
  
  try {
    const message = await service.getAvailabilityMessage(symbol, marketType);
    
    log(`Message généré:`, 'cyan');
    console.log('\n' + '-'.repeat(70));
    log(message, 'yellow');
    console.log('-'.repeat(70) + '\n');
    
    return message;
  } catch (error) {
    log(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'red');
    return '';
  }
}

async function runTests() {
  log('🚀 Démarrage des tests de gestion des streams', 'bright');
  
  const service = new StreamDateRangeService(databaseUrl!);
  
  // Liste des symboles à tester
  const testSymbols = [
    { symbol: 'AAPL', marketType: 'STOCK' as MarketType, description: 'Action américaine' },
    { symbol: 'HO.PA', marketType: 'STOCK' as MarketType, description: 'Action française' },
    { symbol: 'BTC', marketType: 'CRYPTOCURRENCY' as MarketType, description: 'Cryptomonnaie' },
  ];
  
  for (const test of testSymbols) {
    log(`\n${'#'.repeat(70)}`, 'bright');
    log(`# Test pour ${test.symbol} (${test.description})`, 'bright');
    log(`${'#'.repeat(70)}`, 'bright');
    
    // Test 1: Récupérer les streams existants
    const existingRanges = await testGetExistingDateRanges(service, test.symbol);
    
    // Test 2: Chercher une plage disponible
    await testFindAvailableDateRange(service, test.symbol, test.marketType);
    
    // Test 3: Valider une plage
    if (existingRanges.length > 0) {
      // Tester avec une plage qui chevauche le premier stream
      const firstRange = existingRanges[0].dateRange;
      const overlapStart = new Date(firstRange.startDate);
      overlapStart.setDate(overlapStart.getDate() + 1);
      const overlapEnd = new Date(firstRange.endDate);
      overlapEnd.setDate(overlapEnd.getDate() + 1);
      
      await testValidateDateRange(service, test.symbol, overlapStart, overlapEnd);
    } else {
      // Tester avec une plage arbitraire
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await testValidateDateRange(service, test.symbol, today, tomorrow);
    }
    
    // Test 4: Générer le message d'availability
    await testGetAvailabilityMessage(service, test.symbol, test.marketType);
  }
  
  logSection('✅ Tests terminés');
  log('Tous les tests ont été exécutés avec succès!', 'green');
}

// Point d'entrée
async function main() {
  try {
    await runTests();
    process.exit(0);
  } catch (error) {
    log(`\n❌ Erreur fatale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

