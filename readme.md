# Exercice #2

## Notes pour la remise

Cet exercice est dû pour le **mardi, 4 avril 2017**.

La remise électronique se fait via la plateforme Moodle.

## Objectif

À l'aide du logiciel [Node.js](https://nodejs.org/en/), créer un serveur web moteur de recherche pour le site web de l'UQAC, à l'aide du langage JavaScript.

Le serveur a deux fonctions:
- Il doit indexer le site web de l'UQAC en implémentant un *robot d'indexation*
- Il doit présenter, sur demande d'un navigateur, une page de recherche

### Robot d'indexation

Le robot d'indexation parcourt les différentes pages du site web de l'UQAC, en parcourant les liens trouvés à chaque page.

Il doit conserver, pour chaque page, la liste des mots dans le contenu de ces pages pour pouvoir faire des recherches.

Il doit également conserver, pour chaque page, le nombre de pages y menant, afin de faire un classement.

Il est recommandé de sauvegarder les données dans un fichier afin d'éviter de refaire l'ensemble des requêtes à chaque lancement.

On devrait également pouvoir limiter le nombre de pages à explorer à un maximum quelconque.

### Page de recherche

Le serveur doit présenter une page de recherche lorsqu'un navigateur la lui demande.

L'utilisateur doit pouvoir tapper des mots clés, et appuyer sur un bouton d'envoi.

Le serveur doit présenter une page listant les différents résultats, avec un tri de pertinence.

## Installation

- Ouvrir un terminal dans le dossier;
- Exécuter la commande ```npm install``` pour installer les dépendances;
