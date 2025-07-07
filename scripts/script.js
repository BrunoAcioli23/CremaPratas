// Importar todas as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.appspot.com",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
    measurementId: "G-V31HKENBBY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variáveis globais
let cart = [];
let favorites = [];
let allProducts = [];
let allLaunches = [];
let allSelected = [];

// Elementos do DOM
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

// --- FUNÇÕES PRINCIPAIS ---

// Função genérica e otimizada para buscar dados no Firestore
async function fetchData(collectionName, options = {}) {
    try {
        const { sortBy, sortDirection = 'desc', limitNumber, filterField, filterValue } = options;
        let q = collection(db, collectionName);
        
        if (filterField && filterValue!== undefined) {
            q = query(q, where(filterField, "==", filterValue));
        }
        if (sortBy) {
            q = query(q, orderBy(sortBy, sortDirection));
        }
        if (limitNumber) {
            q = query(q, limit(limitNumber));
        }

        const dataSnapshot = await getDocs(q);
        return dataSnapshot.docs.map(doc => ({ id: doc.id,...doc.data() }));
    } catch (error) {
        console.error(`Erro ao buscar dados da coleção ${collectionName}: `, error);
        if (error.code === 'failed-precondition') {
            console.error("ERRO IMPORTANTE: Esta consulta requer um índice no Firestore. O Firebase geralmente fornece um link no erro para criá-lo com um clique. Verifique o console do navegador.");
        }
        return;
    }
}

// Função para criar o HTML de um card de produto (agora com tags de promoção)
function createProductCardHTML(product) {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    let tagsHTML = '';
    if (product.stock === 0) {
        tagsHTML += `<span class="tag" style="background-color:#f44336;color:white;">ESGOTADO</span>`;
    }
    if (product.discountPercentage) {
        tagsHTML += `<span class="tag">${product.discountPercentage}% OFF</span>`;
    }
    if (product.hasFreeShipping) {
        tagsHTML += `<span class="tag">FRETE GRÁTIS</span>`;
    }

    return `
        <div class="product-card">
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='https://placehold.co/400x400/1a1a1a/ffffff?text=Imagem+Inválida';">
                <div class="promo-tags">${tagsHTML}</div>
                <button class="favorite-btn" data-product-id="${product.id}"><i class="fa-${isFavorite? 'solid' : 'regular'} fa-heart"></i></button>
            </div>
            <div class="product-info">
<h3>${product.name || 'Nome indisponível'}</h3>
                <div class="product-pricing">
                    <span class="old-price">R$ ${(product.oldPrice || 0).toFixed(2).replace('.', ',')}</span>
                    <span class="current-price">R$ ${(product.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                ${product.stock > 0 
                ? `<button class="add-to-cart-btn">COMPRAR</button>` 
                : `<button class="add-to-cart-btn" disabled style="background-color:#555; cursor:not-allowed; opacity:0.6;">ESGOTADO</button>`}
            </div>
        </div>`;
}

// Função para renderizar produtos em um carrossel (Swiper)
function renderCarousel(containerId, productsData, swiperConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item encontrado.</p>`;
        return;
    }

    productsData.forEach(product => {
        const swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = createProductCardHTML(product);
        
        swiperSlide.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
        swiperSlide.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(product));
        container.appendChild(swiperSlide);
    });
    
    new Swiper(swiperConfig.container, swiperConfig.options);
}

// Nova função para renderizar produtos em uma grade (Grid)
function renderGrid(containerId, productsData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item selecionado encontrado.</p>`;
        return;
    }

    productsData.forEach(product => {
        const gridItem = document.createElement('div');
        gridItem.innerHTML = createProductCardHTML(product);

        gridItem.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(product));
        gridItem.querySelector('.favorite-btn').addEventListener('click', () => toggleFavorite(product));
        container.appendChild(gridItem);
    });
}


// --- FUNÇÕES AUXILIARES (Carrinho, Favoritos, etc.) ---

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    cartItemsContainer.innerHTML = cart.length === 0? '<p>Seu carrinho está vazio.</p>' : '';
    if (cart.length > 0) {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `<div class="item-details"><img src="${item.image}" alt="${item.name}"><div class="item-info"><h4>${item.name}</h4><p>R$ ${item.price.toFixed(2).replace('.', ',')}</p></div></div><div class="item-actions"><div class="quantity-control"><button class="quantity-change" data-product-id="${item.id}" data-change="-1">-</button><span>${item.quantity}</span><button class="quantity-change" data-product-id="${item.id}" data-change="1">+</button></div><button class="remove-btn remove-from-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button></div>`;
            cartItemsContainer.appendChild(cartItem);
        });
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.classList.toggle('hidden', totalItems === 0);
    document.querySelectorAll('.remove-from-cart-btn').forEach(btn => btn.addEventListener('click', (e) => removeFromCart(e.currentTarget.dataset.productId)));
    document.querySelectorAll('.quantity-change').forEach(btn => btn.addEventListener('click', (e) => updateQuantity(e.currentTarget.dataset.productId, parseInt(e.currentTarget.dataset.change))));
}

function renderFavorites() {
    const favoriteItemsContainer = document.getElementById('favorite-items');
    const favoritesCount = document.getElementById('favorites-count');
    favoriteItemsContainer.innerHTML = favorites.length === 0? '<p>Você ainda não favoritou nenhum item.</p>' : '';
    if (favorites.length > 0) {
        favorites.forEach(item => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `<div class="item-details"><img src="${item.image}" alt="${item.name}"><div class="item-info"><h4>${item.name}</h4><p>R$ ${item.price.toFixed(2).replace('.', ',')}</p></div></div><div class="item-actions"><button class="add-fav-to-cart-btn" data-product-id="${item.id}"><i class="fa-solid fa-cart-plus"></i></button><button class="remove-btn remove-from-favorites-btn" data-product-id="${item.id}"><i class="fa-solid fa-trash"></i></button></div>`;
            favoriteItemsContainer.appendChild(favoriteItem);
        });
    }
    favoritesCount.textContent = favorites.length;
    favoritesCount.classList.toggle('hidden', favorites.length === 0);
    document.querySelectorAll('.remove-from-favorites-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const product = favorites.find(p => p.id === e.currentTarget.dataset.productId);
        toggleFavorite(product);
    }));
    document.querySelectorAll('.add-fav-to-cart-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const product = favorites.find(p => p.id === e.currentTarget.dataset.productId);
        addToCart(product);
        toggleModal(favoritesModal, false);
        toggleModal(cartModal, true);
    }));
}

function addToCart(product) { const existingItem = cart.find(item => item.id === product.id); if (existingItem) { existingItem.quantity++; } else { cart.push({...product, quantity: 1 }); } renderCart(); }
function removeFromCart(productId) { cart = cart.filter(item => item.id!== productId); renderCart(); }
function updateQuantity(productId, change) { const item = cart.find(item => item.id === productId); if (item) { item.quantity += change; if (item.quantity <= 0) { removeFromCart(productId); } else { renderCart(); } } }
function toggleFavorite(product) { const existingIndex = favorites.findIndex(item => item.id === product.id); if (existingIndex > -1) { favorites.splice(existingIndex, 1); } else { favorites.push(product); } renderProducts(allProducts); renderReleases(allReleases); renderGrid('selected-products-grid', allSelected); renderFavorites(); }
function toggleModal(modal, show) { modal.classList.toggle('visible', show); }

// --- EVENT LISTENERS ---
cartBtn.addEventListener('click', () => { renderCart(); toggleModal(cartModal, true); });
favoritesBtn.addEventListener('click', () => { renderFavorites(); toggleModal(favoritesModal, true); });
closeModalBtn.addEventListener('click', () => toggleModal(cartModal, false));
closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
cartModal.addEventListener('click', (e) => { if (e.target === cartModal) toggleModal(cartModal, false); });
favoritesModal.addEventListener('click', (e) => { if (e.target === favoritesModal) toggleModal(favoritesModal, false); });

document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        console.log('Carrinho vazio!');
        return;
    }

    let message = 'Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n';
    let total = 0;

    const orderItems = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        message += `*${item.name}* (${item.quantity}x) - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
        return {
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        };
    });

    message += `\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;

    // 📥 Salvar pedido no Firestore
    try {
        await addDoc(collection(db, 'orders'), {
            items: orderItems,
            total,
            status: 'pendente',
            createdAt: serverTimestamp()
        });
        console.log('Pedido salvo no Firestore');
    } catch (error) {
        console.error('Erro ao salvar pedido:', error);
    }

    // Enviar para o WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Limpar o carrinho local
    cart = [];
    renderCart();
});


// --- INICIALIZAÇÃO DO SITE ---
async function init() {
    // Configurações dos carrosséis
    const productSwiperConfig = { container: '.product-swiper', options: { slidesPerView: 1, spaceBetween: 10, navigation: { nextEl: ".product-swiper.swiper-button-next", prevEl: ".product-swiper.swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };
    const releasesSwiperConfig = { container: '.releases-swiper', options: { slidesPerView: 1, spaceBetween: 10, navigation: { nextEl: ".releases-swiper.swiper-button-next", prevEl: ".releases-swiper.swiper-button-prev" }, breakpoints: { 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };

    // Busca todos os dados em paralelo para otimizar o carregamento
    const [productsData, selectedData, launchesData] = await Promise.all([
    fetchData('products', { sortBy: 'createdAt', sortDirection: 'desc' }),
    fetchData('selected'),
    fetchData('products', { sortBy: 'createdAt', sortDirection: 'desc', limitNumber: 10 })
    ]);


    allProducts = productsData;
    allLaunches = launchesData;
    allSelected = selectedData;

    // Renderiza cada seção com seus respectivos dados
    renderCarousel('product-list', allProducts, productSwiperConfig);
    renderCarousel('releases-list', allLaunches, releasesSwiperConfig);
    renderGrid('selected-products-grid', allSelected);
}

// Inicia o site
document.addEventListener('DOMContentLoaded', init);

const hamburgerBtn = document.getElementById('hamburger-btn');
        const mainNav = document.getElementById('main-nav');
        const categoriesBtn = document.querySelector('.categories-btn');
        const submenu = document.getElementById('submenu');

        hamburgerBtn.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });

        categoriesBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Impede que o link navegue
            e.stopPropagation(); // Impede que o clique feche o menu imediatamente
            submenu.classList.toggle('active');
        });

        // Fecha o submenu se clicar fora dele
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.submenu-container')) {
                submenu.classList.remove('active');
            }
        });

        // Lógica de envio do formulário de cadastro de produtos
        const productForm = document.getElementById('product-form');
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(productForm);
            const productData = {
                name: formData.get('name'),
                price: parseFloat(formData.get('price')),
                oldPrice: parseFloat(formData.get('oldPrice')),
                image: formData.get('image'),
                terms: formData.getAll('terms'),
                timestamp: serverTimestamp()
            };

            try {
                await addDoc(collection(db, 'products'), productData);
                showMessage('Produto cadastrado com sucesso!', 'success');
                productForm.reset();
            } catch (error) {
                showMessage('Erro ao cadastrar produto: ' + error.message, 'error');
            }
        });