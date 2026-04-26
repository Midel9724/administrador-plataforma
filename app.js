const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3000"
    : window.location.origin;
let editCancionId = null, editAdminId = null, editArtistaId = null, editGeneroId = null;

// En tu archivo app.js, busca la función mostrarSeccion y asegúrate de que esté así:
function mostrarSeccion(id) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    
    if (id === 'con-cancion') cargarCanciones();
    if (id === 'con-clie') cargarUsuarios('cliente', 'tabla-clientes-body');
    if (id === 'reg-user') cargarUsuarios('admin', 'tabla-admins-body');
    if (id === 'reg-cancion') { poblarSelectsArtGen(); }
    if (id === 'con-artista') cargarArtistasAdmin();
    
    // CAMBIO AQUÍ: Antes decía 'reg-genero', pero debe llamar a la función de carga
    if (id === 'reg-genero') cargarGenerosAdmin(); 
}
async function ejecutarLogin() {
    const usuario = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({usuario, password}) });
    const data = await res.json();
    if (data.auth) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        mostrarSeccion('reg-cancion');
    } else alert(data.message);
}

// --- ARTISTAS ---
// --- REEMPLAZA ESTA FUNCIÓN EN TU app.js ---
async function cargarArtistasAdmin() {
    const res = await fetch(`${API_URL}/artistas-con-canciones`);
    const datos = await res.json();
    document.getElementById('lista-artistas-acordion').innerHTML = datos.map((a, i) => {
        // Escapamos comillas por si el nombre tiene apóstrofes
        const aEscapado = JSON.stringify(a).replace(/'/g, "&#39;");
        
        return `
        <div style="border: 1px solid #ddd; margin-bottom: 5px; border-radius: 5px; overflow: hidden;">
            <div style="background: #2a3143; color: white; padding: 10px; display: flex; align-items: center; gap: 15px;">
                
                <img src="${a.foto_url || ''}" 
                     width="45" height="45" 
                     style="border-radius: 50%; object-fit: cover; border: 2px solid #8b5cf6;"
                     onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(a.nombre)}&background=8b5cf6&color=fff';">
                     
                <div onclick="toggleAcc(${i})" style="flex-grow:1; cursor:pointer;">
                    <strong>${a.nombre}</strong> <span style="font-size: 0.8em; color: #aaa;">(${a.estado ? 'Activo' : 'Inactivo'})</span>
                </div>
                
                <button onclick='prepararEdArtista(${aEscapado})'>Editar</button>
                <button onclick="cambiarEst('Artistas', ${a.id_artista}, ${a.estado})">${a.estado ? 'Inactivar' : 'Activar'}</button>
                <button onclick="eliminar('Artistas', ${a.id_artista})">Borrar</button>
            </div>
            <div id="acc-${i}" style="display:none; padding:15px; background: white; color: #333;">
                <p><em>${a.biografia || 'Sin biografía'}</em></p>
                <hr style="margin: 10px 0; border: 0; border-top: 1px solid #eee;">
                <ul style="list-style: none; padding: 0;">
                    ${a.canciones.length > 0 
                        ? a.canciones.map(c => `<li style="padding: 4px 0;">🎵 ${c}</li>`).join('') 
                        : '<li style="color: #999;">No hay canciones asignadas</li>'}
                </ul>
            </div>
        </div>`
    }).join('');
}


// --- GÉNEROS ---
async function cargarGenerosAdmin() {
    const res = await fetch(`${API_URL}/admin/generos`);
    const data = await res.json();
    document.getElementById('tabla-generos-body').innerHTML = data.map(g => `
        <tr><td>${g.nombre_genero}</td><td>${g.estado ? 'Activo' : 'Inactivo'}</td>
        <td><button onclick='prepararEdGen(${JSON.stringify(g)})'>Editar</button>
        <button onclick="cambiarEst('Generos', ${g.id_genero}, ${g.estado})">Estado</button>
        <button onclick="eliminar('Generos', ${g.id_genero})">Borrar</button></td></tr>`).join('');
}

async function guardarGenero() {
    const datos = { nombre_genero: document.getElementById('gen-nom').value, descripcion: document.getElementById('gen-desc').value };
    const url = editGeneroId ? `${API_URL}/admin/generos/${editGeneroId}` : `${API_URL}/admin/generos`;
    await fetch(url, { method: editGeneroId ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
    cancelarEdGen(); cargarGenerosAdmin();
}

function prepararEdGen(g) { editGeneroId = g.id_genero; document.getElementById('gen-nom').value = g.nombre_genero; document.getElementById('btn-gen-main').innerText = "Actualizar"; document.getElementById('btn-gen-cancel').style.display = "inline"; }
function cancelarEdGen() { editGeneroId = null; document.getElementById('gen-nom').value = ''; document.getElementById('btn-gen-main').innerText = "Registrar"; document.getElementById('btn-gen-cancel').style.display = "none"; }

// --- CANCIONES ---
async function cargarCanciones() {
    const res = await fetch(`${API_URL}/canciones`);
    const data = await res.json();
    document.getElementById('tabla-canciones-body').innerHTML = data.map(c => `
        <tr>
            <td>
                <img src="${c.ruta_portada || ''}" 
                     width="45" height="45" 
                     style="object-fit: cover; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"
                     onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.titulo)}&background=random&color=fff';">
            </td>
            <td><strong>${c.titulo}</strong></td>
            <td>${c.nombre_artista || 'Desconocido'}</td>
            <td>
                <span style="padding: 4px 8px; border-radius: 4px; color: white; background: ${c.estado ? '#2ecc71' : '#e74c3c'}; font-size: 0.8em;">
                    ${c.estado ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button onclick='prepararEdCan(${JSON.stringify(c).replace(/'/g, "&#39;")})'>Editar</button>
                <button onclick="cambiarEst('Canciones', ${c.id_cancion}, ${c.estado})">Estado</button>
                <button onclick="eliminar('Canciones', ${c.id_cancion})">Borrar</button>
            </td>
        </tr>`).join('');
}


async function guardarCancion() {
    const titulo = document.getElementById('mus-nom').value;
    const id_artista = document.getElementById('mus-art-id').value;
    const id_genero = document.getElementById('mus-gen').value;
    const ruta_mp3 = document.getElementById('mus-url').value;    // Cambiado de url_cancion
    const ruta_portada = document.getElementById('mus-img').value; // Cambiado de url_portada
    const creditos = document.getElementById('mus-cred').value;
    const descripcion = document.getElementById('mus-desc').value;

    if (!titulo || !id_artista || !id_genero) {
        return alert("Por favor, selecciona Título, Artista y Género");
    }

    const datos = { 
        titulo, 
        id_artista: parseInt(id_artista), 
        id_genero: parseInt(id_genero), 
        ruta_mp3, 
        ruta_portada,
        creditos,
        descripcion
    };

    try {
        const res = await fetch(`${API_URL}/admin/canciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            alert("¡Canción guardada correctamente!");
            mostrarSeccion('con-cancion');
        } else {
            const error = await res.json();
            alert("Error en el servidor: " + error.sqlMessage);
        }
    } catch (err) {
        alert("Error de conexión con el servidor");
    }
}

function prepararEdCan(c) { editCancionId = c.id_cancion; mostrarSeccion('reg-cancion'); document.getElementById('mus-nom').value = c.titulo; }

async function poblarSelectsArtGen() {
    const rArt = await fetch(`${API_URL}/artistas/activos`); const rGen = await fetch(`${API_URL}/generos/activos`);
    const arts = await rArt.json(); const gens = await rGen.json();
    document.getElementById('mus-art-id').innerHTML = arts.map(a => `<option value="${a.id_artista}">${a.nombre}</option>`).join('');
    document.getElementById('mus-gen').innerHTML = gens.map(g => `<option value="${g.id_genero}">${g.nombre_genero}</option>`).join('');
}

// --- ADMINS ---
async function guardarAdmin() {
    const datos = { nombre: document.getElementById('adm-nom').value, correo: document.getElementById('adm-mail').value, contrasena: document.getElementById('adm-clave').value };
    const url = editAdminId ? `${API_URL}/admin/usuarios/${editAdminId}` : `${API_URL}/admin/usuarios`;
    await fetch(url, { method: editAdminId ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
    cancelarEdAdmin(); cargarUsuarios('admin', 'tabla-admins-body');
}

function prepararEdicionAdmin(u) { editAdminId = u.id_usuario; document.getElementById('adm-nom').value = u.nombre_usuario; document.getElementById('adm-mail').value = u.correo; document.getElementById('btn-admin-cancel').style.display="inline"; }
function cancelarEdAdmin() { editAdminId = null; document.getElementById('adm-nom').value = ''; document.getElementById('btn-admin-cancel').style.display="none"; }

// --- COMUNES ---
async function cargarUsuarios(rol, tablaId) {
    const res = await fetch(`${API_URL}/usuarios/${rol}`);
    const data = await res.json();
    document.getElementById(tablaId).innerHTML = data.map(u => `
        <tr><td>${u.nombre_usuario}</td><td>${u.correo}</td><td>${u.estado ? 'Activo' : 'Inactivo'}</td>
        <td>${rol==='admin' ? `<button onclick='prepararEdicionAdmin(${JSON.stringify(u)})'>Editar</button>` : ''}
        <button onclick="cambiarEst('Usuarios', ${u.id_usuario}, ${u.estado})">Estado</button>
        <button onclick="eliminar('Usuarios', ${u.id_usuario})">Borrar</button></td></tr>`).join('');
}

async function cambiarEst(tabla, id, est) {
    const path = tabla==='Usuarios' ? 'usuarios' : tabla.toLowerCase();
    await fetch(`${API_URL}/admin/${path}/${id}/estado`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({estado: est ? 0 : 1}) });
    mostrarSeccion(document.querySelector('.content-section[style*="block"]').id);
}

async function eliminar(tabla, id) { if (confirm("¿Borrar permanentemente?")) { await fetch(`${API_URL}/eliminar/${tabla}/${id}`, { method: 'DELETE' }); mostrarSeccion(document.querySelector('.content-section[style*="block"]').id); } }
function toggleAcc(i) { const d = document.getElementById(`acc-${i}`); d.style.display = d.style.display==='none' ? 'block' : 'none'; }

// --- CERRAR SESIÓN ---
function cerrarSesion() {
    document.getElementById('admin-panel').style.display = 'none';
    
    // ¡Aquí está el cambio clave! Debe ser 'block', no 'flex'
    document.getElementById('login-section').style.display = 'block'; 
    
    // Limpiar campos
    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value = '';
}


function mostrarFormArtista() {
    document.getElementById('form-artista').style.display = 'block';
    document.getElementById('art-nom').focus();
}

function cancelarEdArtista() { 
    editArtistaId = null; 
    document.getElementById('art-nom').value = ''; 
    document.getElementById('art-foto').value = ''; 
    document.getElementById('art-bio').value = ''; 
    document.getElementById('btn-art-main').innerText = "Registrar Artista"; 
    document.getElementById('form-artista').style.display = 'none';
}

async function guardarArtista() {
    const nombre = document.getElementById('art-nom').value;
    const foto_url = document.getElementById('art-foto').value;
    const biografia = document.getElementById('art-bio').value;

    if(!nombre) return alert("El nombre es obligatorio");

    const datos = { nombre, foto_url, biografia };
    const url = editArtistaId ? `${API_URL}/admin/artistas/${editArtistaId}` : `${API_URL}/admin/artistas`;
    
    const res = await fetch(url, { 
        method: editArtistaId ? 'PUT' : 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(datos) 
    });

    const data = await res.json();
    if (res.status === 400) {
        alert(data.message); // Aquí mostrará "El artista ya existe"
    } else {
        cancelarEdArtista(); 
        cargarArtistasAdmin();
    }
}

// Actualiza prepararEdArtista para que abra el formulario
function prepararEdArtista(a) {
    editArtistaId = a.id_artista;
    mostrarFormArtista(); // Muestra el formulario oculto
    document.getElementById('art-nom').value = a.nombre;
    document.getElementById('art-foto').value = a.foto_url;
    document.getElementById('art-bio').value = a.biografia;
    document.getElementById('btn-art-main').innerText = "Actualizar Artista";
}