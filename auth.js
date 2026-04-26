document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            window.location.href = 'administrar.html';
        } else {
            document.getElementById('auth-message').innerText = 'Error: ' + data.message;
        }
    } catch (err) {
        console.error(err);
    }
});