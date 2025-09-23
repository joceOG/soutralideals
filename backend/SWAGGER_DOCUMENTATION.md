# 📚 DOCUMENTATION SWAGGER - SOUTRALI DEALS

## 🎯 **VUE D'ENSEMBLE**

Votre API SOUTRALI DEALS est entièrement documentée avec **Swagger/OpenAPI 3.0** ! 🚀

### **🔗 Accès à la Documentation**

- **URL de développement** : `http://localhost:3000/api-docs`
- **URL de production** : `https://api.soutralideals.com/api-docs`

---

## 📊 **ENDPOINTS DOCUMENTÉS**

### **🏥 Monitoring & Optimisations**

| Endpoint | Méthode | Description | Tags |
|----------|---------|-------------|------|
| `/` | GET | Informations de l'API | Monitoring |
| `/health` | GET | Vérification de l'état | Monitoring |
| `/metrics` | GET | Métriques de performance | Monitoring |
| `/cache/stats` | GET | Statistiques du cache Redis | Cache |

### **👤 Utilisateurs & Authentification**

| Endpoint | Méthode | Description | Tags |
|----------|---------|-------------|------|
| `/api/utilisateur/login` | POST | Connexion utilisateur | Authentification |
| `/api/utilisateur/register` | POST | Inscription utilisateur | Authentification |
| `/api/utilisateur` | GET | Liste des utilisateurs | Utilisateurs |
| `/api/utilisateur/:id` | GET | Détail utilisateur | Utilisateurs |

### **🛍️ E-commerce**

| Endpoint | Méthode | Description | Tags |
|----------|---------|-------------|------|
| `/api/article` | GET/POST | Gestion des articles | Articles |
| `/api/commande` | GET/POST | Gestion des commandes | Commandes |
| `/api/categorie` | GET/POST | Gestion des catégories | Catégories |

### **💼 Services & Prestataires**

| Endpoint | Méthode | Description | Tags |
|----------|---------|-------------|------|
| `/api/service` | GET/POST | Gestion des services | Services |
| `/api/prestataire` | GET/POST | Gestion des prestataires | Prestataires |
| `/api/freelance` | GET/POST | Gestion des freelances | Freelancers |

### **💬 Communication**

| Endpoint | Méthode | Description | Tags |
|----------|---------|-------------|------|
| `/api/message` | POST | Envoi de messages | Messages |
| `/api/notification` | GET/POST | Gestion des notifications | Notifications |

---

## 🛡️ **SÉCURITÉ DOCUMENTÉE**

### **Rate Limiting**
- **Général** : 100 requêtes/15min par IP
- **Authentification** : 5 tentatives/15min par IP
- **Messages d'erreur** : Personnalisés en français

### **Validation des Données**
- **Email** : Format valide requis
- **Téléphone** : Format ivoirien (+225XXXXXXXX)
- **Mot de passe** : 8 caractères min, majuscule, minuscule, chiffre
- **Noms** : Lettres uniquement, 2-50 caractères

### **Headers de Sécurité**
- **Helmet** : Protection XSS, CSRF, clickjacking
- **CORS** : Configuration sécurisée
- **Content Security Policy** : Politique de sécurité

---

## 📊 **SCHÉMAS DOCUMENTÉS**

### **🏥 Health Check**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 100593664,
    "heapTotal": 48250880,
    "heapUsed": 43367920
  },
  "version": "1.0.0"
}
```

### **📈 Metrics**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": "42 MB",
    "total": "46 MB"
  },
  "cpu": {
    "user": 3671000,
    "system": 1890000
  },
  "platform": "win32",
  "nodeVersion": "v22.2.0"
}
```

### **💾 Cache Stats**
```json
{
  "cache": {
    "hits": 150,
    "misses": 50,
    "hitRate": 0.75,
    "total": 200
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "OK"
}
```

---

## 🎨 **FONCTIONNALITÉS SWAGGER**

### **✅ Documentation Interactive**
- **Interface utilisateur** : Swagger UI
- **Tests en direct** : Bouton "Try it out"
- **Exemples** : Requêtes et réponses
- **Validation** : Schémas de données

### **✅ Authentification**
- **JWT Bearer Token** : Support complet
- **Rate Limiting** : Documenté et testable
- **Sécurité** : Headers et validation

### **✅ Optimisations Documentées**
- **Cache Redis** : Statistiques et configuration
- **Monitoring** : Health checks et métriques
- **Logging** : Système de logs avancé
- **Performance** : Métriques en temps réel

---

## 🚀 **UTILISATION**

### **1. Accéder à la Documentation**
```bash
# Démarrer le serveur
npm run dev

# Ouvrir dans le navigateur
http://localhost:3000/api-docs
```

### **2. Tester les Endpoints**
1. **Sélectionner** un endpoint
2. **Cliquer** sur "Try it out"
3. **Remplir** les paramètres
4. **Exécuter** la requête
5. **Voir** la réponse

### **3. Authentification**
1. **S'inscrire** via `/api/utilisateur/register`
2. **Se connecter** via `/api/utilisateur/login`
3. **Copier** le token JWT
4. **Cliquer** sur "Authorize"
5. **Coller** le token : `Bearer <token>`

---

## 📝 **EXEMPLES D'UTILISATION**

### **🔐 Connexion Utilisateur**
```bash
curl -X POST "http://localhost:3000/api/utilisateur/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@soutralideals.com",
    "password": "motdepasse123"
  }'
```

### **📊 Vérifier la Santé**
```bash
curl -X GET "http://localhost:3000/health"
```

### **💾 Statistiques Cache**
```bash
curl -X GET "http://localhost:3000/cache/stats"
```

---

## 🛠️ **MAINTENANCE**

### **Mise à Jour de la Documentation**
1. **Modifier** les commentaires `@swagger` dans le code
2. **Redémarrer** le serveur
3. **Actualiser** la page Swagger

### **Ajout de Nouveaux Endpoints**
1. **Ajouter** les commentaires `@swagger` dans le contrôleur
2. **Définir** les schémas dans `swagger.config.js`
3. **Tester** dans l'interface Swagger

---

## 🎯 **BONNES PRATIQUES**

### **✅ Documentation Complète**
- **Descriptions** détaillées
- **Exemples** réalistes
- **Codes d'erreur** documentés
- **Schémas** de validation

### **✅ Sécurité**
- **Rate limiting** documenté
- **Validation** des entrées
- **Authentification** JWT
- **Headers** de sécurité

### **✅ Performance**
- **Cache** documenté
- **Métriques** disponibles
- **Monitoring** intégré
- **Optimisations** visibles

---

## 🚀 **PROCHAINES ÉTAPES**

### **Améliorations Futures**
1. **Tests automatisés** depuis Swagger
2. **Génération de clients** SDK
3. **Documentation** des WebSockets
4. **Métriques** avancées
5. **Alertes** automatiques

---

**🎉 Votre API SOUTRALI DEALS est parfaitement documentée et prête pour le développement !** 📚✨

**🇨🇮 Documentation complète pour le marché ivoirien !** 💪
