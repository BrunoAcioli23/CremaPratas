// Importar todas as funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.appspot.com",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentUser = null;

// Variáveis globais
let cart = [];
let favorites = [];
let allProducts = [];
let allLaunches = [];
let allSelected = [];

// --- FUNÇÕES GLOBAIS (disponíveis para outros scripts) ---
window.addToCart = (product) => {
  const existingItem = cart.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
  salvarDadosDoUsuario();
};

window.toggleFavorite = (product) => {
    const existingIndex = favorites.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
    } else {
        favorites.push(product);
    }
    initProductSections();
    renderFavorites();
    salvarDadosDoUsuario();
};

window.renderGrid = (containerId, productsData) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item encontrado.</p>`;
        return;
    }
    productsData.forEach((product) => {
        const gridItem = document.createElement('div');
        gridItem.innerHTML = createProductCardHTML(product);
        addCardEventListeners(gridItem, product);
        container.appendChild(gridItem);
    });
};

// --- FUNÇÕES INTERNAS DO SCRIPT ---
function createProductCardHTML(product) {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    let tagsHTML = '';
    if (product.stock === 0) {
        tagsHTML += `<span class="tag" style="background-color:#f44336;color:white;">ESGOTADO</span>`;
    }
    return `
        <a href="produto-detalhe.html?id=${product.id}" class="product-card-link">
            <div class="product-card">
                <div class="product-image-wrapper">
                    <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.onerror=null;this.src='https://placehold.co/400x400/1a1a1a/ffffff?text=Imagem+Inválida';">
                    <div class="promo-tags">${tagsHTML}</div>
                    <button class="favorite-btn" data-product-id="${product.id}"><i class="fa-${isFavorite ? 'solid' : 'regular'} fa-heart"></i></button>
                </div>
                <div class="product-info">
                    <h3>${product.name || 'Nome indisponível'}</h3>
                    <div class="product-pricing">
                        ${product.oldPrice > 0 ? `<span class="old-price">R$ ${product.oldPrice.toFixed(2).replace('.', ',')}</span>` : ''}
                        <span class="current-price">R$ ${(product.price || 0).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button class="add-to-cart-btn" data-product-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
                        ${product.stock > 0 ? 'COMPRAR' : 'ESGOTADO'}
                    </button>
                </div>
            </div>
        </a>`;
}

function addCardEventListeners(cardElement, product) {
    cardElement.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.addToCart(product);
    });
    cardElement.querySelector('.favorite-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.toggleFavorite(product);
    });
}

function renderCarousel(containerId, productsData, swiperConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p style="color: white; text-align: center; width: 100%;">Nenhum item encontrado.</p>`;
        return;
    }
    productsData.forEach((product) => {
        const swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = createProductCardHTML(product);
        addCardEventListeners(swiperSlide, product);
        container.appendChild(swiperSlide);
    });
    new Swiper(swiperConfig.container, swiperConfig.options);
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    cartItemsContainer.innerHTML = cart.length === 0? '<p>Seu carrinho está vazio.</p>' : '';
    if (cart.length > 0) {
        cartItemsContainer.innerHTML = '';
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
        favoriteItemsContainer.innerHTML = '';
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
        window.toggleFavorite(product);
    }));
    document.querySelectorAll('.add-fav-to-cart-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const product = favorites.find(p => p.id === e.currentTarget.dataset.productId);
        window.addToCart(product);
        toggleModal(document.getElementById('favorites-modal'), false);
        toggleModal(document.getElementById('cart-modal'), true);
    }));
}

async function carregarCarrinhoEFavoritos() {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    cart = userData.cart || [];
    favorites = userData.favorites || [];
    renderCart();
    renderFavorites();
  } catch (err) { console.error("Erro ao carregar dados do usuário:", err); }
}

async function salvarDadosDoUsuario() {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, { cart, favorites }, { merge: true });
  } catch (err) { console.error("Erro ao salvar dados do usuário:", err); }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  renderCart();
  salvarDadosDoUsuario();
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
    salvarDadosDoUsuario();
  }
}

function toggleModal(modalElement, show) {
  if (!modalElement) return;
  modalElement.classList.toggle('visible', show);
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    // Listeners dos Modais
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const favoritesBtn = document.getElementById('favorites-btn');
    const favoritesModal = document.getElementById('favorites-modal');
    const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');

    if (cartBtn) cartBtn.addEventListener('click', () => { renderCart(); toggleModal(cartModal, true); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => toggleModal(cartModal, false));
    if (cartModal) cartModal.addEventListener('click', (e) => { if (e.target === cartModal) toggleModal(cartModal, false); });
    
    if (favoritesBtn) favoritesBtn.addEventListener('click', () => { renderFavorites(); toggleModal(favoritesModal, true); });
    if (closeFavoritesModalBtn) closeFavoritesModalBtn.addEventListener('click', () => toggleModal(favoritesModal, false));
    if (favoritesModal) favoritesModal.addEventListener('click', (e) => { if (e.target === favoritesModal) toggleModal(favoritesModal, false); });

    // --- INTERAÇÕES DO HEADER ---
    const allCategoryBtns = document.querySelectorAll(".categories-btn");
    allCategoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const submenu = btn.nextElementSibling;
            if (submenu && submenu.classList.contains('submenu')) {
                submenu.classList.toggle('active');
            }
        });
    });

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.submenu-container')) {
            document.querySelectorAll('.submenu').forEach(submenu => {
                submenu.classList.remove('active');
            });
        }
    });

    // --- CÓDIGO PARA O MENU MOBILE ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeNavBtn = document.getElementById('close-mobile-nav');
    const subNav = document.querySelector('.sub-nav');
    const bodyOverlay = document.createElement('div');
    bodyOverlay.className = 'body-overlay';
    document.body.appendChild(bodyOverlay);

    const toggleMenu = (show) => {
        subNav.classList.toggle('active', show);
        bodyOverlay.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : '';

        // Oculta o botão hambúrguer quando o menu está aberto
        if (hamburgerBtn) {
            hamburgerBtn.style.display = show ? 'none' : 'flex';
        }
    };


    if (hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(true);
    });

    if (closeNavBtn) closeNavBtn.addEventListener('click', () => toggleMenu(false));
    if (bodyOverlay) bodyOverlay.addEventListener('click', () => toggleMenu(false));

    if (subNav) subNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && !e.target.classList.contains('categories-btn')) {
            toggleMenu(false);
        }
    });

    // --- INICIALIZAÇÃO DO SWIPER DE COLEÇÕES ---
    new Swiper(".collections-swiper", {
        loop: true,
        spaceBetween: 20,
        pagination: {
          el: ".collections-swiper .swiper-pagination",
          clickable: true,
        },
        navigation: {
          nextEl: ".collections-swiper .swiper-button-next",
          prevEl: ".collections-swiper .swiper-button-prev",
        },
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 10
            },
            391: {
                slidesPerView: 1.2,
                spaceBetween: 10
            },
            500: {
                slidesPerView: 1.5,
                spaceBetween: 15
            },
            640: {
                slidesPerView: 2.7,
                spaceBetween: 20
            },
            768: {
                slidesPerView: 3.3,
                spaceBetween: 20
            },
            1100: {
                slidesPerView: 3.5,
                spaceBetween: 25
            },
            1224: {
                slidesPerView: 4.2,
                spaceBetween: 30
            }
        }
    });

    new Swiper('.nav-oculto-swiper', {
        loop: true,
        spaceBetween: 10,
        pagination: {
            el: '.nav-oculto-swiper .swiper-pagination',
            clickable: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
    });
});

document.getElementById('checkout-btn')?.addEventListener('click', async () => {
    if (cart.length === 0) return;
    let message = 'Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n';
    let total = 0;
    const orderItems = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        message += `*${item.name}* (${item.quantity}x) - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
        return { productId: item.id, name: item.name, quantity: item.quantity, price: item.price };
    });
    message += `\n*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*`;
    try {
        await addDoc(collection(db, 'orders'), { userId: currentUser?.uid, items: orderItems, total, status: 'aberto', createdAt: serverTimestamp() });
    } catch (error) { console.error('Erro ao salvar pedido:', error); }
    const whatsappUrl = `https://api.whatsapp.com/send?phone=5511942138664&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    cart = [];
    renderCart();
    salvarDadosDoUsuario();
});

// --- LÓGICA DE INICIALIZAÇÃO E PÁGINAS ESPECÍFICAS ---
async function fetchData(collectionName, options = {}) {
    try {
        const { sortBy, sortDirection = 'desc', limitNumber, filterField, filterValue } = options;
        let q = collection(db, collectionName);
        if (filterField && filterValue !== undefined) q = query(q, where(filterField, "==", filterValue));
        if (sortBy) q = query(q, orderBy(sortBy, sortDirection));
        if (limitNumber) q = query(q, limit(limitNumber));
        const dataSnapshot = await getDocs(q);
        return dataSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Erro ao buscar ${collectionName}: `, error);
        return [];
    }
}

async function initProductSections() {
    const productSwiperConfig = { container: '.product-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".product-swiper .swiper-button-next", prevEl: ".product-swiper .swiper-button-prev" }, breakpoints: { 350: { slidesPerView: 1.4}, 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };
    const releasesSwiperConfig = { container: '.releases-swiper', options: { slidesPerView: 1, spaceBetween: 30, navigation: { nextEl: ".releases-swiper .swiper-button-next", prevEl: ".releases-swiper .swiper-button-prev" }, breakpoints: { 350: { slidesPerView: 1.4}, 640: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } } } };

    const [productsData, launchesData, selectedData] = await Promise.all([
        fetchData('products', { sortBy: 'sold', sortDirection: 'desc', limitNumber: 10 }),
        fetchData('products', { sortBy: 'createdAt', sortDirection: 'desc', limitNumber: 10 }),
        fetchData('products', { filterField: 'isSelected', filterValue: true })
    ]);

    allProducts = productsData;
    allLaunches = launchesData;
    allSelected = selectedData;

    if(document.getElementById('product-list')) renderCarousel('product-list', allProducts, productSwiperConfig);
    if(document.getElementById('releases-list')) renderCarousel('releases-list', allLaunches, releasesSwiperConfig);
    if(document.getElementById('selected-products-grid')) window.renderGrid('selected-products-grid', allSelected);
}

if (window.location.pathname.includes("produtos.html")) {
    const aplicarFiltros = (produtos, filtros) => {
        let filtrados = [...produtos];
        if (filtros.categorias.length > 0) filtrados = filtrados.filter(p => filtros.categorias.includes(p.category));
        if (filtros.mm.length > 0) filtrados = filtrados.filter(p => filtros.mm.some(val => p.name.toLowerCase().includes(val.toLowerCase())));
        if (filtros.cm.length > 0) filtrados = filtrados.filter(p => filtros.cm.some(val => p.name.toLowerCase().includes(val.toLowerCase())));
        if (filtros.busca) filtrados = filtrados.filter(p => p.name?.toLowerCase().includes(filtros.busca));
        window.renderGrid("produtos-grid", filtrados);
    };

    document.addEventListener("DOMContentLoaded", async () => {
        const params = new URLSearchParams(window.location.search);
        const filtros = {
            categorias: params.get("category") ? [params.get("category")] : [],
            mm: [],
            cm: [],
            busca: params.get("busca") ? decodeURIComponent(params.get("busca")).toLowerCase() : ""
        };

        const searchInput = document.getElementById('search-input-header');
        if (searchInput && filtros.busca) searchInput.value = filtros.busca;

        const todosOsProdutos = await fetchData('products', {});
        aplicarFiltros(todosOsProdutos, filtros);

        document.querySelectorAll(".filtro-categoria, .filtro-mm, .filtro-cm").forEach(input => {
            if (input.classList.contains('filtro-categoria') && filtros.categorias.includes(input.value)) input.checked = true;
            input.addEventListener("change", () => {
                filtros.categorias = Array.from(document.querySelectorAll(".filtro-categoria:checked")).map(i => i.value);
                filtros.mm = Array.from(document.querySelectorAll(".filtro-mm:checked")).map(i => i.value);
                filtros.cm = Array.from(document.querySelectorAll(".filtro-cm:checked")).map(i => i.value);
                aplicarFiltros(todosOsProdutos, filtros);
            });
        });
        if(searchInput) searchInput.addEventListener("input", e => {
            filtros.busca = e.target.value.toLowerCase();
            aplicarFiltros(todosOsProdutos, filtros);
        });
    });
}

// --- INICIALIZAÇÃO GERAL ---
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  await carregarCarrinhoEFavoritos();
  if (!window.location.pathname.includes("produtos.html")) {
    initProductSections();
  }
});

new Swiper(".benefits-swiper", {
        loop: true,
        autoplay: {
            delay: 2000,
            disableOnInteraction: false,
        },
        spaceBetween: 10,
        pagination: { el: ".benefits-swiper .swiper-pagination", clickable: true },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 30 }
        }
    });

new Swiper(".nav-oculto-swiper", {
        loop: true,
        spaceBetween: 10,
        pagination: {
            el: '.nav-oculto-swiper .swiper-pagination',
            clickable: true,
        },
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
    });

    // --- ABRIR E FECHAR FILTROS NO MOBILE ---
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-filtros-btn');
  const closeBtn = document.getElementById('close-filtros-btn');
  const sidebar = document.getElementById('filtros-sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }

  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll(".footer-toggle");

  toggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      const links = toggle.nextElementSibling;
      links.classList.toggle("expanded");
    });
  });
});

const searchFormHeader = document.getElementById('search-form-header');
  const searchInputHeader = document.getElementById('search-input-header');

  searchFormHeader.addEventListener('submit', (event) => {
    event.preventDefault();
    const searchTerm = searchInputHeader.value.trim();
    if (searchTerm) {
      window.location.href = `produtos.html?busca=${encodeURIComponent(searchTerm)}`;
    } else {
      window.location.href = 'produtos.html';
    }
  });

  const carousel = document.querySelector('#carouselExampleIndicators');
    let startX = 0;
    let endX = 0;

    carousel.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    });

    carousel.addEventListener('touchend', function(e) {
        endX = e.changedTouches[0].clientX;
        if (startX - endX > 50) {
        bootstrap.Carousel.getInstance(carousel).next();
        } else if (endX - startX > 50) {
        bootstrap.Carousel.getInstance(carousel).prev();
        }
    });

// --- CÓDIGO PARA O MENU DESKTOP (SUBMENU DE CATEGORIAS) ---
const desktopCategoryBtn = document.querySelector('.has-submenu > a');
const desktopSubmenu = document.querySelector('.submenu-desktop');

if (desktopCategoryBtn && desktopSubmenu) {
    desktopCategoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        desktopSubmenu.classList.toggle('active');
    });

    // Fecha o submenu quando clica fora dele
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.has-submenu')) {
            desktopSubmenu.classList.remove('active');
        }
    });
}