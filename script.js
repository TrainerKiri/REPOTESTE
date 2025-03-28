import { supabase, getCurrentUser, isAdmin, createMemory, getMemories, updateMemory, deleteMemory, uploadImage } from './js/supabase.js';

const startDate = new Date("2025-01-06");

// Elementos do DOM
const addMemoriaBtn = document.getElementById("adicionarMemoria");
const adminLoginButton = document.getElementById("adminLoginButton");
const sairButton = document.getElementById("sairButton");
const memoriasLista = document.getElementById("memoriasLista");
const addMemoriaModal = document.getElementById("addMemoriaModal");
const loginModal = document.getElementById("loginModal");

// Inicialização
async function init() {
    await checkAuthState();
    await loadMemories();
    setupEventListeners();
    startTimer();
}

// Verificar estado de autenticação
async function checkAuthState() {
    const admin = await isAdmin();
    addMemoriaBtn.style.display = admin ? 'block' : 'none';
    adminLoginButton.style.display = admin ? 'none' : 'block';
    sairButton.style.display = admin ? 'block' : 'none';
}

// Carregar memórias
async function loadMemories() {
    const { data: memories, error } = await getMemories();
    if (error) {
        console.error('Erro ao carregar memórias:', error);
        return;
    }

    memoriasLista.innerHTML = '';
    memoriasLista.style.display = 'block';
    const admin = await isAdmin();

    memories.forEach(memory => {
        const memoriaElement = createMemoryElement(memory, admin);
        memoriasLista.appendChild(memoriaElement);
    });
}

// Criar elemento de memória
function createMemoryElement(memory, isAdmin) {
    const div = document.createElement('div');
    div.className = 'memoria-item';
    div.innerHTML = `
        <h3>${memory.title}</h3>
        <p>${memory.description}</p>
        <div class="data">${new Date(memory.date).toLocaleDateString()}</div>
        ${memory.image_url ? `<img src="${memory.image_url}" class="imagem-memoria" alt="${memory.title}">` : ''}
        ${isAdmin ? `
            <div class="admin-controls">
                <button class="delete-btn" onclick="excluirMemoria('${memory.id}')">Excluir</button>
            </div>
        ` : ''}
    `;
    return div;
}

// Login
window.fazerLogin = async function() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorMessage = document.getElementById('errorMessage');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        loginModal.style.display = 'none';
        await checkAuthState();
        await loadMemories();
    } catch (error) {
        errorMessage.textContent = 'Erro ao fazer login. Verifique suas credenciais.';
    }
};

// Funções de memória
window.salvarMemoria = async function() {
    const title = document.getElementById('tituloMemoria').value;
    const description = document.getElementById('descricaoMemoria').value;
    const date = document.getElementById('dataMemoria').value;
    const imageFile = document.getElementById('imagemMemoria').files[0];

    let image_url = '';
    if (imageFile) {
        const { data: imageUrl, error: uploadError } = await uploadImage(imageFile);
        if (uploadError) {
            console.error('Erro ao fazer upload da imagem:', uploadError);
            return;
        }
        image_url = imageUrl;
    }

    const { error } = await createMemory({ title, description, date, image_url });
    if (error) {
        console.error('Erro ao salvar memória:', error);
        return;
    }

    fecharModal();
    await loadMemories();
};

// Excluir memória
window.excluirMemoria = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta memória?')) return;

    const { error } = await deleteMemory(id);
    if (error) {
        console.error('Erro ao excluir memória:', error);
        return;
    }

    await loadMemories();
};

// Timer
function startTimer() {
    function updateTimer() {
        const now = new Date();
        const diff = now - startDate;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('diasNamoro').textContent = 
            `${days} dias, ${hours} horas, ${minutes} minutos e ${seconds} segundos`;
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// Event Listeners
function setupEventListeners() {
    // Login e Logout
    adminLoginButton.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    sairButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            await checkAuthState();
            window.location.reload();
        }
    });

    // Modal de Adicionar Memória
    addMemoriaBtn.addEventListener('click', () => {
        addMemoriaModal.style.display = 'block';
    });

    // Fechar modais quando clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === addMemoriaModal || e.target === loginModal) {
            fecharModal();
        }
    });

    // Permitir login com Enter
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            window.fazerLogin();
        }
    });
}

// Fechar modais
window.fecharModal = function() {
    addMemoriaModal.style.display = 'none';
    loginModal.style.display = 'none';
};

// Inicializar
init();