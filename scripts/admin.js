import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, query as firestoreQuery, where, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
    authDomain: "cremapratas-e70b9.firebaseapp.com",
    projectId: "cremapratas-e70b9",
    storageBucket: "cremapratas-e70b9.firebasestorage.app",
    messagingSenderId: "601950880055",
    appId: "1:601950880055:web:9660320d933ec2468adab2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- VARIÁVEIS GLOBAIS ---
let editingProductId = null;
let salesChartInstance = null;
let categoryChartInstance = null;

// --- ELEMENTOS DO DOM ---
const loginSection = document.getElementById('login-section');
const productForm = document.getElementById('product-form');
const logoutBtn = document.getElementById('logout-btn');
const submitBtn = document.getElementById('submit-btn');
const productsTableBody = document.getElementById('products-table-body');
const ordersTableBody = document.getElementById('orders-table-body');
const messageArea = document.getElementById('message-area');

// --- FUNÇÕES ---

function showMessage(msg, type) {
    if (!messageArea) return;
    messageArea.textContent = msg;
    messageArea.className = type;
    messageArea.classList.remove('hidden');
    setTimeout(() => messageArea.classList.add('hidden'), 4000);
}

function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(section => {
        if(section) section.classList.add('hidden');
    });
    const activeTab = document.getElementById(tab);
    if (activeTab) activeTab.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}

async function loadDashboard() {
    try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Cálculos dos Cards
        if(document.getElementById("total-products")) document.getElementById("total-products").textContent = products.length;
        if(document.getElementById("total-outofstock")) document.getElementById("total-outofstock").textContent = products.filter(p => (p.stock || 0) === 0).length;
        const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);
        if(document.getElementById("total-stock-value")) document.getElementById("total-stock-value").textContent = `R$ ${totalStockValue.toFixed(2).replace('.', ',')}`;
        const totalPotentialSales = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
        if(document.getElementById("total-stock-sales")) document.getElementById("total-stock-sales").textContent = `R$ ${totalPotentialSales.toFixed(2).replace('.', ',')}`;
        const totalPotentialProfit = totalPotentialSales - totalStockValue;
        if(document.getElementById("total-stock-profit")) document.getElementById("total-stock-profit").textContent = `R$ ${totalPotentialProfit.toFixed(2).replace('.', ',')}`;
        
        // --- GRÁFICO DE VENDAS (COM DADOS REAIS) ---
        const ordersQuery = firestoreQuery(collection(db, "orders"), where("status", "==", "finalizado"));
        const ordersSnapshot = await getDocs(ordersQuery);
        const finalizedOrders = ordersSnapshot.docs.map(doc => doc.data());

        const totalSoldValue = finalizedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const soldElement = document.getElementById("total-sold-value");
        if (soldElement) soldElement.textContent = `R$ ${totalSoldValue.toFixed(2).replace('.', ',')}`;


        const salesByDate = finalizedOrders.reduce((acc, order) => {
            if (order.createdAt?.toDate) {
                const date = order.createdAt.toDate().toLocaleDateString('pt-BR');
                acc[date] = (acc[date] || 0) + order.total;
            }
            return acc;
        }, {});

        const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
        const salesData = sortedDates.map(date => salesByDate[date]);

        if (salesChartInstance) salesChartInstance.destroy();
        const salesCtx = document.getElementById('sales-chart')?.getContext('2d');
        if (salesCtx) {
            salesChartInstance = new Chart(salesCtx, {
                type: 'line',
                data: { 
                    labels: sortedDates, 
                    datasets: [{ 
                        label: 'Vendas Finalizadas (R$)', 
                        data: salesData, 
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        fill: true,
                    }] 
                },
            });
        }

        // --- GRÁFICO DE PIZZA (VENDAS POR CATEGORIA) ---
        const productCategoryMap = new Map(products.map(p => [p.id, p.category]));
        const salesByCategory = finalizedOrders.reduce((acc, order) => {
            order.items.forEach(item => {
                const category = productCategoryMap.get(item.productId);
                if (category) {
                    acc[category] = (acc[category] || 0) + item.quantity;
                }
            });
            return acc;
        }, {});

        if (categoryChartInstance) categoryChartInstance.destroy();
        const categoryCtx = document.getElementById('category-chart')?.getContext('2d');
        if (categoryCtx) {
            categoryChartInstance = new Chart(categoryCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(salesByCategory),
                    datasets: [{ 
                        label: 'Itens Vendidos',
                        data: Object.values(salesByCategory), 
                        backgroundColor: ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2', '#f012be', '#fd7e14'] 
                    }]
                },
                options: {
                    plugins: {
                        title: { display: true, text: 'Itens Vendidos por Categoria' }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        showMessage('Erro ao carregar resumo do painel.', 'error');
    }
}

async function loadProducts() {
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "products"));
        productsTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${product.name}</td>
                <td>R$ ${product.price.toFixed(2).replace('.', ',')}</td>
                <td>${product.stock || 0}</td>
                <td>
                    <button class="btn btn-primary edit-btn" data-id="${id}">Editar</button>
                    <button class="btn btn-danger delete-btn" data-id="${id}">Excluir</button>
                </td>
            `;
            productsTableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        productsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar produtos.</td></tr>';
    }
}

async function loadOrders() {
    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = '<tr><td colspan="5">Carregando pedidos...</td></tr>';
    try {
        const q = firestoreQuery(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        ordersTableBody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement('tr');
            const date = order.createdAt?.toDate().toLocaleDateString('pt-BR') || 'N/A';
            const items = order.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');
            row.innerHTML = `
                <td>${date}</td>
                <td>${items}</td>
                <td>R$ ${order.total.toFixed(2).replace('.', ',')}</td>
                <td><span class="status status-${order.status}">${order.status}</span></td>
                <td>
                    ${order.status === 'aberto' ? `<button class="btn btn-primary edit-order-btn" data-id="${id}">Editar</button><button class="btn btn-success finalize-btn" data-id="${id}">Finalizar</button>` : ''}
                    <button class="btn btn-danger delete-order-btn" data-id="${id}">Excluir</button>
                </td>
            `;
            ordersTableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Erro ao carregar pedidos:", err);
        ordersTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar pedidos.</td></tr>';
    }
}

async function openEditOrderModal(orderId) {
    const modal = document.getElementById("edit-order-modal");
    const itemsContainer = document.getElementById("edit-order-items");
    const totalInput = document.getElementById("edit-order-total");

    try {
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return showMessage("Pedido não encontrado.", "error");

        const order = orderSnap.data();
        modal.classList.remove("hidden");
        modal.dataset.orderId = orderId;
        totalInput.value = order.total?.toFixed(2) || 0;

        itemsContainer.innerHTML = '';
        order.items.forEach((item, index) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'form-group';
            itemRow.innerHTML = `
                <label>${item.name}</label>
                <input type="number" min="0" value="${item.quantity}" data-index="${index}" class="edit-order-quantity">
            `;
            itemsContainer.appendChild(itemRow);
        });
    } catch (err) {
        console.error("Erro ao abrir modal de edição:", err);
        showMessage("Erro ao carregar pedido.", "error");
    }
}

async function saveEditedOrder() {
    const modal = document.getElementById("edit-order-modal");
    const orderId = modal.dataset.orderId;
    const newTotal = parseFloat(document.getElementById("edit-order-total").value);
    const quantityInputs = document.querySelectorAll(".edit-order-quantity");

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;

    const order = orderSnap.data();
    const updatedItems = order.items.map((item, i) => ({ ...item, quantity: parseInt(quantityInputs[i].value) }));

    try {
        await updateDoc(orderRef, { total: newTotal, items: updatedItems });
        showMessage("Pedido atualizado com sucesso!", "success");
        modal.classList.add("hidden");
        loadOrders();
    } catch (err) {
        console.error("Erro ao salvar pedido:", err);
        showMessage("Erro ao atualizar pedido.", "error");
    }
}

async function finalizeOrder(orderId) {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;

    const order = orderSnap.data();
    const batch = writeBatch(db);

    for (const item of order.items) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
            const data = productSnap.data();
            const newStock = Math.max((data.stock || 0) - item.quantity, 0);
            batch.update(productRef, { stock: newStock });
        }
    }
    batch.update(orderRef, { status: "finalizado" });

    try {
        await batch.commit();
        showMessage('Pedido finalizado com sucesso!', 'success');
        loadOrders();
        loadDashboard();
    } catch (err) {
        console.error("Erro ao finalizar pedido:", err);
        showMessage('Erro ao finalizar pedido.', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
        await deleteDoc(doc(db, "orders", orderId));
        showMessage("Pedido excluído com sucesso.", "success");
        loadOrders();
    } catch (error) {
        console.error("Erro ao excluir pedido:", error);
        showMessage("Erro ao excluir pedido.", "error");
    }
}

async function editProduct(productId) {
    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) return showMessage("Produto não encontrado.", "error");
        
        const data = productSnap.data();
        editingProductId = productId;
        document.getElementById("product-name").value = data.name || "";
        document.getElementById("product-cost").value = data.cost || 0;
        document.getElementById("product-price").value = data.price || 0;
        document.getElementById("product-old-price").value = data.oldPrice || 0;
        document.getElementById("product-stock").value = data.stock || 0;
        document.getElementById("product-category").value = data.category || "";
        document.getElementById("product-is-selected").checked = data.isSelected || false;
        if (data.gender) {
            document.querySelector(`input[name="gender"][value="${data.gender}"]`).checked = true;
        } else {
            document.querySelector(`input[name="gender"][value="unissex"]`).checked = true;
        }
        showTab('admin-panel');
        submitBtn.textContent = "Salvar Alterações";
        document.getElementById("product-image").required = false;
    } catch (err) {
        console.error("Erro ao carregar produto para edição:", err);
        showMessage("Erro ao carregar produto.", "error");
    }
}

async function deleteProduct(productId) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
        await deleteDoc(doc(db, "products", productId));
        showMessage("Produto excluído com sucesso.", "success");
        loadProducts();
        loadDashboard();
    } catch (error) {
        console.error("Erro ao excluir produto:", error);
        showMessage("Erro ao excluir produto.", "error");
    }
}

// --- EVENT LISTENERS ---

if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        try {
            const imageFile = document.getElementById('product-image').files[0];
            let imageUrl;
            const productData = {
                name: document.getElementById('product-name').value,
                cost: parseFloat(document.getElementById("product-cost").value),
                price: parseFloat(document.getElementById('product-price').value),
                oldPrice: parseFloat(document.getElementById('product-old-price').value) || 0,
                stock: parseInt(document.getElementById('product-stock').value),
                category: document.getElementById('product-category').value,
                isSelected: document.getElementById('product-is-selected').checked,
                gender: document.querySelector('input[name="gender"]:checked').value,
            };
            if (editingProductId) {
                const productRef = doc(db, "products", editingProductId);
                const productSnap = await getDoc(productRef);
                imageUrl = productSnap.data().image;
            }
            if (imageFile) {
                const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }
            if (!imageUrl && !editingProductId) throw new Error("A imagem do produto é obrigatória.");
            if (imageUrl) productData.image = imageUrl;

            if (editingProductId) {
                productData.updatedAt = serverTimestamp();
                const productRef = doc(db, "products", editingProductId);
                await updateDoc(productRef, productData);
                showMessage("Produto atualizado com sucesso!", "success");
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, "products"), productData);
                showMessage("Produto cadastrado com sucesso!", "success");
            }
            productForm.reset();
            document.querySelector('input[name="gender"][value="unissex"]').checked = true;
            editingProductId = null;
            loadProducts();
            loadDashboard();
            showTab('products-panel');
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            showMessage(`Erro: ${error.message}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Cadastrar Produto";
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.matches('.edit-btn')) editProduct(e.target.dataset.id);
    if (e.target.matches('.delete-btn')) deleteProduct(e.target.dataset.id);
    if (e.target.matches('.delete-order-btn')) deleteOrder(e.target.dataset.id);
    if (e.target.matches('.edit-order-btn')) openEditOrderModal(e.target.dataset.id);
    if (e.target.matches('.finalize-btn')) finalizeOrder(e.target.dataset.id);
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            showMessage(`Erro no login: ${error.message}`, 'error');
        }
    });
}

if (document.getElementById('save-edit-order')) {
    document.getElementById('save-edit-order').addEventListener('click', saveEditedOrder);
}
if (document.getElementById('cancel-edit-order')) {
    document.getElementById('cancel-edit-order').addEventListener('click', () => {
        document.getElementById('edit-order-modal').classList.add('hidden');
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

// --- INICIALIZAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            if(loginSection) loginSection.classList.add('hidden');
            if(document.getElementById('admin-tabs')) document.getElementById('admin-tabs').classList.remove('hidden');
            
            showTab('dashboard');
            loadProducts();
            loadDashboard();
            loadOrders();
        } else {
            showMessage('Acesso negado. Você não é um administrador.', 'error');
            signOut(auth);
        }
    } else {
        if(loginSection) loginSection.classList.remove('hidden');
        if(document.getElementById('admin-tabs')) document.getElementById('admin-tabs').classList.add('hidden');
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    }
});
