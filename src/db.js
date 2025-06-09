const sqlite3 = require('sqlite3').verbose();
     const path = require('path');

     // Chemin vers le fichier de la base de données
     const dbPath = path.join(__dirname, '../db/freelancehub.db');
     const db = new sqlite3.Database(dbPath);

     // Créer les tables
     db.serialize(() => {
       db.run(`
         CREATE TABLE IF NOT EXISTS utilisateurs (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           nom TEXT NOT NULL,
           email TEXT NOT NULL,
           telephone TEXT
         )
       `);

       db.run(`
         CREATE TABLE IF NOT EXISTS profils (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           utilisateurId INTEGER NOT NULL,
           competences TEXT NOT NULL,
           liensProfessionnels TEXT NOT NULL,
           FOREIGN KEY (utilisateurId) REFERENCES utilisateurs(id)
         )
       `);

       // Insérer des données initiales (optionnel)
       db.run(`
         INSERT OR IGNORE INTO utilisateurs (nom, email, telephone)
         VALUES ('Jean Dupont', 'jean.dupont@example.com', '0123456789')
       `);

       db.run(`
         INSERT OR IGNORE INTO profils (utilisateurId, competences, liensProfessionnels)
         VALUES (1, '["JavaScript", "Node.js"]', '["https://linkedin.com/in/jeandupont"]')
       `);
     });

module.exports = db;