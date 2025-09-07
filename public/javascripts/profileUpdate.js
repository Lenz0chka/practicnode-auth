document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const password = e.target.password.value.trim();

    if (!username || !password) return;

    try {
        const response = await fetch('/profileUpdate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const text = await response.text();

        if (response.redirected) {
            window.location.href = response.url;
        } else {
            document.getElementById('message').textContent = text;
        }
    } catch (err) {
        document.getElementById('message').textContent = 'Ошибка';
    }
});
