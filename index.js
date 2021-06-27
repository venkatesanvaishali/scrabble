import express from 'express';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';

const app = express();
const PORT = 3000;
const dictAPI = 'https://api.dictionaryapi.dev/api/v2/entries/en_US/';
let dictWords = [];
const scores = {};

// =========================== Utilities ==================================
function letterCount(word) {
  const countOfLetter = {};
  for (let i = 0; i < word.length; i += 1) {
    countOfLetter[word[i]] ??= 0;
    countOfLetter[word[i]] += 1;
  }
  return countOfLetter;
}

function isSubstringMatch(systemLetterObj, userLetterObj) {
  return Object.keys(systemLetterObj).every(
    (systemKey) => systemLetterObj[systemKey] <= userLetterObj[systemKey],
  );
}

function calculateScore(word) {
  let totalScore = 0;
  for (let i = 0; i < word.length; i += 1) {
    totalScore += scores[word[i]];
  }
  return totalScore;
}

// =========================== On server start ==================================
fs.readFile('./scores.json', (err, jsonString) => {
  if (err) {
    return;
  }
  JSON.parse(jsonString).forEach((score) => {
    scores[score.letter.toLowerCase()] = score.value;
  });
});

fs.readFile('./words.json', (err, jsonString) => {
  if (err) {
    return;
  }
  dictWords = JSON.parse(jsonString);
});

app.use(cors());

// =========================== API calls ==================================

app.get('/', (req, res) => {
  res.send('Medikura backend is ready');
});

app.get('/getMatchingWords', (req, res) => {
  const userGivenWord = req.query.word.toLowerCase();

  const userLetterCount = letterCount(userGivenWord);
  const matchingWords = [];

  dictWords.forEach((word) => {
    const systemLetterCount = letterCount(word);
    if (isSubstringMatch(systemLetterCount, userLetterCount)) {
      const score = calculateScore(word);
      matchingWords.push({ word, score });
    }
  });
  matchingWords.sort((a, b) => {
    if (a.score === b.score) {
      return b.word.length - a.word.length;
    }
    return b.score - a.score;
  });

  const result = matchingWords.map((word) => axios.get(dictAPI + word.word)
    .then((desc) => ({
      ...word,
      description: desc.data[0].meanings[0].definitions[0].definition,
    }))
    .catch(() => ({
      ...word,
      description: '',
    })));

  Promise.all(result)
    .then((d) => res.json(d))
    .catch(() => res.json([]));
});

app.listen(PORT, () => {
  console.log(`Medikura backend listening at port : ${PORT}`);
});

/**
 * Improvements
 * Count of alphabets validation. Say if z is given more than once in user input, throw error
 */
