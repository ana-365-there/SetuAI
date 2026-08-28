/**
 * Vernacular & Regional Language Translation Utility
 * Translates texts into Indian regional languages with native script and phonetic transliteration.
 */

const axios = require('axios');

const SUPPORTED_LANGUAGES = {
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "ml": "Malayalam",
    "pa": "Punjabi"
};

const OFFLINE_DICTIONARY = {
    "hi": {
        "Power surge detected": "बिजली का झटका (सर्ज) पाया गया",
        "Turn off the geyser immediately": "गीज़र को तुरंत बंद करें",
        "High electricity consumption": "अधिक बिजली की खपत",
        "Air conditioner left on": "एयर कंडीशनर चालू छोड़ दिया गया है",
        "Monthly energy bill": "मासिक बिजली बिल"
    },
    "ta": {
        "Power surge detected": "மின் அதிர்வு கண்டறியப்பட்டது",
        "Turn off the geyser immediately": "கீசரை உடனடியாக அணைக்கவும்",
        "High electricity consumption": "அதிக மின்சார நுகர்வு",
        "Monthly energy bill": "மாதாந்திர மின் கட்டணம்"
    },
    "te": {
        "Power surge detected": "విద్యుత్ సర్జ్ గుర్తించబడింది",
        "Turn off the geyser immediately": "గీజర్‌ను వెంటనే ఆపివేయండి",
        "High electricity consumption": "అధిక విద్యుత్ వినియోగం",
        "Monthly energy bill": "నెలవారీ విద్యుత్ బిల్లు"
    },
    "kn": {
        "Power surge detected": "ವಿದ್ಯುತ್ ಸರ್ಜ್ ಪತ್ತೆಯಾಗಿದೆ",
        "Turn off the geyser immediately": "ಗೀಸರ್ ಅನ್ನು ತಕ್ಷಣ ಆಫ್ ಮಾಡಿ",
        "High electricity consumption": "ಹೆಚ್ಚಿನ ವಿದ್ಯುತ್ ಬಳಕೆ",
        "Monthly energy bill": "ಮಾಸಿಕ ವಿದ್ಯುತ್ ಬಿಲ್"
    }
};

const translateText = async (text, targetLang) => {
    const langCode = (targetLang || 'hi').toLowerCase().trim();
    const langName = SUPPORTED_LANGUAGES[langCode] || 'Hindi';

    // 1. Check offline dictionary
    if (OFFLINE_DICTIONARY[langCode] && OFFLINE_DICTIONARY[langCode][text]) {
        return {
            source_text: text,
            target_language_code: langCode,
            target_language_name: langName,
            translated_text: OFFLINE_DICTIONARY[langCode][text],
            phonetic_romanized: text, // Offline dictionary keeps phonetic simple or same
            engine: "offline_dictionary"
        };
    }

    // 2. Use OpenRouter LLM Translation if API_KEY is available
    if (process.env.API_KEY) {
        try {
            const prompt = `Translate the following text into natural, fluent ${langName} (${langCode}).
Also provide the romanized phonetic pronunciation (in English letters).

TEXT TO TRANSLATE:
"${text}"

OUTPUT STRICT JSON format:
{
  "translated_text": "translation in native script",
  "phonetic_romanized": "romanized english pronunciation"
}`;

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: 'anthropic/claude-3-haiku', // use the same model as categorizer for guaranteed success
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional Indian regional language translator. Output strict JSON only.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 250
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content.trim();
            
            // Extract JSON matching block
            const jsonMatch = content.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return {
                    source_text: text,
                    target_language_code: langCode,
                    target_language_name: langName,
                    translated_text: parsed.translated_text || text,
                    phonetic_romanized: parsed.phonetic_romanized || text,
                    engine: "openrouter_llm"
                };
            }
        } catch (error) {
            console.error('⚠️ LLM translation failed:', error.response?.data || error.message);
        }
    }

    // Fallback
    const fallbackText = (OFFLINE_DICTIONARY[langCode] && OFFLINE_DICTIONARY[langCode][text]) || `[${langName}] ${text}`;
    return {
        source_text: text,
        target_language_code: langCode,
        target_language_name: langName,
        translated_text: fallbackText,
        phonetic_romanized: text,
        engine: "fallback"
    };
};

module.exports = {
    SUPPORTED_LANGUAGES,
    translateText
};
