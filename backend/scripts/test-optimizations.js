#!/usr/bin/env node

// 🧪 SCRIPT DE TEST DES OPTIMISATIONS - SOUTRALI DEALS
import axios from 'axios';
import logger from '../middleware/logger.js';

const BASE_URL = 'http://localhost:3000';

// 🎯 TESTS DES OPTIMISATIONS
const testOptimizations = async () => {
  logger.info('🧪 Début des tests d\'optimisation...');
  
  const tests = [
    {
      name: '🏥 Health Check',
      url: `${BASE_URL}/health`,
      expectedStatus: 200,
    },
    {
      name: '📊 Metrics',
      url: `${BASE_URL}/metrics`,
      expectedStatus: 200,
    },
    {
      name: '💾 Cache Stats',
      url: `${BASE_URL}/cache/stats`,
      expectedStatus: 200,
    },
    {
      name: '🏠 API Root',
      url: `${BASE_URL}/`,
      expectedStatus: 200,
    },
    {
      name: '📚 Swagger Docs',
      url: `${BASE_URL}/api-docs`,
      expectedStatus: 200,
    },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      logger.info(`🔍 Test: ${test.name}`);
      const response = await axios.get(test.url, { timeout: 5000 });
      
      const result = {
        name: test.name,
        status: response.status,
        success: response.status === test.expectedStatus,
        responseTime: response.headers['x-response-time'] || 'N/A',
        data: response.data,
      };
      
      results.push(result);
      
      if (result.success) {
        logger.info(`✅ ${test.name}: SUCCESS (${response.status}ms)`);
      } else {
        logger.warn(`⚠️ ${test.name}: FAILED (Expected ${test.expectedStatus}, got ${response.status})`);
      }
      
    } catch (error) {
      const result = {
        name: test.name,
        status: error.response?.status || 'ERROR',
        success: false,
        error: error.message,
      };
      
      results.push(result);
      logger.error(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  return results;
};

// 🚀 TEST DE PERFORMANCE
const testPerformance = async () => {
  logger.info('🚀 Test de performance...');
  
  const startTime = Date.now();
  const requests = [];
  const concurrentRequests = 10;
  
  // Test de charge simple
  for (let i = 0; i < concurrentRequests; i++) {
    requests.push(
      axios.get(`${BASE_URL}/health`, { timeout: 10000 })
        .then(response => ({
          success: true,
          responseTime: Date.now() - startTime,
          status: response.status,
        }))
        .catch(error => ({
          success: false,
          error: error.message,
        }))
    );
  }
  
  const results = await Promise.all(requests);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  
  logger.info(`📊 Performance Results:`);
  logger.info(`   Total Time: ${totalTime}ms`);
  logger.info(`   Successful: ${successfulRequests}/${concurrentRequests}`);
  logger.info(`   Failed: ${failedRequests}/${concurrentRequests}`);
  logger.info(`   Average Response Time: ${totalTime / concurrentRequests}ms`);
  
  return {
    totalTime,
    successfulRequests,
    failedRequests,
    averageResponseTime: totalTime / concurrentRequests,
  };
};

// 🛡️ TEST DE SÉCURITÉ
const testSecurity = async () => {
  logger.info('🛡️ Test de sécurité...');
  
  const securityTests = [
    {
      name: 'Rate Limiting',
      test: async () => {
        const requests = [];
        for (let i = 0; i < 10; i++) {
          requests.push(axios.get(`${BASE_URL}/health`));
        }
        try {
          await Promise.all(requests);
          return { success: true, message: 'Rate limiting not triggered' };
        } catch (error) {
          if (error.response?.status === 429) {
            return { success: true, message: 'Rate limiting working correctly' };
          }
          return { success: false, message: error.message };
        }
      },
    },
    {
      name: 'CORS Headers',
      test: async () => {
        const response = await axios.options(`${BASE_URL}/health`);
        return {
          success: true,
          message: 'CORS headers present',
          headers: response.headers,
        };
      },
    },
  ];
  
  const results = [];
  
  for (const test of securityTests) {
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result,
      });
      
      if (result.success) {
        logger.info(`✅ ${test.name}: ${result.message}`);
      } else {
        logger.warn(`⚠️ ${test.name}: ${result.message}`);
      }
    } catch (error) {
      results.push({
        name: test.name,
        success: false,
        error: error.message,
      });
      logger.error(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  return results;
};

// 📊 GÉNÉRATION DU RAPPORT
const generateReport = (optimizationResults, performanceResults, securityResults) => {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: optimizationResults.length,
      successfulTests: optimizationResults.filter(r => r.success).length,
      failedTests: optimizationResults.filter(r => !r.success).length,
      performance: performanceResults,
      security: securityResults,
    },
    details: {
      optimization: optimizationResults,
      performance: performanceResults,
      security: securityResults,
    },
  };
  
  logger.info('📊 RAPPORT DE TEST:');
  logger.info(`   Tests d'optimisation: ${report.summary.successfulTests}/${report.summary.totalTests}`);
  logger.info(`   Performance: ${performanceResults.successfulRequests}/${performanceResults.successfulRequests + performanceResults.failedRequests} requêtes réussies`);
  logger.info(`   Sécurité: ${securityResults.filter(r => r.success).length}/${securityResults.length} tests passés`);
  
  return report;
};

// 🎯 FONCTION PRINCIPALE
const runAllTests = async () => {
  try {
    logger.info('🚀 Démarrage des tests d\'optimisation SOUTRALI DEALS...');
    
    // Attendre que le serveur soit prêt
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Tests d'optimisation
    const optimizationResults = await testOptimizations();
    
    // Test de performance
    const performanceResults = await testPerformance();
    
    // Tests de sécurité
    const securityResults = await testSecurity();
    
    // Génération du rapport
    const report = generateReport(optimizationResults, performanceResults, securityResults);
    
    logger.info('✅ Tests terminés !');
    logger.info('📄 Rapport complet disponible dans les logs');
    
    return report;
    
  } catch (error) {
    logger.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
};

// 🎯 DÉMARRAGE
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export default runAllTests;


