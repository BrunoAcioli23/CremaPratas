// O CÓDIGO JAVASCRIPT PERMANECE O MESMO, MAS COM PEQUENOS AJUSTES
        // PARA MANIPULAR AS NOVAS CLASSES CSS.
        document.addEventListener('DOMContentLoaded', () => {
            const products = [
                { id: 1, name: 'Corrente 0.7mm Veneziana 70cm', price: 139.90, oldPrice: 159.99, rating: 4.8, reviews: 297, image: 'image/Prata1.jpeg' },
                { id: 2, name: 'Corrente 2mm 1x1 60cm', price: 209.90, oldPrice: 219.99, rating: 4.9, reviews: 272, image: 'image/Prata2.jpeg' },
                { id: 3, name: 'Pulseira 2.5mm Cordão Baiano', price: 179.90, oldPrice: 219.00, rating: 5.0, reviews: 303, image: 'image/Prata3.jpeg' },
                { id: 4, name: 'Brinco Brilhante 5mm', price: 49.90, oldPrice: 99.98, rating: 4.7, reviews: 79, image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Joia+4' },
                { id: 5, name: 'Anel Solitário Ouro', price: 349.90, oldPrice: 400.00, rating: 4.9, reviews: 150, image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Joia+5' },
                { id: 6, name: 'Pingente Cruz Detalhada', price: 89.90, oldPrice: 110.00, rating: 4.8, reviews: 95, image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Joia+6' },
                { id: 7, name: 'Tornozeleira Ponto de Luz', price: 75.50, oldPrice: 90.00, rating: 4.7, reviews: 120, image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Joia+7' },
                { id: 8, name: 'Argola Cravejada Média', price: 129.90, oldPrice: 150.00, rating: 4.9, reviews: 210, image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Joia+8' }
            ];
            const whatsappNumber = '5511942138664'; 
            let cart = [];
            let favorites = [];

            const productList = document.getElementById('product-list');
            const cartBtn = document.getElementById('cart-btn');
            const favoritesBtn = document.getElementById('favorites-btn');
            const cartModal = document.getElementById('cart-modal');
            const favoritesModal = document.getElementById('favorites-modal');
            const closeModalBtn = document.getElementById('close-modal-btn');
            const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');

            function renderProducts() {
                productList.innerHTML = '';
                products.forEach(product => {
                    const isFavorite = favorites.some(fav => fav.id === product.id);
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    productCard.innerHTML = `
                        <div class="product-image-wrapper">
                            <img src="${product.image}" alt="${product.name}" class="product-image">
                            <button class="icon-btn favorite-btn ${isFavorite ? 'active' : ''}" data-product-id="${product.id}">
                                <i class="fa-${isFavorite ? 'solid' : 'regular'} fa-heart"></i>
                            </button>
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="product-rating">
                                <div class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</div>
                                <span class="reviews">${product.reviews} avaliações</span>
                            </div>
                            <div class="product-pricing">
                                <span class="old-price">R$ ${product.oldPrice.toFixed(2).replace('.', ',')}</span>
                                <span class="current-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <button class="add-to-cart-btn">Adicionar ao Carrinho</button>
                        </div>
                    `;
                    productCard.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
                    productCard.querySelector('.favorite-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleFavorite(product);
                    });
                    productList.appendChild(productCard);
                });
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
                    btn.addEventListener('click', (e) => removeFromCart(parseInt(e.currentTarget.dataset.productId)));
                });
                document.querySelectorAll('.quantity-change').forEach(btn => {
                    btn.addEventListener('click', (e) => updateQuantity(parseInt(e.currentTarget.dataset.productId), parseInt(e.currentTarget.dataset.change)));
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
                        const product = products.find(p => p.id === parseInt(e.currentTarget.dataset.productId));
                        toggleFavorite(product);
                    });
                });
                
                document.querySelectorAll('.add-fav-to-cart-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const product = products.find(p => p.id === parseInt(e.currentTarget.dataset.productId));
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
                renderProducts();
                renderFavorites();
            }

            function toggleModal(modal, show) {
                modal.classList.toggle('visible', show);
            }

            cartBtn.addEventListener('click', () => { renderCart(); toggleModal(cartModal, true); });
            favoritesBtn.addEventListener('click', () => { renderFavorites(); toggleModal(favoritesModal, true); });
            closeModalBtn.addEventListener('click', () => toggleModal(cartModal, false));
            closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
            cartModal.addEventListener('click', (e) => { if (e.target === cartModal) toggleModal(cartModal, false); });
            favoritesModal.addEventListener('click', (e) => { if (e.target === favoritesModal) toggleModal(favoritesModal, false); });
            
            document.getElementById('checkout-btn').addEventListener('click', () => {
                if (cart.length === 0) {
                    // Exibe uma mensagem no console se o carrinho estiver vazio.
                    console.log('Carrinho vazio!');
                    return;
                }
                
                // Monta a mensagem do pedido
                let message = 'Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n';
                let total = 0;
            
                cart.forEach(item => {
                    message += `*${item.name}* (${item.quantity}x) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
                    total += item.price * item.quantity;
                });
            
                message += `\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;
            
                // Codifica a mensagem para ser usada na URL
                const encodedMessage = encodeURIComponent(message);
            
                // --- LINHA CORRIGIDA ---
                // Usa a URL da API do WhatsApp para garantir a abertura no WhatsApp Web
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
            
                // Abre o link em uma nova aba
                window.open(whatsappUrl, '_blank');
            });

            renderProducts();
        });