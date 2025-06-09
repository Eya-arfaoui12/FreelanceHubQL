const { ApolloServer } = require('apollo-server');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req }), // Passe la requête HTTP au contexte
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Serveur GraphQL prêt à ${url}`);
});