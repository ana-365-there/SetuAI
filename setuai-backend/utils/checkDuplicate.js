const stringSimilarity = require('string-similarity');
const Challenge = require('../models/Challenge');

const checkDuplicate = async (title, category) => {
    // Only compare against challenges in the same category — cheaper and more relevant
    const existing = await Challenge.find({ category }).select('title');

    if (existing.length === 0) return null;

    const titles = existing.map((c) => c.title);
    const { bestMatch } = stringSimilarity.findBestMatch(title, titles);

    // threshold — tune this; 0.6+ usually means genuinely similar
    if (bestMatch.rating > 0.6) {
        const duplicate = existing.find((c) => c.title === bestMatch.target);
        return duplicate; // return the matched challenge
    }

    return null;
};

module.exports = checkDuplicate;