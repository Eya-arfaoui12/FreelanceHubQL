const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');

// Charger le schéma GraphQL
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

// Configuration du serveur Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Passe l'objet req uniquement s'il existe
    return req ? { req } : {};
  },
});

// Créer une application Express
const app = express();

// Appliquer Apollo Server à Express
server.start().then(() => {
  server.applyMiddleware({ app });

  // Démarrer le serveur sur le port 4000
  app.listen({ port: 4000 }, () => {
    console.log(`🚀 Serveur GraphQL prêt à http://localhost:4000${server.graphqlPath}`);
  });
});