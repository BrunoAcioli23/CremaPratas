// Import Firebase modules
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- PASSO 1: Cole aqui o seu objeto de configuração do Firebase ---
        const firebaseConfig = {
            apiKey: "COLE_SUA_API_KEY_AQUI",
            authDomain: "SEU_PROJETO.firebaseapp.com",
            projectId: "SEU_PROJECT_ID",
            storageBucket: "SEU_PROJETO.appspot.com",
            messagingSenderId: "SEU_SENDER_ID",
            appId: "SEU_APP_ID"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        // --- Restante do seu código JavaScript ---
        
        document.addEventListener('DOMContentLoaded', async () => {
            // Variáveis globais
            let allProducts = [];
            let cart = [];
            let favorites = [];

            // Elementos do DOM
            const productList = document.getElementById('product-list');
            const cartBtn = document.getElementById('cart-btn');
            const favoritesBtn = document.getElementById('favorites-btn');
            const cartModal = document.getElementById('cart-modal');
            const favoritesModal = document.getElementById('favorites-modal');
            const closeModalBtn = document.getElementById('close-modal-btn');
            const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
            const whatsappNumber = '5511942138664'; 

            // Inicialização do Swiper de Banners
            const bannerSwiper = new Swiper(".mySwiper", {
                pagination: { el: ".swiper-pagination", dynamicBullets: true },
                loop: true,
                autoplay: { delay: 3000, disableOnInteraction: false },
            });
            
            // Swiper de produtos (será inicializado depois)
            let productSwiper;

            // --- FUNÇÕES ---

            // Busca produtos no Firestore
            async function fetchProducts() {
                try {
                    const productsCol = collection(db, 'products'); // Nome da sua coleção
                    const productSnapshot = await getDocs(productsCol);
                    const productsData = productSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    return productsData;
                } catch (error) {
                    console.error("Erro ao buscar produtos: ", error);
                    productList.innerHTML = "<p>Não foi possível carregar os produtos. Tente novamente mais tarde.</p>";
                    return [];
                }
            }

            function renderProducts(products) {
                productList.innerHTML = '';
                if (!products || products.length === 0) {
                    productList.innerHTML = "<p>Nenhum produto encontrado.</p>";
                    return;
                }

                products.forEach(product => {
                    const isFavorite = favorites.some(fav => fav.id === product.id);
                    const swiperSlide = document.createElement('div');
                    swiperSlide.className = 'swiper-slide';

                    swiperSlide.innerHTML = `
                        <div class="product-card">
                            <div class="product-image-wrapper">
                                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='https://placehold.co/400x400/1a1a1a/ffffff?text=Imagem+Indisponível';">
                                <button class="icon-btn favorite-btn ${isFavorite ? 'active' : ''}" data-product-id="${product.id}">
                                    <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-heart"></i>
                                </button>
                            </div>
                            <div class="product-info">
                                <h3>${product.name || 'Nome indisponível'}</h3>
                                <div class="product-rating">
                                    <div class="stars">${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}</div>
                                    <span class="reviews">${product.reviews || 0} avaliações</span>
                                </div>
                                <div class="product-pricing">
                                    <span class="old-price">R$ ${(product.oldPrice || 0).toFixed(2).replace('.', ',')}</span>
                                    <span class="current-price">R$ ${(product.price || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                                <button class="add-to-cart-btn">Adicionar ao Carrinho</button>
                            </div>
                        </div>
                    `;
                    swiperSlide.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
                    swiperSlide.querySelector('.favorite-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFavorite(product);
                    });
                    productList.appendChild(swiperSlide);
                });
                
                // Inicializa ou atualiza o swiper de produtos
                if (productSwiper) {
                    productSwiper.update();
                } else {
                    productSwiper = new Swiper(".product-swiper", {
                        slidesPerView: 1,
                        spaceBetween: 10,
                        navigation: {
                            nextEl: ".swiper-button-next",
                            prevEl: ".swiper-button-prev",
                        },
                        breakpoints: {
                            640: { slidesPerView: 2, spaceBetween: 20 },
                            768: { slidesPerView: 3, spaceBetween: 30 },
                            1024: { slidesPerView: 4, spaceBetween: 30 },
                        },
                    });
                }
            }

            function renderCart() {
                const cartItemsContainer = document.getElementById('cart-items');
                const cartTotalEl = document.getElementById('cart-total');
                const cartCount = document.getElementById('cart-count');

                cartItemsContainer.innerHTML = '';
                if (cart.length === 0) {
                    cartItemsContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
                } else {
                    cart.forEach(item => {
                        const cartItem = document.createElement('div');
                        cartItem.className = 'cart-item';
                        cartItem.innerHTML = `
                            <div class="item-details">
                                <img src="${item.image}" alt="${item.name}">
                                <div class="item-info">
                                    <h4>${item.name}</h4>
                                    <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <div class="quantity-control">
                                    <button class="quantity-change" data-product-id="${item.id}" data-change="-1">-</button>
                                    <span>${item.quantity}</span>
                                    <button class="quantity-change" data-product-id="${item.id}" data-change="1">+</button>
                                </div>
                                <button class="remove-btn remove-from-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        `;
                        cartItemsContainer.appendChild(cartItem);
                    });
                }

                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                cartTotalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
                
                const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
                cartCount.textContent = totalItems;
                cartCount.classList.toggle('hidden', totalItems === 0);

                document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => removeFromCart(e.currentTarget.dataset.productId));
                });
                document.querySelectorAll('.quantity-change').forEach(btn => {
                    btn.addEventListener('click', (e) => updateQuantity(e.currentTarget.dataset.productId, parseInt(e.currentTarget.dataset.change)));
                });
            }
            
            function renderFavorites() {
                const favoriteItemsContainer = document.getElementById('favorite-items');
                const favoritesCount = document.getElementById('favorites-count');

                favoriteItemsContainer.innerHTML = '';
                if (favorites.length === 0) {
                    favoriteItemsContainer.innerHTML = '<p>Você ainda não favoritou nenhum item.</p>';
                } else {
                    favorites.forEach(item => {
                        const favoriteItem = document.createElement('div');
                        favoriteItem.className = 'favorite-item';
                        favoriteItem.innerHTML = `
                            <div class="item-details">
                                <img src="${item.image}" alt="${item.name}">
                                <div class="item-info">
                                    <h4>${item.name}</h4>
                                    <p>R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="add-fav-to-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-cart-plus"></i></button>
                                <button class="remove-btn remove-from-favorites-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        `;
                        favoriteItemsContainer.appendChild(favoriteItem);
                    });
                }
                
                favoritesCount.textContent = favorites.length;
                favoritesCount.classList.toggle('hidden', favorites.length === 0);

                document.querySelectorAll('.remove-from-favorites-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const product = allProducts.find(p => p.id === e.currentTarget.dataset.productId);
                        toggleFavorite(product);
                    });
                });
                
                document.querySelectorAll('.add-fav-to-cart-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const product = allProducts.find(p => p.id === e.currentTarget.dataset.productId);
                        addToCart(product);
                        toggleModal(favoritesModal, false);
                        toggleModal(cartModal, true);
                    });
                });
            }

            function addToCart(product) {
                const existingItem = cart.find(item => item.id === product.id);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    cart.push({ ...product, quantity: 1 });
                }
                renderCart();
            }

            function removeFromCart(productId) {
                cart = cart.filter(item => item.id !== productId);
                renderCart();
            }
            
            function updateQuantity(productId, change) {
                const item = cart.find(item => item.id === productId);
                if (item) {
                    item.quantity += change;
                    if (item.quantity <= 0) {
                        removeFromCart(productId);
                    } else {
                        renderCart();
                    }
                }
            }
            
            function toggleFavorite(product) {
                const existingIndex = favorites.findIndex(item => item.id === product.id);
                if (existingIndex > -1) {
                    favorites.splice(existingIndex, 1);
                } else {
                    favorites.push(product);
                }
                renderProducts(allProducts); // Re-renderiza com os dados atuais
                renderFavorites();
            }

            function toggleModal(modal, show) {
                modal.classList.toggle('visible', show);
            }

            // --- EVENT LISTENERS ---
            cartBtn.addEventListener('click', () => { renderCart(); toggleModal(cartModal, true); });
            favoritesBtn.addEventListener('click', () => { renderFavorites(); toggleModal(favoritesModal, true); });
            closeModalBtn.addEventListener('click', () => toggleModal(cartModal, false));
            closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
            cartModal.addEventListener('click', (e) => { if (e.target === cartModal) toggleModal(cartModal, false); });
            favoritesModal.addEventListener('click', (e) => { if (e.target === favoritesModal) toggleModal(favoritesModal, false); });
            
            document.getElementById('checkout-btn').addEventListener('click', () => {
                if (cart.length === 0) {
                    console.log('Carrinho vazio!');
                    return;
                }
                let message = 'Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n';
                let total = 0;
                cart.forEach(item => {
                    message += `*${item.name}* (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
                    total += item.price * item.quantity;
                });
                message += `\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;
                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
                window.open(whatsappUrl, '_blank');
            });

            // --- INICIALIZAÇÃO ---
            allProducts = await fetchProducts();
            renderProducts(allProducts);
        });