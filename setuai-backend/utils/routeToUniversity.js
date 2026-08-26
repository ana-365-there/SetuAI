const universities = require('../data/universities');

const CATEGORY_EXPERTISE = {
    Healthcare: ['Healthcare', 'Medical Research', 'Biomedical Engineering'],
    Environment: ['Renewable Energy', 'Materials Science'],
    Technology: ['Artificial Intelligence', 'Data Science', 'IoT', 'Cybersecurity', 'Robotics', 'Machine Learning'],
    Infrastructure: ['IoT', 'Robotics', 'Materials Science', 'Renewable Energy'],
};

const routeToUniversity = (category) => {
    const relevantExpertise = CATEGORY_EXPERTISE[category] || [category];
    const matches = universities.filter((university) =>
        university.expertise.some((expertise) => relevantExpertise.includes(expertise))
    );

    if (matches.length === 0) {
        return null; // no match — leave unassigned, flag for manual routing
    }

    // if multiple match, just pick the first — or randomize for basic load distribution
    return matches[0].name;
};

module.exports = routeToUniversity;
