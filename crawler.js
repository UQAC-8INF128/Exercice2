#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const urlParse = require('url').parse;
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
        //console.error(err);
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

function findWords (searchTerms) {
    return new Promise((resolve, reject) => {
        let result;
        for (var arg of searchTerms) {
            let currentSet = words.get(arg);
            if (!currentSet)
              return reject("Le mot " + arg + " est introuvable.");

            if (!result)
              result = currentSet;
            else
              result = intersection(result, currentSet);
        }

        if (result && result.size > 0)
          return resolve(result);
        return reject("Les " + searchTerms.length + " mots n'ont pas de lien en commun.");
    });
}

function sortResults(urlSet) {
  function urlSort(a, b) {
    return sites.get(b) - sites.get(a);
  }

  const urlList = Array.from(urlSet);
  urlList.sort(urlSort);
  return urlList;
}

iterate()
  .then(() => {
    return findWords(args._);
  })
  .then(sortResults)
  .then((results) => {
    console.log("Résultat:", results);
  })
  .catch((err) => {
    console.error(err);
  })
  .then(() => {
    db.close();
  });

  const serveur = http.createServer((req, res) => {
    const urlData = urlParse(req.url, true);

    if (req.url.endsWith('/'))
      req.url += 'index.html';

    if (urlData.pathname === '/search') {
      return findWords(urlData.query.words.split(' '))
      .then(sortResults)
      .catch(() => {
        return [];
      })
      .then((results) => {
        res.write(JSON.stringify(results));
        res.end();
      });
    }

    if (req.url === '/time') {
      const now = new Date();
      const nowTime = +now;
      res.write(JSON.stringify(nowTime));
      res.end();
      return;
    }

    try {
      const contenu = fs.readFileSync('.' + req.url);
      res.write(contenu);
    } catch (e) {
      res.status = 404;
    }
    res.end();
  });
  serveur.listen(8888);
