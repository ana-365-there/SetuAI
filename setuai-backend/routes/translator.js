const express = require('express');
const router = express.Router();
const { SUPPORTED_LANGUAGES, translateText } = require('../utils/translator');
const { body, validationResult } = require('express-validator');

// GET /languages — get supported regional languages
router.get('/languages', (req, res) => {
    res.json({ languages: SUPPORTED_LANGUAGES });
});

// POST /translate — translate a single text
router.post('/translate', [
    body('text', 'text is required').notEmpty(),
    body('target_language', 'target_language must be a valid language code').optional().isIn(Object.keys(SUPPORTED_LANGUAGES))
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { text, target_language } = req.body;
        const result = await translateText(text, target_language || 'hi');
        res.json(result);
    } catch (error) {
        console.error('Translation route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /translate/batch — translate multiple texts
router.post('/translate/batch', [
    body('texts', 'texts must be an array of strings').isArray(),
    body('target_language', 'target_language must be a valid language code').optional().isIn(Object.keys(SUPPORTED_LANGUAGES))
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { texts, target_language } = req.body;
        const targetLang = target_language || 'hi';

        const translations = await Promise.all(
            texts.map(text => translateText(text, targetLang))
        );

        res.json({
            count: translations.length,
            target_language: targetLang,
            translations
        });
    } catch (error) {
        console.error('Batch translation route error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
