#!/usr/bin/env node

const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const diacritics = require('diacritics');
const args = require('yargs').argv;

const URLs = ['http://uqac.ca'];
const visites = new Set();
const sites = new Map();
const words = new Map();
let remaining = 100;

const db = new sqlite3.Database('crawler.sqlite3');

function process(url, response) {
  // Enlever les accents
  response = diacritics.remove(response);
  // Convertir en minuscules
  response = response.toLowerCase();

  const wordList = response.split(/\W+/g);
  const wordSet = new Set();
  for (w of wordList) {
    wordSet.add(w);
  };
  for (w of wordSet) {
    if (!words.has(w))
      words.set(w, new Set());
    words.get(w).add(url);
  }

  visites.add(url);
  const liens = response.match(/href="http:\/\/\w*\.uqac\.ca\/[^"]*"/g);
  if (!liens)
    return;

  liens.forEach((lien) => {
    lien = lien.replace("href=\"", "").replace("\"", "");
    if (!visites.has(lien))
      URLs.push(lien);
    if (!sites.has(lien))
      sites.set(lien, 0);
    sites.set(lien, sites.get(lien) + 1);
  });
}

function saveContentToDB(url, data) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO `Cache`(`URL`,`contenu`) VALUES (?,?);', [url, data], (err) => {
      if (err)
        return reject(err);
      resolve();
    });
  });
}

function getContentFromDB(url) {
  return new Promise((resolve, reject) => {
    db.get('SELECT contenu FROM `Cache` WHERE `URL` = ?;', [url], (err, data) => {
      if (err || !data || !data.contenu)
        return reject(err);
      resolve(data.contenu);
    });
  });
}

function getContentFromWeb(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on('data', (d) => data += d);
      res.on('end', () => {
        saveContentToDB(url, data)
        .then(() => {
          resolve(data);
        });
      });
    });
    req.on('error', reject);
  })
}

function crawl() {
  const nextURL = URLs.shift();
  return getContentFromDB(nextURL)
  .catch((err) => {
    return getContentFromWeb(nextURL);
  })
  .then((data) => {
    return process(nextURL, data);
  });
}

function iterate() {
  if (remaining-- === 0)
    return;

  if (URLs.length > 0)
    return crawl()
      .catch((err) => {
        console.error(err);
      })
      .then(iterate);
}


// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
function intersection(setA, setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (setA.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}

function findWords () {
    return new Promise((resolve, reject) => {

        let result;
        for (var arg of args._) {
            let currentSet = words.get(arg);
            if (!currentSet) reject("Le mot " + arg + " est introuvable.");
            if (!result)result = currentSet;
            else result = intersection(result, currentSet);

        }
        console.log("Résultat:", result);
        if (result && result.size > 0) return resolve();
        return reject("Les " + args._.length + " mots n'ont pas de lien en commun.");
    });
}

iterate()
  .then(() => {
      for (w of words) {
        console.log(w);
      }
      return findWords();
  })
  .catch((err) => {
    console.error(err);
  })
  .then(() => {
    db.close();
  });
  