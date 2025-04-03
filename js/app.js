import { signIn, signOut, isAdmin, createMemory, getMemories, deleteMemory, uploadImage, getMemoryById, addMemoryImages, updateMemory } from './supabase.js';

const START_DATE = new Date("2025-01-06");

class MemoriasApp {
    constructor() {
        this.initializeElements();
        this.init();
        this.youtubePlayer = null;
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
            youtubePlayer: document.getElementById("youtubePlayer")
        };
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
            ${memory.youtube_url ? '<div class="youtube-indicator">🎵 Música disponível</div>' : ''}
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
                    <div class="music-controls">
                        <button class="play-music" data-video-id="${this.getYouTubeVideoId(memory.youtube_url)}">
                            <span class="play-icon">▶</span> Tocar Música
                        </button>
                    </div>
                ` : ''}
            `;

            if (memory.youtube_url) {
                const videoId = this.getYouTubeVideoId(memory.youtube_url);
                if (videoId) {
                    this.elements.youtubePlayer.innerHTML = '<div id="ytPlayer"></div>';
                    if (this.youtubePlayer) {
                        this.youtubePlayer.destroy();
                    }

                    // Wait for YouTube API to be ready
                    const initPlayer = () => {
                        if (window.YT && window.YT.Player) {
                            this.youtubePlayer = new YT.Player('ytPlayer', {
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
                                    onReady: (event) => {
                                        const playButton = this.elements.memoriaDetalhes.querySelector('.play-music');
                                        if (playButton) {
                                            playButton.addEventListener('click', () => {
                                                const icon = playButton.querySelector('.play-icon');
                                                if (icon.textContent === '▶') {
                                                    event.target.playVideo();
                                                    icon.textContent = '⏸';
                                                    playButton.querySelector('span:last-child').textContent = ' Pausar Música';
                                                } else {
                                                    event.target.pauseVideo();
                                                    icon.textContent = '▶';
                                                    playButton.querySelector('span:last-child').textContent = ' Tocar Música';
                                                }
                                            });
                                        }
                                    }
                                }
                            });
                        } else {
                            setTimeout(initPlayer, 100);
                        }
                    };

                    initPlayer();
                }
            } else {
                this.elements.youtubePlayer.innerHTML = '';
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
            if (this.youtubePlayer) {
                this.youtubePlayer.destroy();
                this.youtubePlayer = null;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MemoriasApp();
});