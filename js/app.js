import { signIn, signOut, isAdmin, createMemory, getMemories, deleteMemory, uploadImage, getMemoryById, addMemoryImages, updateMemory, addMemoryVideo, deleteMemoryVideo } from './supabase.js';
import { extractYouTubeId, getVideoInfo } from './youtube.js';

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
            videoInput: document.getElementById("videoUrl")
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

            const videosList = document.getElementById('currentVideos');
            videosList.innerHTML = '';
            
            if (memory.memory_videos) {
                memory.memory_videos.forEach(video => {
                    const videoElement = document.createElement('div');
                    videoElement.className = 'memory-video';
                    videoElement.innerHTML = `
                        <div class="video-info">
                            <div class="video-title">${video.title}</div>
                            <div class="video-channel">${video.channel_title}</div>
                        </div>
                        <button class="delete-btn" data-id="${video.id}">Remover</button>
                    `;

                    const deleteBtn = videoElement.querySelector('.delete-btn');
                    deleteBtn.addEventListener('click', () => this.removerVideo(video.id));

                    videosList.appendChild(videoElement);
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

            let videosHtml = '';
            if (memory.memory_videos && memory.memory_videos.length > 0) {
                videosHtml = `
                    <div class="memory-videos">
                        <h3>Músicas</h3>
                        ${memory.memory_videos.map(video => `
                            <div class="memory-video">
                                <div class="video-info">
                                    <div class="video-title">${video.title}</div>
                                    <div class="video-channel">${video.channel_title}</div>
                                </div>
                                <div class="video-controls">
                                    <button class="play-button" data-video-id="${video.video_id}">
                                        ▶
                                    </button>
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
                ${videosHtml}
                <div id="youtubePlayer"></div>
            `;

            this.setupVideoPlayers();
            this.elements.memoriaModal.style.display = 'block';
        } catch (error) {
            console.error('Erro ao abrir memória:', error);
        }
    }

    setupVideoPlayers() {
        const playButtons = document.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = button.dataset.videoId;
                this.playVideo(videoId, button);
            });
        });
    }

    playVideo(videoId, button) {
        const playerContainer = document.getElementById('youtubePlayer');
        
        if (this.currentAudio) {
            playerContainer.innerHTML = '';
            document.querySelectorAll('.play-button').forEach(btn => btn.textContent = '▶');
            this.currentAudio = null;
            return;
        }

        playerContainer.innerHTML = `
            <iframe 
                id="ytplayer" 
                type="text/html" 
                width="1" 
                height="1"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1"
                style="visibility:hidden"
            ></iframe>
        `;

        this.currentAudio = true;
        button.textContent = '⏸';

        const iframe = playerContainer.querySelector('iframe');
        iframe.onended = () => {
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
            additionalImages: document.getElementById('imagensAdicionais').files,
            videoUrl: document.getElementById('videoUrl').value
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

            if (formData.videoUrl) {
                const videoId = extractYouTubeId(formData.videoUrl);
                if (videoId) {
                    const videoInfo = getVideoInfo(videoId);
                    await addMemoryVideo(data[0].id, videoInfo);
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

    async removerVideo(videoId) {
        try {
            const { error } = await deleteMemoryVideo(videoId);
            if (error) throw error;
            
            const videoElement = document.querySelector(`[data-id="${videoId}"]`).parentElement;
            videoElement.remove();
        } catch (error) {
            console.error('Erro ao remover vídeo:', error);
            alert('Erro ao remover vídeo');
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
            document.getElementById('currentVideos').innerHTML = '';
            this.elements.addMemoriaModal.style.display = 'block';
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
            const playerContainer = document.getElementById('youtubePlayer');
            playerContainer.innerHTML = '';
            this.currentAudio = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MemoriasApp();
});