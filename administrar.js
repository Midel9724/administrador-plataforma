document.addEventListener('DOMContentLoaded', () => {
    cargarProfesores();
    cargarReportes();

   // 1. FORMULARIO: ALTA DE PROFESOR
    document.getElementById('form-teacher').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('t-name').value,
            email: document.getElementById('t-email').value,
            specialty: document.getElementById('t-specialty').value
        };

        try {
            const res = await fetch(`${API_URL}/teachers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json(); 

            if (res.ok && result.success) {
                alert("✅ Profesor guardado correctamente");
                document.getElementById('form-teacher').reset();
                cargarProfesores(); // Recargar la lista
            } else {
                alert("❌ Error al guardar en Base de Datos. Revisa la consola (F12).");
                console.error("Detalles del error de BD:", result.error || result);
            }
        } catch (error) {
            alert("❌ Error de comunicación con el servidor. ¿Está encendido?");
            console.error("Error de Fetch:", error);
        }
    });

    // 2. BOTÓN: AGREGAR OTRO VIDEO AL FORMULARIO DE CURSO
    document.getElementById('add-lesson-btn').addEventListener('click', () => {
        const container = document.getElementById('lessons-container');
        const lessonHtml = `
            <div class="lesson-input" style="margin-top: 10px;">
                <input type="text" class="l-title" placeholder="Título del video" required>
                <input type="text" class="l-url" placeholder="URL del video" required>
                <button type="button" class="remove-lesson-btn" style="background:red; color:white;">X</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', lessonHtml);

        const btns = container.querySelectorAll('.remove-lesson-btn');
        btns[btns.length - 1].addEventListener('click', function() {
            this.parentElement.remove();
        });
    });

    // 3. FORMULARIO: ALTA DE CURSO COMPLETO
    document.getElementById('form-course').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lessonInputs = document.querySelectorAll('.lesson-input');
        const lessons = [];
        lessonInputs.forEach(div => {
            lessons.push({
                title: div.querySelector('.l-title').value,
                url: div.querySelector('.l-url').value
            });
        });

        const data = {
            title: document.getElementById('c-title').value,
            teacher_id: document.getElementById('c-teacher').value,
            lessons: lessons
        };

        const res = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert("✅ Curso y videos guardados correctamente");
            document.getElementById('form-course').reset();
            document.getElementById('lessons-container').innerHTML = `
                <h4>Lecciones (Secuencia)</h4>
                <div class="lesson-input">
                    <input type="text" class="l-title" placeholder="Título del video" required>
                    <input type="text" class="l-url" placeholder="URL del video" required>
                </div>
            `;
            cargarReportes();
        }
    });
});

// --- FUNCIONES DE CARGA ---

async function cargarProfesores() {
    const res = await fetch(`${API_URL}/teachers`);
    const teachers = await res.json();
    const select = document.getElementById('c-teacher');
    
    select.innerHTML = '<option value="">Selecciona un profesor...</option>';
    teachers.forEach(t => {
        select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
}

async function cargarReportes() {
    const res = await fetch(`${API_URL}/reports`);
    const reports = await res.json();
    const container = document.getElementById('reports-container');
    
    if (reports.length === 0) {
        container.innerHTML = '<p>No hay cursos registrados aún.</p>';
        return;
    }

    let tablaHtml = `
        <table border="1" width="100%" cellspacing="0" cellpadding="8" style="text-align: left; margin-top: 10px;">
            <thead>
                <tr>
                    <th>Estado</th>
                    <th>Curso</th>
                    <th>Calificación</th>
                    <th>Vistas</th>
                    <th>Acciones de Administrador</th>
                </tr>
            </thead>
            <tbody>
    `;

    reports.forEach(r => {
        const calificacion = parseFloat(r.avg_rating).toFixed(1);
        const estadoBadge = r.is_active 
            ? '<span style="color: green; font-weight: bold;">Activo</span>' 
            : '<span style="color: gray; font-weight: bold;">Inactivo</span>';

        const btnEstado = r.is_active 
            ? `<button onclick="cambiarEstado(${r.id}, false)" style="background: #f39c12;">Desactivar</button>`
            : `<button onclick="cambiarEstado(${r.id}, true)" style="background: #27ae60;">Activar</button>`;

        tablaHtml += `
            <tr style="${!r.is_active ? 'opacity: 0.6;' : ''}">
                <td>${estadoBadge}</td>
                <td><strong>${r.title}</strong></td>
                <td>${calificacion} ⭐</td>
                <td>${r.total_views}</td>
                <td style="display: flex; gap: 5px;">
                    <button onclick="editarCurso(${r.id}, '${r.title}')" style="background: #3498db;">Editar</button>
                    ${btnEstado}
                    <button onclick="verResenas(${r.id}, '${r.title}')" style="background: #9b59b6;">Reseñas</button>
                    <button onclick="eliminarCurso(${r.id})" style="background: #e74c3c;">Eliminar</button>
                </td>
            </tr>
        `;
    });

    tablaHtml += `</tbody></table><div id="resenas-modal" style="margin-top: 20px;"></div>`;
    container.innerHTML = tablaHtml;
}

// ==========================================
// NUEVAS FUNCIONES GLOBALES PARA BOTONES
// ==========================================

window.eliminarCurso = async (id) => {
    if(confirm("¿Estás seguro de eliminar este curso DEFINITIVAMENTE? Se borrarán sus videos y progreso de usuarios.")) {
        await fetch(`${API_URL}/courses/${id}`, { method: 'DELETE' });
        cargarReportes();
    }
};

window.cambiarEstado = async (id, activar) => {
    await fetch(`${API_URL}/courses/${id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: activar })
    });
    cargarReportes();
};

// ==========================================
// LÓGICA DE LA VENTANA DE EDICIÓN AVANZADA
// ==========================================

window.editarCurso = async (id) => {
    try {
        const res = await fetch(`${API_URL}/courses/${id}`);
        const course = await res.json();

        document.getElementById('edit-c-id').value = course.id;
        document.getElementById('edit-c-title').value = course.title;

        const resTeachers = await fetch(`${API_URL}/teachers`);
        const teachers = await resTeachers.json();
        const select = document.getElementById('edit-c-teacher');
        select.innerHTML = '<option value="">Selecciona un profesor...</option>';
        teachers.forEach(t => {
            const isSelected = course.teacher_id === t.id ? 'selected' : '';
            select.innerHTML += `<option value="${t.id}" ${isSelected}>${t.name}</option>`;
        });

        const list = document.getElementById('edit-lessons-list');
        list.innerHTML = ''; 
        
        if(course.lessons && course.lessons.length > 0) {
            course.lessons.forEach(l => {
                agregarInputVideoModal(l.title, l.video_url);
            });
        } else {
            agregarInputVideoModal('', '');
        }

        document.getElementById('modal-editar').style.display = 'flex';
    } catch (error) {
        console.error("Error cargando curso para editar:", error);
        alert("Hubo un problema al cargar los datos del curso.");
    }
};

window.cerrarModalEditar = () => {
    document.getElementById('modal-editar').style.display = 'none';
};

// Crear fila de video dinámicamente con botones de REORDENAR
window.agregarInputVideoModal = (title = '', url = '') => {
    const list = document.getElementById('edit-lessons-list');
    const div = document.createElement('div');
    div.className = 'lesson-input-item';
    div.style = "display:flex; gap:10px; margin-bottom:10px; align-items:center; background:#eee; padding:10px; border-radius:4px;";
    
    div.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
            <button type="button" onclick="moverVideo(this, -1)" style="padding:2px 5px; font-size:12px; cursor:pointer;" title="Subir video">▲</button>
            <button type="button" onclick="moverVideo(this, 1)" style="padding:2px 5px; font-size:12px; cursor:pointer;" title="Bajar video">▼</button>
        </div>
        <input type="text" class="edit-l-title" placeholder="Nombre del video" value="${title}" required style="flex:2; padding:8px; border:1px solid #ccc; border-radius:4px;">
        <input type="text" class="edit-l-url" placeholder="URL" value="${url}" required style="flex:3; padding:8px; border:1px solid #ccc; border-radius:4px;">
        <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c; color:white; padding:8px 12px; border:none; border-radius:4px; cursor:pointer;" title="Eliminar">X</button>
    `;
    list.appendChild(div);
};

// Función para mover el contenedor del video hacia arriba o abajo
window.moverVideo = (btn, direccion) => {
    const fila = btn.parentElement.parentElement;
    if (direccion === -1 && fila.previousElementSibling) {
        // Mover hacia arriba
        fila.parentNode.insertBefore(fila, fila.previousElementSibling);
    } else if (direccion === 1 && fila.nextElementSibling) {
        // Mover hacia abajo
        fila.parentNode.insertBefore(fila.nextElementSibling, fila);
    }
};

// Guardar los cambios del curso y el nuevo orden de los videos
document.getElementById('form-edit-course').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-c-id').value;
    const title = document.getElementById('edit-c-title').value;
    const teacher_id = document.getElementById('edit-c-teacher').value;

    // Al capturar los elementos en este momento, se respeta el orden visual actual
    const inputs = document.querySelectorAll('#edit-lessons-list .lesson-input-item');
    const lessons = [];
    inputs.forEach(div => {
        lessons.push({
            title: div.querySelector('.edit-l-title').value,
            url: div.querySelector('.edit-l-url').value
        });
    });

    try {
        const res = await fetch(`${API_URL}/courses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, teacher_id, lessons })
        });

        if (res.ok) {
            alert("✅ Curso y videos actualizados correctamente");
            cerrarModalEditar();
            cargarReportes(); 
        } else {
            const data = await res.json();
            console.error("Error al guardar:", data);
            alert("❌ Hubo un error al actualizar el curso.");
        }
    } catch (error) {
        console.error("Error en la petición:", error);
    }
});

// Ver reseñas del curso
// Ver reseñas del curso con diseño cálido (Warm Glass)
window.verResenas = async (id, titulo) => {
    try {
        const res = await fetch(`${API_URL}/courses/${id}/reviews`);
        const resenas = await res.json();
        const modalContenedor = document.getElementById('resenas-modal');
        
        // Estructura de la tarjeta principal
        let html = `
            <div style="background: rgba(255,255,255,0.85); padding: 25px; border-radius: 20px; margin-top: 20px; box-shadow: 0 15px 35px rgba(255,126,95,0.15); border: 2px solid rgba(255,255,255,0.9); animation: fadeIn 0.4s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px dashed rgba(255, 126, 95, 0.3); padding-bottom: 10px;">
                    <h4 style="color: var(--primary); font-size: 1.4rem; margin: 0;">Reseñas de: ${titulo}</h4>
                    <button onclick="document.getElementById('resenas-modal').innerHTML=''" style="background: var(--danger); padding: 8px 15px; border-radius: 50px; font-size: 0.85rem;">X Cerrar</button>
                </div>
        `;
        
        if (resenas.length === 0) {
            html += `<p style="color: var(--text-dim); font-style: italic; text-align: center; padding: 20px 0;">Nadie ha calificado este curso aún. ¡Pronto llegarán los primeros comentarios!</p>`;
        } else {
            html += `<div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">`;
            
            resenas.forEach(r => {
                const fecha = new Date(r.created_at).toLocaleDateString();
                const estrellas = '⭐'.repeat(r.rating); // Repite el emoji según la calificación (1 a 5)

                html += `
                    <div style="background: #ffffff; padding: 18px; margin-bottom: 15px; border-left: 6px solid var(--primary); border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--text-main); font-size: 1.1rem;">👤 ${r.full_name}</strong>
                            <span style="color:#ffb400; font-size: 1.2rem; letter-spacing: 2px;">${estrellas}</span>
                        </div>
                        <p style="margin: 0 0 10px 0; color: #5a3c2e; font-size: 0.95rem; font-style: italic;">"${r.comment}"</p>
                        <small style="color: #a08070; font-weight: bold;">📅 Publicado el: ${fecha}</small>
                    </div>
                `;
            });
            
            html += `</div>`; // Cierra el contenedor con scroll
        }
        
        html += `</div>`; // Cierra la tarjeta principal
        modalContenedor.innerHTML = html;
        
    } catch (error) {
        console.error("Error al cargar reseñas:", error);
        alert("Hubo un problema al cargar las reseñas.");
    }
};