import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SoutraLi Deals API',
      version: '1.0.0',
      description: 'API complète pour la plateforme SoutraLi Deals - Services, Commandes, Utilisateurs, Prestataires',
      contact: {
        name: 'SoutraLi Deals Team',
        email: 'contact@soutralideals.com',
        url: 'https://soutralideals.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.soutralideals.com',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT pour l\'authentification'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Clé API pour l\'authentification'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur'
            },
            code: {
              type: 'integer',
              description: 'Code d\'erreur'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message de succès'
            },
            data: {
              type: 'object',
              description: 'Données retournées'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['OK', 'ERROR'],
              description: 'Statut de l\'API'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Horodatage de la vérification'
            },
            uptime: {
              type: 'number',
              description: 'Temps de fonctionnement en secondes'
            },
            memory: {
              type: 'object',
              properties: {
                rss: { type: 'number', description: 'Mémoire résidente' },
                heapTotal: { type: 'number', description: 'Taille totale du heap' },
                heapUsed: { type: 'number', description: 'Mémoire heap utilisée' },
                external: { type: 'number', description: 'Mémoire externe' },
                arrayBuffers: { type: 'number', description: 'Buffers de tableaux' }
              }
            },
            version: {
              type: 'string',
              description: 'Version de l\'API'
            }
          }
        },
        Metrics: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Horodatage des métriques'
            },
            uptime: {
              type: 'number',
              description: 'Temps de fonctionnement en secondes'
            },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'string', description: 'Mémoire utilisée' },
                total: { type: 'string', description: 'Mémoire totale' }
              }
            },
            cpu: {
              type: 'object',
              properties: {
                user: { type: 'number', description: 'Temps CPU utilisateur' },
                system: { type: 'number', description: 'Temps CPU système' }
              }
            },
            platform: {
              type: 'string',
              description: 'Plateforme d\'exécution'
            },
            nodeVersion: {
              type: 'string',
              description: 'Version de Node.js'
            }
          }
        },
        CacheStats: {
          type: 'object',
          properties: {
            cache: {
              type: 'object',
              properties: {
                hits: { type: 'number', description: 'Nombre de hits du cache' },
                misses: { type: 'number', description: 'Nombre de misses du cache' },
                sets: { type: 'number', description: 'Nombre de mises en cache' },
                deletes: { type: 'number', description: 'Nombre de suppressions' },
                hitRate: { type: 'number', description: 'Taux de réussite du cache' },
                total: { type: 'number', description: 'Total des requêtes' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Horodatage des statistiques'
            },
            status: {
              type: 'string',
              enum: ['OK', 'ERROR'],
              description: 'Statut du cache'
            }
          }
        },
        RateLimitError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur de rate limiting'
            },
            retryAfter: {
              type: 'string',
              description: 'Temps d\'attente avant nouvelle tentative'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Utilisateurs',
        description: 'Gestion des utilisateurs de la plateforme'
      },
      {
        name: 'Commandes',
        description: 'Gestion des commandes et transactions'
      },
      {
        name: 'Services',
        description: 'Gestion des services proposés'
      },
      {
        name: 'Articles',
        description: 'Gestion des articles et produits'
      },
      {
        name: 'Prestataires',
        description: 'Gestion des prestataires de services'
      },
      {
        name: 'Freelancers',
        description: 'Gestion des freelancers'
      },
      {
        name: 'Vendeurs',
        description: 'Gestion des vendeurs'
      },
      {
        name: 'Catégories',
        description: 'Gestion des catégories de services'
      },
      {
        name: 'Groupes',
        description: 'Gestion des groupes de services'
      },
      {
        name: 'Prestations',
        description: 'Gestion des prestations et missions'
      },
      {
        name: 'Messages',
        description: 'Système de messagerie et chat'
      },
      {
        name: 'Notifications',
        description: 'Système de notifications'
      },
      {
        name: 'Authentification',
        description: 'Authentification et autorisation'
      },
      {
        name: 'SMS',
        description: 'Services d\'envoi de SMS et WhatsApp'
      },
      {
        name: 'Emails',
        description: 'Services d\'envoi d\'emails'
      },
      {
        name: 'Signalements',
        description: 'Système de signalement et modération'
      },
      {
        name: 'Google Maps',
        description: 'Services de géolocalisation et cartographie'
      },
      {
        name: 'Monitoring',
        description: 'Surveillance et métriques de l\'API'
      },
      {
        name: 'Cache',
        description: 'Gestion du cache et statistiques'
      },
      {
        name: 'Préférences',
        description: 'Gestion des préférences utilisateurs'
      },
      {
        name: 'Sécurité',
        description: 'Sécurité du compte, 2FA, sessions et alertes'
      },
      {
        name: 'Logs',
        description: 'Système de logging et surveillance'
      }
    ]
  },
  apis: [
    './swagger/docs/*.yaml',
    './swagger/docs/*.yml',
    './routes/*.js',
    './controller/*.js'
  ]
};

export default swaggerJsdoc(options);
