require('dotenv').config();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ApolloError } = require('apollo-server-errors');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secrete_temporaire';

// Middleware d'authentification
const authMiddleware = (resolver) => {
  return (parent, args, context, info) => {
    const req = context.req;
    if (!req || !req.headers || !req.headers.authorization) {
      throw new ApolloError('Non authentifié', 'UNAUTHENTICATED');
    }

    const authHeader = req.headers.authorization;
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      context.userId = decoded.userId;
    } catch (err) {
      throw new ApolloError('Token invalide', 'INVALID_TOKEN');
    }

    return resolver(parent, args, context, info);
  };
};


const resolvers = {
  Query: {
    getUtilisateur: authMiddleware((_, { id }, { userId }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM utilisateurs WHERE id = ?', [id], (err, row) => {
          if (err) return reject(err);
          if (!row || row.id !== userId) return reject(new ApolloError('Accès refusé', 'FORBIDDEN'));
          resolve(row);
        });
      });
    }),
    getProfil: authMiddleware((_, { id }, { userId }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT p.*, u.* FROM profils p JOIN utilisateurs u ON p.utilisateurId = u.id WHERE p.id = ?', [id], (err, row) => {
          if (err) return reject(err);
          if (!row || row.utilisateurId !== userId) return reject(new ApolloError('Accès refusé', 'FORBIDDEN'));
          resolve({
            id: row.id,
            utilisateurId: row.utilisateurId,
            competences: JSON.parse(row.competences),
            liensProfessionnels: JSON.parse(row.liensProfessionnels),
            utilisateur: {
              id: row.utilisateurId,
              nom: row.nom,
              email: row.email,
              telephone: row.telephone,
            },
          });
        });
      });
    }),
    getAllProfils: authMiddleware((_, { competence }, { userId }) => {
      return new Promise((resolve, reject) => {
        let query = 'SELECT p.*, u.* FROM profils p JOIN utilisateurs u ON p.utilisateurId = u.id WHERE u.id = ?';
        const params = [userId];

        if (competence) {
          query += ' AND EXISTS (SELECT 1 FROM json_each(p.competences) WHERE json_each.value LIKE ?)';
          params.push(`%${competence}%`);
        }

        db.all(query, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => ({
            id: row.id,
            utilisateurId: row.utilisateurId,
            competences: JSON.parse(row.competences),
            liensProfessionnels: JSON.parse(row.liensProfessionnels),
            utilisateur: {
              id: row.utilisateurId,
              nom: row.nom,
              email: row.email,
              telephone: row.telephone,
            },
          })));
        });
      });
    }),
  },
}

module.exports = resolvers;