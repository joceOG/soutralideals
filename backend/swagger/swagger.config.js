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
