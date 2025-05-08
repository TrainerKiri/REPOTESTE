import { signIn, signOut, isAdmin, createMemory, getMemories, deleteMemory, uploadImage, getMemoryById, addMemoryImages, updateMemory, getCurrentUser } from './supabase.js';

const START_DATE = new Date("2025-01-06");

class YouTubePlayer {
    constructor() {
        this.player = null;
        this.currentVideoId = null;
        this.isPlaying = false;
        this.currentMemoryTitle = '';
        this.miniPlayer = this.createMiniPlayer();
    }

    createMiniPlayer() {
        const miniPlayer = document.createElement('div');
        miniPlayer.className = 'mini-player';
        miniPlayer.innerHTML = `
            <div class="mini-player-header">
                <h4 class="mini-player-title"></h4>
                <div class="mini-player-controls">
                    <button class="mini-player-button mini-player-toggle">▶</button>
                    <button class="mini-player-button mini-player-close">×</button>
                </div>
            </div>
        `;
        document.body.appendChild(miniPlayer);

        const toggleButton = miniPlayer.querySelector('.mini-player-toggle');
        const closeButton = miniPlayer.querySelector('.mini-player-close');

        toggleButton.addEventListener('click', () => this.togglePlayPause());
        closeButton.addEventListener('click', () => this.destroy());

        return miniPlayer;
    }

    initPlayer(videoId, memoryTitle, onReady) {
        this.currentMemoryTitle = memoryTitle;
        if (window.YT && window.YT.Player) {
            this.createPlayer(videoId, onReady);
        } else {
            setTimeout(() => this.initPlayer(videoId, memoryTitle, onReady), 100);
        }
    }

    createPlayer(videoId, onReady) {
        if (this.player && this.currentVideoId === videoId) {
            return;
        }

        if (this.player) {
            this.player.destroy();
        }

        this.currentVideoId = videoId;
        this.player = new YT.Player('ytPlayer', {
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                showinfo: 0
            },
            events: {
                onReady: onReady,
                onStateChange: (event) => {
                    this.isPlaying = event.data === YT.PlayerState.PLAYING;
                    this.updatePlayButton();
                    this.updateMiniPlayer();
                }
            }
        });
    }

    updatePlayButton() {
        const playButton = document.querySelector('.play-music');
        if (playButton) {
            const icon = playButton.querySelector('.play-icon');
            const text = playButton.querySelector('span:last-child');
            
            icon.textContent = this.isPlaying ? '⏸' : '▶';
            text.textContent = this.isPlaying ? ' Pausar Música' : ' Tocar Música';
        }
    }

    updateMiniPlayer() {
        const titleElement = this.miniPlayer.querySelector('.mini-player-title');
        const toggleButton = this.miniPlayer.querySelector('.mini-player-toggle');
        
        titleElement.textContent = this.currentMemoryTitle;
        toggleButton.textContent = this.isPlaying ? '⏸' : '▶';
        
        if (this.player && this.currentVideoId) {
            this.miniPlayer.classList.add('active');
        } else {
            this.miniPlayer.classList.remove('active');
        }
    }

    togglePlayPause() {
        if (this.player) {
            if (this.isPlaying) {
                this.player.pauseVideo();
            } else {
                this.player.playVideo();
            }
        }
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
            this.player = null;
            this.currentVideoId = null;
            this.isPlaying = false;
            this.miniPlayer.classList.remove('active');
        }
    }
}

class MemoriasApp {
    constructor() {
        this.initializeElements();
        this.youtubePlayer = new YouTubePlayer();
        this.loadWelcomeMessage();
        this.init();
        this.initYouTubeAPI();
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
            youtubePlayer: document.getElementById("youtubePlayer"),
            welcomeModal: document.getElementById("welcomeModal"),
            welcomeEditModal: document.getElementById("welcomeEditModal")
        };
    }

    async loadWelcomeMessage() {
        const welcomeMessage = localStorage.getItem('welcomeMessage') || `Bem-vindo à nossa Biblioteca de Memórias

Aqui guardamos nossas memórias mais preciosas, cada uma delas uma página única em nossa história de amor.

Sinta-se à vontade para explorar cada momento especial que compartilhamos.

Role para baixo para continuar lendo...

Com amor,
O Senhor Aluado`;

        const isAdminResult = await isAdmin();
        
        this.elements.welcomeModal.innerHTML = `
            <div class="welcome-content">
                <h2 class="welcome-title">Biblioteca de Memórias</h2>
                <div class="welcome-message">${welcomeMessage}</div>
                ${isAdminResult ? `
                    <button class="welcome-edit">
                        ✎ Editar Mensagem
                    </button>
                ` : ''}
                <button class="welcome-close">Fechar Pergaminho</button>
            </div>
        `;

        if (isAdminResult) {
            this.elements.welcomeModal.innerHTML += `
                <div id="welcomeEditModal" class="welcome-edit-modal">
                    <div class="welcome-edit-content">
                        <h3>Editar Mensagem de Boas-vindas</h3>
                        <form id="welcomeEditForm">
                            <textarea id="welcomeMessageEdit">${welcomeMessage}</textarea>
                            <button type="submit">Salvar</button>
                            <button type="button" class="close-btn">Cancelar</button>
                        </form>
                    </div>
                </div>
            `;

            const editBtn = this.elements.welcomeModal.querySelector('.welcome-edit');
            const editModal = document.getElementById('welcomeEditModal');
            const editForm = document.getElementById('welcomeEditForm');
            
            editBtn.addEventListener('click', () => {
                editModal.style.display = 'block';
            });

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newMessage = document.getElementById('welcomeMessageEdit').value;
                localStorage.setItem('welcomeMessage', newMessage);
                this.loadWelcomeMessage();
                editModal.style.display = 'none';
            });

            editModal.querySelector('.close-btn').addEventListener('click', () => {
                editModal.style.display = 'none';
            });
        }

        const closeButton = this.elements.welcomeModal.querySelector('.welcome-close');
        closeButton.addEventListener('click', () => {
            this.elements.welcomeModal.style.display = 'none';
        });

        this.elements.welcomeModal.style.display = 'block';
    }

    async init() {
        await this.checkAuthState();
        await this.loadMemories();
        this.setupEventListeners();
        this.startTimer();
    }

    initYouTubeAPI() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube API Ready');
        };
    }

    getYouTubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
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

            if (!memories || memories.length === 0) {
                this.elements.memoriasLista.innerHTML = '<p class="no-memories">Nenhuma memória encontrada.</p>';
                return;
            }

            memories.sort((a, b) => new Date(a.date) - new Date(b.date));

            memories.forEach(memory => {
                const memoriaElement = this.createMemoryElement(memory, admin);
                this.elements.memoriasLista.appendChild(memoriaElement);
            });
        } catch (error) {
            console.error('Erro ao carregar memórias:', error);
            this.elements.memoriasLista.innerHTML = '<p class="error">Erro ao carregar memórias. Por favor, tente novamente.</p>';
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
            ${memory.youtube_url ? `
                <div class="youtube-indicator">
                    <span>🎵</span>
                    <span>Música disponível</span>
                </div>
            ` : ''}
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
            document.getElementById('youtubeUrl').value = memory.youtube_url || '';

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
                    ${memory.memory_images ? memory.memory_images.map(img => `
                        <div class="imagem-container">
                            <img src="${img.url}" alt="${img.description || ''}" class="imagem-galeria">
                            ${img.description ? `<p class="imagem-descricao">${img.description}</p>` : ''}
                        </div>
                    `).join('') : ''}
                </div>
                ${memory.youtube_url ? `
                    <div class="music-section">
                        <h3>Música da Memória</h3>
                        <div class="music-controls">
                            <button class="play-music" data-video-id="${this.getYouTubeVideoId(memory.youtube_url)}">
                                <span class="play-icon">▶</span>
                                <span>Tocar Música</span>
                            </button>
                        </div>
                        <div class="music-info">
                            Clique no botão acima para tocar/pausar a música desta memória
                        </div>
                    </div>
                ` : ''}
            `;

            if (memory.youtube_url) {
                const videoId = this.getYouTubeVideoId(memory.youtube_url);
                if (videoId) {
                    this.elements.youtubePlayer.innerHTML = '<div id="ytPlayer"></div>';
                    
                    this.youtubePlayer.initPlayer(videoId, memory.title, () => {
                        const playButton = this.elements.memoriaDetalhes.querySelector('.play-music');
                        if (playButton) {
                            playButton.addEventListener('click', () => {
                                this.youtubePlayer.togglePlayPause();
                            });
                        }
                    });
                }
            }

            this.elements.memoriaModal.style.display = 'block';
        } catch (error) {
            console.error('Erro ao abrir memória:', error);
            alert('Erro ao abrir memória');
        }
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
            youtube_url: document.getElementById('youtubeUrl').value
        };

        try {
            let image_url = '';
            if (formData.imageFile) {
                const { data: imageUrl, error: uploadError } = await uploadImage(formData.imageFile);
                if (uploadError) throw uploadError;
                image_url = imageUrl;
            }

            const memoryData = {
                title: formData.title,
                description: formData.description,
                date: formData.date,
                youtube_url: formData.youtube_url
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
        if (this.elements.memoriaModal) {
            this.elements.memoriaModal.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MemoriasApp();
});