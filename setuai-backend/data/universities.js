const universities = [
    {
        id: "bit-mesra",
        name: "Birla Institute of Technology, Mesra",
        location: "Ranchi",
        expertise: [
            { category: "Technology", priority: 2 },
            { category: "Infrastructure", priority: 2 },
            { category: "Environment", priority: 3 },
        ],
        departments: ["Computer Science", "Electronics", "Civil Engineering", "Mechanical Engineering"],
        facilities: ["AI Research Lab", "Structural Engineering Lab"]
    },
    {
        id: "ism-dhanbad",
        name: "IIT (ISM) Dhanbad",
        location: "Dhanbad",
        expertise: [
            { category: "Infrastructure", priority: 1 },
            { category: "Environment", priority: 1 },
            { category: "Technology", priority: 2 },
        ],
        departments: ["Mining Engineering", "Environmental Science", "Computer Science", "Petroleum Engineering"],
        facilities: ["Mining & Geo-Engineering Lab", "Environmental Research Center"]
    },
    {
        id: "nit-jamshedpur",
        name: "NIT Jamshedpur",
        location: "Jamshedpur",
        expertise: [
            { category: "Technology", priority: 2 },
            { category: "Infrastructure", priority: 2 },
            { category: "Agriculture", priority: 4 },
        ],
        departments: ["Computer Science", "Mechanical Engineering", "Civil Engineering"],
        facilities: ["Manufacturing Research Lab", "Computing Center"]
    },
    {
        id: "rims-ranchi",
        name: "Rajendra Institute of Medical Sciences (RIMS)",
        location: "Ranchi",
        expertise: [
            { category: "Healthcare", priority: 2 },
        ],
        departments: ["Medical Sciences", "Nursing", "Public Health"],
        facilities: ["Medical Research Lab", "Community Health Center"]
    },
    {
        id: "cip-ranchi",
        name: "Central Institute of Psychiatry (CIP)",
        location: "Ranchi",
        expertise: [
            { category: "Healthcare", priority: 3 },
        ],
        departments: ["Psychiatry", "Mental Health Research"],
        facilities: ["Mental Health Research Center"]
    },
    {
        id: "bau-ranchi",
        name: "Birsa Agricultural University",
        location: "Ranchi",
        expertise: [
            { category: "Agriculture", priority: 1 },
            { category: "Environment", priority: 2 },
        ],
        departments: ["Agricultural Sciences", "Soil Science", "Horticulture"],
        facilities: ["Agricultural Research Farm", "Soil Testing Lab"]
    },
    {
        id: "ranchi-university",
        name: "Ranchi University",
        location: "Ranchi",
        expertise: [
            { category: "Education", priority: 1 },
            { category: "Environment", priority: 3 },
        ],
        departments: ["Education", "Social Sciences", "Environmental Studies"],
        facilities: ["Central Library", "Social Research Center"]
    },
    {
        id: "xiss-ranchi",
        name: "Xavier Institute of Social Service (XISS)",
        location: "Ranchi",
        expertise: [
            { category: "Education", priority: 2 },
            { category: "Infrastructure", priority: 4 },
        ],
        departments: ["Rural Development", "Social Work", "Management"],
        facilities: ["Rural Development Research Center"]
    },

    // --- Top pan-India institutions (fallback for categories/regions Jharkhand list doesn't fully cover) ---
    {
        id: "iitd",
        name: "IIT Delhi",
        location: "New Delhi",
        expertise: [
            { category: "Technology", priority: 1 },
            { category: "Infrastructure", priority: 2 },
            { category: "Environment", priority: 3 },
        ],
        departments: ["Computer Science", "Electrical Engineering", "Mechanical Engineering"],
        facilities: ["Robotics Research Lab", "Energy Research Lab"]
    },
    {
        id: "iisc",
        name: "IISc Bangalore",
        location: "Bangalore",
        expertise: [
            { category: "Technology", priority: 1 },
            { category: "Environment", priority: 2 },
        ],
        departments: ["Computer Science", "Electrical Engineering", "Mechanical Engineering"],
        facilities: ["AI Research Lab", "Data Science Research Lab"]
    },
    {
        id: "aiims-delhi",
        name: "AIIMS Delhi",
        location: "New Delhi",
        expertise: [
            { category: "Healthcare", priority: 1 },
        ],
        departments: ["Medical Sciences", "Biomedical Engineering"],
        facilities: ["Medical Research Lab", "Healthcare Innovation Lab"]
    },
    {
        id: "vit",
        name: "VIT Vellore",
        location: "Vellore",
        expertise: [
            { category: "Technology", priority: 3 },
            { category: "Infrastructure", priority: 3 },
        ],
        departments: ["Computer Science", "Electronics", "Mechanical Engineering"],
        facilities: ["Robotics Lab", "IoT Research Lab"]
    },
];

module.exports = universities;