const API_URL = '/api';

const API = {
    async post(endpoint, data) {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async get(endpoint) {
        const res = await fetch(`${API_URL}${endpoint}`);
        return res.json();
    }
};