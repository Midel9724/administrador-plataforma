const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2XScZadpedX54Xe.root',
    password: 'Mq5zRGtUO6YtHJOy',
    database: 'plataformacursos',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

db.connect((err) => {
    if (err) console.error('Error de conexión:', err);
    else console.log('Conectado a TiDB Cloud con éxito');
});

// LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: "No autorizado" });
        const match = await bcrypt.compare(password, results[0].password_hash);
        if (match) res.json({ success: true, user: { name: results[0].full_name, email: results[0].email } });
        else res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    });
});

// PROFESORES
app.get('/api/teachers', (req, res) => {
    db.query('SELECT * FROM teachers', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/teachers', (req, res) => {
    const { name, email, specialty } = req.body;
    db.query('INSERT INTO teachers (name, email, specialty) VALUES (?, ?, ?)', [name, email, specialty], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// CURSOS (Alta y Reportes)
app.post('/api/courses', (req, res) => {
    const { title, teacher_id, lessons } = req.body;
    db.query('INSERT INTO courses (title, teacher_id) VALUES (?, ?)', [title, teacher_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        const courseId = result.insertId;
        if (lessons && lessons.length > 0) {
            const values = lessons.map((l, i) => [courseId, l.title, l.url, i + 1]);
            db.query('INSERT INTO lessons (course_id, title, video_url, sequence_order) VALUES ?', [values], (err2) => {
                if (err2) return res.status(500).json({ success: false });
                res.json({ success: true });
            });
        } else res.json({ success: true });
    });
});

app.get('/api/reports', (req, res) => {
    const sql = `
        SELECT c.id, c.title, c.is_active, IFNULL(AVG(r.rating), 0) as avg_rating, IFNULL(SUM(lp.views), 0) as total_views
        FROM courses c
        LEFT JOIN reviews r ON c.id = r.course_id
        LEFT JOIN lessons l ON c.id = l.course_id
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id
        GROUP BY c.id, c.title, c.is_active`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// EDICIÓN AVANZADA
app.get('/api/courses/:id', (req, res) => {
    db.query('SELECT * FROM courses WHERE id = ?', [req.params.id], (err, course) => {
        db.query('SELECT * FROM lessons WHERE course_id = ? ORDER BY sequence_order', [req.params.id], (err2, lessons) => {
            res.json({ ...course[0], lessons });
        });
    });
});

app.put('/api/courses/:id', (req, res) => {
    const { title, teacher_id, lessons } = req.body;
    db.query('UPDATE courses SET title = ?, teacher_id = ? WHERE id = ?', [title, teacher_id, req.params.id], (err) => {
        db.query('DELETE FROM lessons WHERE course_id = ?', [req.params.id], () => {
            if (lessons.length > 0) {
                const values = lessons.map((l, i) => [req.params.id, l.title, l.url, i + 1]);
                db.query('INSERT INTO lessons (course_id, title, video_url, sequence_order) VALUES ?', [values], () => res.json({ success: true }));
            } else res.json({ success: true });
        });
    });
});

app.put('/api/courses/:id/toggle-status', (req, res) => {
    db.query('UPDATE courses SET is_active = ? WHERE id = ?', [req.body.is_active, req.params.id], () => res.json({ success: true }));
});

app.delete('/api/courses/:id', (req, res) => {
    db.query('DELETE FROM courses WHERE id = ?', [req.params.id], () => res.json({ success: true }));
});

app.get('/api/courses/:id/reviews', (req, res) => {
    db.query('SELECT u.full_name, r.rating, r.comment FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.course_id = ?', [req.params.id], (err, resu) => res.json(resu));
});



app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));