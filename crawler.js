#!/usr/bin/env node

const http = require('http');
const URLs = ['http://uqac.ca'];
const visites = new Set();
const sites = new Map();
let remaining = 100;

function process(url, response) {
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

function crawl() {
  const nextURL = URLs.shift();
  return new Promise((resolve) => {
    const req = http.get(nextURL, (res) => {
      let data = "";
      res.on('data', (d) => data += d);
      res.on('end', () => {
        process(nextURL, data);
        resolve();
      });
    });
    req.on('error', (err) => {
      console.log(err);
      resolve();
    });
  });
}

function iterate() {
  if (remaining-- === 0)
    return;

  if (URLs.length > 0)
    return crawl().then(iterate);
}

iterate()
  .then(() => {
    sites.forEach((score, lien) => {
      console.log(score, lien);
    });
  });
