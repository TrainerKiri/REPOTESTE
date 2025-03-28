import { signIn, signOut, isAdmin, createMemory, getMemories, deleteMemory, uploadImage, getMemoryById, addMemoryImages, updateMemory, addMemoryTrack, deleteMemoryTrack } from './supabase.js';
import { searchTracks } from './spotify.js';

const START_DATE = new Date("2025-01-06");

class MemoriasApp {
    constructor() {
        this.initializeElements();
        this.init();
        this.currentAudio = null;
    }

    initializeElements() {
        this.elements = {
            addMemoriaBtn: document.getElementById("adicionarMemoria"),
            adminLoginButton: document.getElementById("adminLoginButton"),
            sairButton: document.getElementById("sairButton"),
            memoriasLista: document.getElementById("memoriasLista"),
            addMemoriaModal: document.getElementById("addMemoriaModal"),
            loginModal: document.getElementById("loginModal"),
            loginForm: document.getElementById("loginForm"),
            timerElement: document.getElementById("diasNamoro"),
            closeButtons: document.querySelectorAll('.close-btn'),
            memoriaForm: document.getElementById("memoriaForm"),
            memoriaModal: document.getElementById("memoriaModal"),
            memoriaDetalhes: document.getElementById("memoriaDetalhes"),
            trackSearchInput: document.getElementById("trackSearch"),
            trackResults: document.getElementById("trackResults")
        };
    }

    async init() {
        await this.checkAuthState();
        await this.loadMemories();
        this.setupEventListeners();
        this.startTimer();
    }

    async checkAuthState() {
        const admin = await isAdmin();
        this.elements.addMemoriaBtn.style.display = admin ? 'block' : 'none';
        this.elements.adminLoginButton.style.display = admin ? 'none' : 'block';
        this.elements.sairButton.style.display = admin ? 'block' : 'none';
    }

    async loadMemories() {
        try {
            const { data: memories, error } = await getMemories();
            if (error) throw error;

            this.elements.memoriasLista.innerHTML = '';
            this.elements.memoriasLista.style.display = 'block';
            const admin = await isAdmin();

            memories.forEach(memory => {
                const memoriaElement = this.createMemoryElement(memory, admin);
                this.elements.memoriasLista.appendChild(memoriaElement);
            });
        } catch (error) {
            console.error('Erro ao carregar memórias:', error);
        }
    }

    createMemoryElement(memory, isAdmin) {
        const div = document.createElement('div');
        div.className = 'memoria-item';
        
        const date = new Date(memory.date + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        div.innerHTML = `
            <div class="memoria-header">
                <h3>${memory.title}</h3>
                <div class="data">${formattedDate}</div>
            </div>
            <p class="memoria-description">${memory.description}</p>
            ${memory.image_url ? `<img src="${memory.image_url}" class="imagem-memoria" alt="${memory.title}">` : ''}
            ${isAdmin ? `
                <div class="admin-controls">
                    <button class="edit-btn" data-id="${memory.id}">Editar</button>
                    <button class="delete-btn" data-id="${memory.id}">Excluir</button>
                </div>
            ` : ''}
        `;

        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('edit-btn')) {
                this.abrirMemoria(memory.id);
            }
        });

        if (isAdmin) {
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.excluirMemoria(memory.id);
            });

            const editBtn = div.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editarMemoria(memory.id);
            });
        }

        return div;
    }

    async editarMemoria(id) {
        try {
            const { data: memory, error } = await getMemoryById(id);
            if (error) throw error;

            document.getElementById('memoriaId').value = memory.id;
            document.getElementById('tituloMemoria').value = memory.title;
            document.getElementById('descricaoMemoria').value = memory.description;
            document.getElementById('dataMemoria').value = memory.date;

            const tracksList = document.getElementById('currentTracks');
            tracksList.innerHTML = '';
            
            if (memory.memory_tracks) {
                memory.memory_tracks.forEach(track => {
                    const trackElement = document.createElement('div');
                    trackElement.className = 'memory-track';
                    trackElement.innerHTML = `
                        <div class="track-info">
                            <div class="track-name">${track.track_name}</div>
                            <div class="track-artist">${track.artist_name}</div>
                        </div>
                        <button class="delete-btn" data-id="${track.id}">Remover</button>
                    `;

                    const deleteBtn = trackElement.querySelector('.delete-btn');
                    deleteBtn.addEventListener('click', () => this.removerTrack(track.id));

                    tracksList.appendChild(trackElement);
                });
            }

            this.elements.addMemoriaModal.style.display = 'block';
            document.querySelector('.modal-content h2').textContent = 'Editar Memória';
        } catch (error) {
            console.error('Erro ao carregar memória para edição:', error);
            alert('Erro ao carregar memória para edição');
        }
    }

    async abrirMemoria(id) {
        try {
            const { data: memory, error } = await getMemoryById(id);
            if (error) throw error;

            const date = new Date(memory.date + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            let tracksHtml = '';
            if (memory.memory_tracks && memory.memory_tracks.length > 0) {
                tracksHtml = `
                    <div class="memory-tracks">
                        <h3>Músicas</h3>
                        ${memory.memory_tracks.map(track => `
                            <div class="memory-track">
                                <div class="track-info">
                                    <div class="track-name">${track.track_name}</div>
                                    <div class="track-artist">${track.artist_name}</div>
                                </div>
                                <div class="track-controls">
                                    ${track.preview_url ? `
                                        <button class="play-button" data-preview="${track.preview_url}">
                                            ▶
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            this.elements.memoriaDetalhes.innerHTML = `
                <h2>${memory.title}</h2>
                <div class="data">${formattedDate}</div>
                <p class="memoria-description">${memory.description}</p>
                <div class="galeria-imagens">
                    ${memory.image_url ? `
                        <div class="imagem-container">
                            <img src="${memory.image_url}" alt="${memory.title}" class="imagem-principal">
                        </div>
                    ` : ''}
                    ${memory.memory_images?.map(img => `
                        <div class="imagem-container">
                            <img src="${img.url}" alt="${img.description || ''}" class="imagem-galeria">
                            ${img.description ? `<p class="imagem-descricao">${img.description}</p>` : ''}
                        </div>
                    `).join('') || ''}
                </div>
                ${tracksHtml}
            `;

            this.setupAudioPlayers();
            this.elements.memoriaModal.style.display = 'block';
        } catch (error) {
            console.error('Erro ao abrir memória:', error);
        }
    }

    setupAudioPlayers() {
        const playButtons = document.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const previewUrl = button.dataset.preview;
                this.playPreview(previewUrl, button);
            });
        });
    }

    playPreview(previewUrl, button) {
        if (this.currentAudio) {
            this.currentAudio.pause();
            document.querySelectorAll('.play-button').forEach(btn => btn.textContent = '▶');
        }

        if (this.currentAudio && this.currentAudio.src === previewUrl) {
            this.currentAudio = null;
            return;
        }

        this.currentAudio = new Audio(previewUrl);
        this.currentAudio.play();
        button.textContent = '⏸';

        this.currentAudio.onended = () => {
            button.textContent = '▶';
            this.currentAudio = null;
        };
    }

    async fazerLogin() {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const { error } = await signIn(email, password);
            if (error) throw error;
            
            this.elements.loginModal.style.display = 'none';
            await this.checkAuthState();
            await this.loadMemories();
        } catch (error) {
            errorMessage.textContent = 'Erro ao fazer login. Verifique suas credenciais.';
        }
    }

    async salvarMemoria(event) {
        event.preventDefault();
        
        const formData = {
            id: document.getElementById('memoriaId').value,
            title: document.getElementById('tituloMemoria').value,
            description: document.getElementById('descricaoMemoria').value,
            date: document.getElementById('dataMemoria').value,
            imageFile: document.getElementById('imagemMemoria').files[0],
            additionalImages: document.getElementById('imagensAdicionais').files
        };

        try {
            let image_url = '';
            if (formData.imageFile) {
                const { data: imageUrl, error: uploadError } = await uploadImage(formData.imageFile);
                if (uploadError) throw uploadError;
                image_url = imageUrl;
            }

            const date = new Date(formData.date);
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            
            const memoryData = {
                title: formData.title,
                description: formData.description,
                date: utcDate.toISOString().split('T')[0]
            };

            if (image_url) {
                memoryData.image_url = image_url;
            }

            let data;
            if (formData.id) {
                const { data: updateData, error } = await updateMemory(formData.id, memoryData);
                if (error) throw error;
                data = updateData;
            } else {
                const { data: createData, error } = await createMemory(memoryData);
                if (error) throw error;
                data = createData;
            }

            if (formData.additionalImages.length > 0) {
                const additionalImagesData = [];
                for (const file of formData.additionalImages) {
                    const { data: imageUrl } = await uploadImage(file);
                    if (imageUrl) {
                        additionalImagesData.push({
                            url: imageUrl,
                            description: ''
                        });
                    }
                }

                if (additionalImagesData.length > 0) {
                    await addMemoryImages(data[0].id, additionalImagesData);
                }
            }

            this.fecharModal();
            await this.loadMemories();
            event.target.reset();
            document.getElementById('memoriaId').value = '';
        } catch (error) {
            console.error('Erro ao salvar memória:', error);
            alert('Erro ao salvar memória. Por favor, tente novamente.');
        }
    }

    async excluirMemoria(id) {
        if (!confirm('Tem certeza que deseja excluir esta memória?')) return;

        try {
            const { error } = await deleteMemory(id);
            if (error) throw error;
            await this.loadMemories();
        } catch (error) {
            console.error('Erro ao excluir memória:', error);
            alert('Erro ao excluir memória. Por favor, tente novamente.');
        }
    }

    async searchTracks(query) {
        try {
            const response = await searchTracks(query);
            const tracks = response.tracks.items;
            
            this.elements.trackResults.innerHTML = tracks.map(track => `
                <div class="track-item" data-track='${JSON.stringify(track)}'>
                    <div class="track-info">
                        <div class="track-name">${track.name}</div>
                        <div class="track-artist">${track.artists[0].name}</div>
                    </div>
                    ${track.preview_url ? `
                        <button class="play-button" data-preview="${track.preview_url}">▶</button>
                    ` : ''}
                </div>
            `).join('');

            this.setupTrackSelection();
            this.setupAudioPlayers();
        } catch (error) {
            console.error('Erro ao buscar músicas:', error);
            this.elements.trackResults.innerHTML = '<p>Erro ao buscar músicas</p>';
        }
    }

    setupTrackSelection() {
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(item => {
            item.addEventListener('click', async () => {
                const track = JSON.parse(item.dataset.track);
                const memoryId = document.getElementById('memoriaId').value;
                
                try {
                    const { error } = await addMemoryTrack(memoryId, track);
                    if (error) throw error;
                    
                    const tracksList = document.getElementById('currentTracks');
                    const trackElement = document.createElement('div');
                    trackElement.className = 'memory-track';
                    trackElement.innerHTML = `
                        <div class="track-info">
                            <div class="track-name">${track.name}</div>
                            <div class="track-artist">${track.artists[0].name}</div>
                        </div>
                        <button class="delete-btn">Remover</button>
                    `;
                    
                    tracksList.appendChild(trackElement);
                } catch (error) {
                    console.error('Erro ao adicionar música:', error);
                    alert('Erro ao adicionar música');
                }
            });
        });
    }

    async removerTrack(trackId) {
        try {
            const { error } = await deleteMemoryTrack(trackId);
            if (error) throw error;
            
            const trackElement = document.querySelector(`[data-id="${trackId}"]`).parentElement;
            trackElement.remove();
        } catch (error) {
            console.error('Erro ao remover música:', error);
            alert('Erro ao remover música');
        }
    }

    startTimer() {
        const updateTimer = () => {
            const now = new Date();
            const diff = now - START_DATE;
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            this.elements.timerElement.textContent = 
                `${days} dias, ${hours} horas, ${minutes} minutos e ${seconds} segundos`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    setupEventListeners() {
        this.elements.adminLoginButton?.addEventListener('click', () => {
            this.elements.loginModal.style.display = 'block';
        });

        this.elements.sairButton?.addEventListener('click', async () => {
            const { error } = await signOut();
            if (!error) {
                await this.checkAuthState();
                window.location.reload();
            }
        });

        this.elements.addMemoriaBtn?.addEventListener('click', () => {
            document.getElementById('memoriaId').value = '';
            document.getElementById('memoriaForm').reset();
            document.querySelector('.modal-content h2').textContent = 'Adicionar Memória';
            document.getElementById('currentTracks').innerHTML = '';
            this.elements.addMemoriaModal.style.display = 'block';
        });

        this.elements.trackSearchInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 3) {
                this.searchTracks(query);
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.addMemoriaModal || 
                e.target === this.elements.loginModal ||
                e.target === this.elements.memoriaModal) {
                this.fecharModal();
            }
        });

        document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.fazerLogin();
        });

        this.elements.closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.fecharModal());
        });

        this.elements.loginForm?.querySelector('button')?.addEventListener('click', () => this.fazerLogin());
        
        this.elements.memoriaForm?.addEventListener('submit', (e) => this.salvarMemoria(e));
    }

    fecharModal() {
        if (this.elements.addMemoriaModal) this.elements.addMemoriaModal.style.display = 'none';
        if (this.elements.loginModal) this.elements.loginModal.style.display = 'none';
        if (this.elements.memoriaModal) this.elements.memoriaModal.style.display = 'none';
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MemoriasApp();
});