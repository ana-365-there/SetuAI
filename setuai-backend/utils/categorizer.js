const axios = require('axios');

const CATEGORIES = ['Healthcare', 'Education', 'Agriculture', 'Environment', 'Technology', 'Infrastructure', 'Other'];

const categorizeChallenge = async (title, description) => {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'anthropic/claude-3-haiku', // pick any model OpenRouter supports — fast/cheap is fine for classification
                messages: [
                    {
                        role: 'user',
                        content: `Classify this societal challenge into exactly one category from this list: ${CATEGORIES.join(', ')}.

Title: ${title}
Description: ${description}

Respond with ONLY the category name, nothing else.`,
                    },
                ],
                max_tokens: 20,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const category = response.data.choices[0].message.content.trim();

        return CATEGORIES.includes(category) ? category : 'Other';

    } catch (error) {
        console.error('⚠️ AI categorization failed:', error.response?.data || error.message);
        return 'Other';
    }
};

module.exports = categorizeChallenge;