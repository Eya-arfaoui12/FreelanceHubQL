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
  Mutation: {
    createUtilisateur: (_, { input }) => {
      return new Promise((resolve, reject) => {
        const { nom, email, telephone, motDePasse } = input;
        bcrypt.hash(motDePasse, 10, (err, hash) => {
          if (err) return reject(err);
          db.run(
            'INSERT INTO utilisateurs (nom, email, motDePasse, telephone) VALUES (?, ?, ?, ?)',
            [nom, email, hash, telephone],
            function (err) {
              if (err) return reject(new ApolloError('Email déjà utilisé', 'DUPLICATE_EMAIL'));
              const token = jwt.sign({ userId: this.lastID }, JWT_SECRET);
              resolve({ id: this.lastID, nom, email, telephone, token });
            }
          );
        });
      });
    },
    createProfil: authMiddleware((_, { input }, { userId }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT id, nom, email, telephone FROM utilisateurs WHERE id = ?', [userId], (err, user) => {
          if (err) return reject(err);
          if (!user) return reject(new ApolloError('Utilisateur non trouvé', 'NOT_FOUND'));

          db.run(
            'INSERT INTO profils (utilisateurId, competences, liensProfessionnels) VALUES (?, ?, ?)',
            [userId, JSON.stringify(input.competences), JSON.stringify(input.liensProfessionnels)],
            function (err) {
              if (err) return reject(err);
              resolve({
                id: this.lastID,
                utilisateurId: userId,
                competences: input.competences,
                liensProfessionnels: input.liensProfessionnels,
                utilisateur: user,
              });
            }
          );
        });
      });
    }),
    updateProfil: authMiddleware((_, { id, input }, { userId }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profils WHERE id = ?', [id], (err, row) => {
          if (err) return reject(err);
          if (!row || row.utilisateurId !== userId) return reject(new ApolloError('Accès refusé', 'FORBIDDEN'));

          db.run(
            'UPDATE profils SET utilisateurId = ?, competences = ?, liensProfessionnels = ? WHERE id = ?',
            [userId, JSON.stringify(input.competences), JSON.stringify(input.liensProfessionnels), id],
            function (err) {
              if (err) return reject(err);
              db.get('SELECT id, nom, email, telephone FROM utilisateurs WHERE id = ?', [userId], (err, user) => {
                if (err) return reject(err);
                resolve({
                  id,
                  utilisateurId: userId,
                  competences: input.competences,
                  liensProfessionnels: input.liensProfessionnels,
                  utilisateur: user,
                });
              });
            }
          );
        });
      });
    }),
    deleteProfil: authMiddleware((_, { id }, { userId }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profils WHERE id = ?', [id], (err, row) => {
          if (err) return reject(err);
          if (!row || row.utilisateurId !== userId) return reject(new ApolloError('Accès refusé', 'FORBIDDEN'));
          db.run('DELETE FROM profils WHERE id = ?', [id], function (err) {
            if (err) return reject(err);
            if (this.changes === 0) return reject(new ApolloError('Profil non trouvé', 'NOT_FOUND'));
            resolve(true);
          });
        });
      });
    }),
    inscrireUtilisateur: (_, { input }) => {
      return new Promise((resolve, reject) => {
        const { nom, email, motDePasse, telephone } = input;
        bcrypt.hash(motDePasse, 10, (err, hash) => {
          if (err) return reject(err);
          db.run(
            'INSERT INTO utilisateurs (nom, email, motDePasse, telephone) VALUES (?, ?, ?, ?)',
            [nom, email, hash, telephone],
            function (err) {
              if (err) return reject(new ApolloError('Email déjà utilisé', 'DUPLICATE_EMAIL'));
              const token = jwt.sign({ userId: this.lastID }, JWT_SECRET);
              db.get('SELECT id, nom, email, telephone FROM utilisateurs WHERE id = ?', [this.lastID], (err, row) => {
                if (err) return reject(err);
                resolve({ token, utilisateur: row });
              });
            }
          );
        });
      });
    },
    connecterUtilisateur: (_, { email, motDePasse }) => {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM utilisateurs WHERE email = ?', [email], (err, row) => {
          if (err) return reject(err);
          if (!row) return reject(new ApolloError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS'));

          bcrypt.compare(motDePasse, row.motDePasse, (err, match) => {
            if (err || !match) return reject(new ApolloError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS'));
            const token = jwt.sign({ userId: row.id }, JWT_SECRET);
            resolve({
              token,
              utilisateur: {
                id: row.id,
                nom: row.nom,
                email: row.email,
                telephone: row.telephone,
              },
            });
          });
        });
      });
    },
  },
};

module.exports = resolvers;