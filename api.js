const API_URL = 'http://localhost:3000/api';

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