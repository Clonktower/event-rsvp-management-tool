// Utility to get API host based on environment

const isProd = import.meta.env.MODE === 'production';

export const API_HOST = isProd ? 'https://api.rsvp.clonktower.de' : 'http://localhost:3000';
